#!/usr/bin/env bash
# =============================================================================
# Automated Render Web Service Provisioner & Configurator
# =============================================================================
# Usage:
#   RENDER_API_KEY="rnd_xxx" ./scripts/setup-render.sh
# =============================================================================

set -euo pipefail

RENDER_API_KEY="${RENDER_API_KEY:-}"

if [ -z "$RENDER_API_KEY" ] && [ -f .env.local ]; then
  RENDER_API_KEY=$(grep -E '^RENDER_API_KEY=' .env.local | cut -d'=' -f2- | tr -d "'\"" || true)
fi

if [ -z "$RENDER_API_KEY" ]; then
  echo "❌ Error: RENDER_API_KEY must be set in environment or .env.local" >&2
  exit 1
fi
API_BASE="https://api.render.com/v1"
SERVICE_NAME="${SERVICE_NAME:-wedding-ecosystem-api}"
REPO_URL="https://github.com/maru-story/wedding-ecosystem"
BRANCH="${BRANCH:-main}"
CUSTOM_DOMAIN="${CUSTOM_DOMAIN:-api.maruplanner.my.id}"

echo "============================================="
echo " Render Service Provisioner & Configurator"
echo "============================================="

# 1. Verify API Key and get Owner ID
echo "🔍 Checking Render workspace..."
OWNERS_RES=$(curl -s -H "Authorization: Bearer ${RENDER_API_KEY}" "${API_BASE}/owners")

OWNER_ID=$(echo "$OWNERS_RES" | jq -r '.[0].owner.id // empty')
OWNER_NAME=$(echo "$OWNERS_RES" | jq -r '.[0].owner.name // empty')

if [ -z "$OWNER_ID" ]; then
  echo "❌ Error: Failed to fetch owner ID with provided Render API key."
  echo "Response: $OWNERS_RES"
  exit 1
fi

echo "✅ Connected to Render Workspace: ${OWNER_NAME} (${OWNER_ID})"

# 2. Check if service already exists
echo "🔍 Checking if service '${SERVICE_NAME}' exists..."
SERVICES_RES=$(curl -s -H "Authorization: Bearer ${RENDER_API_KEY}" "${API_BASE}/services?name=${SERVICE_NAME}")
SERVICE_ID=$(echo "$SERVICES_RES" | jq -r '.[0].service.id // empty')

if [ -n "$SERVICE_ID" ]; then
  echo "✅ Service '${SERVICE_NAME}' found with ID: ${SERVICE_ID}"
else
  echo "🚀 Creating service '${SERVICE_NAME}' on Render..."
  CREATE_PAYLOAD=$(cat <<EOF
{
  "type": "web_service",
  "name": "${SERVICE_NAME}",
  "ownerId": "${OWNER_ID}",
  "repo": "${REPO_URL}",
  "autoDeploy": "yes",
  "branch": "${BRANCH}",
  "serviceDetails": {
    "env": "docker",
    "plan": "free",
    "region": "singapore",
    "healthCheckPath": "/health",
    "numInstances": 1,
    "envSpecificDetails": {
      "dockerfilePath": "./Dockerfile",
      "dockerContext": "."
    }
  }
}
EOF
)

  CREATE_RES=$(curl -s -X POST "${API_BASE}/services" \
    -H "Authorization: Bearer ${RENDER_API_KEY}" \
    -H "Content-Type: application/json" \
    -d "$CREATE_PAYLOAD")

  SERVICE_ID=$(echo "$CREATE_RES" | jq -r '.service.id // .id // empty')
  
  if [ -z "$SERVICE_ID" ]; then
    echo "⚠️ Render API returned:"
    echo "$CREATE_RES" | jq '.' 2>/dev/null || echo "$CREATE_RES"
    
    if echo "$CREATE_RES" | grep -q "Payment information is required"; then
      echo ""
      echo "👉 CATATAN: Render membutuhkan penambahan kartu pembayaran (bebas biaya $0) untuk verifikasi anti-abuse."
      echo "   Silakan tambahkan kartu di: https://dashboard.render.com/billing"
      echo "   Setelah itu, jalankan kembali script ini."
    fi
    exit 1
  fi
  echo "✅ Successfully created service: ${SERVICE_ID}"
fi

# 3. Read env vars from .env.local and prepare JSON payload
echo "⚙️ Preparing environment variables..."

TARGET_ENV_FILE=".env.local"
if [ -f .env.production ]; then
  TARGET_ENV_FILE=".env.production"
elif [ ! -f .env.local ]; then
  echo "❌ Error: Neither .env.production nor .env.local found."
  exit 1
fi
echo "📁 Sourcing environment variables from: ${TARGET_ENV_FILE}"

get_env() {
  local key="$1"
  grep -E "^${key}=" "${TARGET_ENV_FILE}" | cut -d'=' -f2- | tr -d "'\"" || true
}

DATABASE_URL=$(get_env "DATABASE_URL")
DATABASE_POOLED_URL=$(get_env "DATABASE_POOLED_URL")
if [ -z "$DATABASE_POOLED_URL" ]; then
  DATABASE_POOLED_URL="$DATABASE_URL"
fi
UPSTASH_REDIS_CACHE_URL=$(get_env "UPSTASH_REDIS_CACHE_URL")
JWT_SECRET=$(get_env "JWT_SECRET")
REFRESH_SECRET=$(get_env "REFRESH_SECRET")
ENCRYPTION_KEY=$(get_env "ENCRYPTION_KEY_AES256")
if [ -z "$ENCRYPTION_KEY" ]; then
  ENCRYPTION_KEY=$(get_env "AES_ENCRYPTION_KEY")
