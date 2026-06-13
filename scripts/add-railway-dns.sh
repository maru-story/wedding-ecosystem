#!/usr/bin/env bash
set -euo pipefail

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

  echo "Checking for existing ${type} record for ${full_name}..."
  local existing
  existing=$(cf_api GET "${ZONE_URL}/dns_records?type=${type}&name=${full_name}")
  local count
  count=$(echo "$existing" | jq -r '.result | length')

  if [ "$count" -gt "0" ]; then
    local record_id
    record_id=$(echo "$existing" | jq -r '.result[0].id')
    echo "Updating existing record ${full_name} (ID: ${record_id})..."
    local result
    result=$(cf_api PUT "${ZONE_URL}/dns_records/${record_id}" "{
      \"type\": \"${type}\",
      \"name\": \"${name}\",
      \"content\": \"${content}\",
      \"ttl\": 300,
      \"proxied\": ${proxied},
      \"comment\": \"${comment}\"
    }")
    local success
    success=$(echo "$result" | jq -r '.success')
    if [ "$success" = "true" ]; then
      echo "✅ Successfully updated: ${full_name} → ${content}"
    else
      echo "❌ Failed to update ${full_name}"
      echo "$result" | jq '.errors'
      return 1
    fi
  else
    echo "Creating new ${type} record for ${full_name}..."
    local result
    result=$(cf_api POST "${ZONE_URL}/dns_records" "{
      \"type\": \"${type}\",
      \"name\": \"${name}\",
      \"content\": \"${content}\",
      \"ttl\": 300,
      \"proxied\": ${proxied},
      \"comment\": \"${comment}\"
    }")
    local success
    success=$(echo "$result" | jq -r '.success')
    if [ "$success" = "true" ]; then
      echo "✅ Successfully created: ${full_name} → ${content}"
    else
      echo "❌ Failed to create ${full_name}"
      echo "$result" | jq '.errors'
      return 1
    fi
  fi
}

echo "=== Updating Railway DNS Records for ${DOMAIN} ==="

# 1. Update API CNAME record to point to 9hespqvi.up.railway.app
create_or_update_record "api" "CNAME" "9hespqvi.up.railway.app" "true" "Railway production API gateway"

# 2. Update WS CNAME record to point to 9hespqvi.up.railway.app
create_or_update_record "ws" "CNAME" "9hespqvi.up.railway.app" "true" "Railway production WS gateway"

# 3. Create TXT verification record for _railway-verify.api
create_or_update_record "_railway-verify.api" "TXT" "railway-verify=efbd5924681406b39fcfc3b5b98d7a226888d4b75ada533fe3a64c778c73ee1f" "false" "Railway domain verification code"

echo "=== DNS Update Complete! ==="
