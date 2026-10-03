#!/usr/bin/env bash
# =============================================================================
# Update Cloudflare DNS Records to point to Render
# =============================================================================
# Usage:
#   ./scripts/update-render-dns.sh <render-service-url>
# Example:
#   ./scripts/update-render-dns.sh wedding-ecosystem-api.onrender.com
# =============================================================================

set -euo pipefail

RENDER_HOST="${1:-}"

if [ -z "$RENDER_HOST" ]; then
  echo "Usage: $0 <render-hostname>" >&2
  echo "Example: $0 wedding-ecosystem-api.onrender.com" >&2
  exit 1
fi

# Clean protocol and trailing slashes if present
RENDER_HOST=$(echo "$RENDER_HOST" | sed -e 's|^https://||' -e 's|^http://||' -e 's|/.*$||')

CLOUDFLARE_API_TOKEN="${CLOUDFLARE_API_TOKEN:-}"
CLOUDFLARE_ZONE_ID="${CLOUDFLARE_ZONE_ID:-}"
DOMAIN="${DOMAIN:-maruplanner.my.id}"

if [ -z "$CLOUDFLARE_API_TOKEN" ] || [ -z "$CLOUDFLARE_ZONE_ID" ]; then
  if [ -f .env.local ]; then
    CLOUDFLARE_API_TOKEN=$(grep -E '^CLOUDFLARE_API_TOKEN=' .env.local | cut -d'=' -f2- | tr -d "'\"" || true)
    CLOUDFLARE_ZONE_ID=$(grep -E '^CLOUDFLARE_ZONE_ID=' .env.local | cut -d'=' -f2- | tr -d "'\"" || true)
  fi
fi

if [ -z "$CLOUDFLARE_API_TOKEN" ] || [ -z "$CLOUDFLARE_ZONE_ID" ]; then
  echo "Error: CLOUDFLARE_API_TOKEN and CLOUDFLARE_ZONE_ID must be set in environment or .env.local" >&2
  exit 1
fi

API_BASE="https://api.cloudflare.com/client/v4"
ZONE_URL="${API_BASE}/zones/${CLOUDFLARE_ZONE_ID}"

cf_api() {
  local method="$1"
  local endpoint="$2"
  local data="${3:-}"

  if [ -n "$data" ]; then
    curl -s -X "$method" \
      "${endpoint}" \
      -H "Authorization: Bearer ${CLOUDFLARE_API_TOKEN}" \
      -H "Content-Type: application/json" \
      -d "$data"
  else
    curl -s -X "$method" \
      "${endpoint}" \
      -H "Authorization: Bearer ${CLOUDFLARE_API_TOKEN}" \
      -H "Content-Type: application/json"
  fi
}

create_or_update_record() {
  local name="$1"
  local type="$2"
  local content="$3"
  local proxied="$4"
  local comment="$5"

  local full_name
  if [ "$name" = "@" ]; then
    full_name="${DOMAIN}"
  else
    full_name="${name}.${DOMAIN}"
  fi

  echo "Checking for existing records for ${full_name}..."
  local existing
  existing=$(cf_api GET "${ZONE_URL}/dns_records?name=${full_name}")
  local count
  count=$(echo "$existing" | jq -r '.result | length')

  if [ "$count" -gt "0" ]; then
    for row in $(echo "$existing" | jq -r '.result[] | @base64'); do
      local record_id=$(echo "$row" | base64 --decode | jq -r '.id')
      local record_type=$(echo "$row" | base64 --decode | jq -r '.type')
      if [ "$record_type" != "$type" ]; then
        echo "Removing conflicting ${record_type} record (ID: ${record_id})..."
        cf_api DELETE "${ZONE_URL}/dns_records/${record_id}" > /dev/null
      fi
    done
  fi

  local cname_existing=$(cf_api GET "${ZONE_URL}/dns_records?type=${type}&name=${full_name}")
  local cname_count=$(echo "$cname_existing" | jq -r '.result | length')

  if [ "$cname_count" -gt "0" ]; then
    local record_id=$(echo "$cname_existing" | jq -r '.result[0].id')
    echo "Updating existing ${type} record ${full_name} (ID: ${record_id})..."
    local result=$(cf_api PUT "${ZONE_URL}/dns_records/${record_id}" "{
      \"type\": \"${type}\",
      \"name\": \"${name}\",
      \"content\": \"${content}\",
      \"ttl\": 300,
      \"proxied\": ${proxied},
      \"comment\": \"${comment}\"
    }")
    local success=$(echo "$result" | jq -r '.success')
    if [ "$success" = "true" ]; then
      echo "✅ Successfully updated: ${full_name} → ${content}"
    else
      echo "❌ Failed to update ${full_name}"
      echo "$result" | jq '.errors'
      return 1
    fi
  else
    echo "Creating new ${type} record for ${full_name}..."
    local result=$(cf_api POST "${ZONE_URL}/dns_records" "{
      \"type\": \"${type}\",
      \"name\": \"${name}\",
      \"content\": \"${content}\",
      \"ttl\": 300,
      \"proxied\": ${proxied},
      \"comment\": \"${comment}\"
    }")
    local success=$(echo "$result" | jq -r '.success')
    if [ "$success" = "true" ]; then
      echo "✅ Successfully created: ${full_name} → ${content}"
    else
      echo "❌ Failed to create ${full_name}"
      echo "$result" | jq '.errors'
      return 1
    fi
  fi
}

echo "=== Updating Cloudflare DNS Records for Render (${DOMAIN}) ==="

# 1. Update API CNAME record to point to Render
create_or_update_record "api" "CNAME" "${RENDER_HOST}" "true" "Render production API gateway"

# 2. Update WS CNAME record to point to Render
create_or_update_record "ws" "CNAME" "${RENDER_HOST}" "true" "Render production WS gateway"

echo "=== DNS Update Complete! ==="