fi
R2_ACCOUNT_ID=$(get_env "R2_ACCOUNT_ID")
R2_ACCESS_KEY_ID=$(get_env "R2_ACCESS_KEY_ID")
R2_SECRET_ACCESS_KEY=$(get_env "R2_SECRET_ACCESS_KEY")
R2_BUCKET_NAME=$(get_env "R2_BUCKET_NAME")
if [ -z "$R2_BUCKET_NAME" ]; then R2_BUCKET_NAME="wedding-ecosystem"; fi
R2_PUBLIC_URL=$(get_env "R2_PUBLIC_URL")
if [ -z "$R2_PUBLIC_URL" ]; then R2_PUBLIC_URL="https://cdn.maruplanner.my.id"; fi

DASHBOARD_ORIGIN="https://dashboard.maruplanner.my.id"
INVITATION_ORIGIN="https://maruplanner.my.id"
SCANNER_ORIGIN="https://scanner.maruplanner.my.id"

ENV_VARS_JSON=$(jq -n \
  --arg node_env "production" \
  --arg port "4000" \
  --arg db_url "$DATABASE_URL" \
  --arg db_pooled_url "$DATABASE_POOLED_URL" \
  --arg redis_url "$UPSTASH_REDIS_CACHE_URL" \
  --arg jwt "$JWT_SECRET" \
  --arg refresh "$REFRESH_SECRET" \
  --arg aes "$ENCRYPTION_KEY" \
  --arg dash "$DASHBOARD_ORIGIN" \
  --arg invit "$INVITATION_ORIGIN" \
  --arg scan "$SCANNER_ORIGIN" \
  --arg r2_acc "$R2_ACCOUNT_ID" \
  --arg r2_key "$R2_ACCESS_KEY_ID" \
  --arg r2_sec "$R2_SECRET_ACCESS_KEY" \
  --arg r2_bkt "$R2_BUCKET_NAME" \
  --arg r2_url "$R2_PUBLIC_URL" \
  '[
    {"key": "NODE_ENV", "value": $node_env},
    {"key": "PORT", "value": $port},
    {"key": "DATABASE_URL", "value": $db_url},
    {"key": "DATABASE_POOLED_URL", "value": $db_pooled_url},
    {"key": "UPSTASH_REDIS_CACHE_URL", "value": $redis_url},
    {"key": "JWT_SECRET", "value": $jwt},
    {"key": "REFRESH_SECRET", "value": $refresh},
    {"key": "AES_ENCRYPTION_KEY", "value": $aes},
    {"key": "ENCRYPTION_KEY_AES256", "value": $aes},
    {"key": "DASHBOARD_ORIGIN", "value": $dash},
    {"key": "INVITATION_ORIGIN", "value": $invit},
    {"key": "SCANNER_ORIGIN", "value": $scan},
    {"key": "R2_ACCOUNT_ID", "value": $r2_acc},
    {"key": "R2_ACCESS_KEY_ID", "value": $r2_key},
    {"key": "R2_SECRET_ACCESS_KEY", "value": $r2_sec},
    {"key": "R2_BUCKET_NAME", "value": $r2_bkt},
    {"key": "R2_PUBLIC_URL", "value": $r2_url}
  ]')

echo "🚀 Syncing environment variables to Render service ${SERVICE_ID}..."
SYNC_RES=$(curl -s -X PUT "${API_BASE}/services/${SERVICE_ID}/env-vars" \
  -H "Authorization: Bearer ${RENDER_API_KEY}" \
  -H "Content-Type: application/json" \
  -d "$ENV_VARS_JSON")

echo "✅ Environment variables successfully configured on Render!"

# 4. Add custom domain
echo "🌐 Adding custom domain '${CUSTOM_DOMAIN}'..."
DOMAIN_RES=$(curl -s -X POST "${API_BASE}/services/${SERVICE_ID}/custom-domains" \
  -H "Authorization: Bearer ${RENDER_API_KEY}" \
  -H "Content-Type: application/json" \
  -d "{\"name\": \"${CUSTOM_DOMAIN}\"}") || true

echo "Status custom domain: $(echo "$DOMAIN_RES" | jq -r '.verificationStatus // .message // "added"')"

# 5. Trigger deployment
echo "🚀 Triggering manual build & deployment on Render..."
DEPLOY_RES=$(curl -s -X POST "${API_BASE}/services/${SERVICE_ID}/deploys" \
  -H "Authorization: Bearer ${RENDER_API_KEY}" \
  -H "Content-Type: application/json" \
  -d '{"clearCache": "clear"}')

DEPLOY_ID=$(echo "$DEPLOY_RES" | jq -r '.id // "started"')
echo "✅ Deployment initiated with ID: ${DEPLOY_ID}"

SERVICE_DETAILS=$(curl -s -H "Authorization: Bearer ${RENDER_API_KEY}" "${API_BASE}/services/${SERVICE_ID}")
SERVICE_URL=$(echo "$SERVICE_DETAILS" | jq -r '.serviceDetails.url // .url // empty')

echo ""
echo "============================================="
echo " 🎉 Render Service Setup Complete!"
echo " Service ID:  ${SERVICE_ID}"
echo " Service URL: ${SERVICE_URL}"
echo "============================================="
echo "Langkah selanjutnya:"
echo "1. Tunggu build selesai di Render Dashboard: https://dashboard.render.com"
echo "2. Arahkan DNS Cloudflare: ./scripts/update-render-dns.sh ${SERVICE_URL}"
echo "============================================="
