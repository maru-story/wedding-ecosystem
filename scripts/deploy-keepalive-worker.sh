#!/usr/bin/env bash
# =============================================================================
# Automated Cloudflare Worker Keep-Alive Deployer
# =============================================================================
# Usage:
#   ./scripts/deploy-keepalive-worker.sh
# =============================================================================

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"

CLOUDFLARE_API_TOKEN="${CLOUDFLARE_API_TOKEN:-}"

if [ -z "$CLOUDFLARE_API_TOKEN" ] && [ -f "${ROOT_DIR}/.env.local" ]; then
  CLOUDFLARE_API_TOKEN=$(grep -E '^CLOUDFLARE_API_TOKEN=' "${ROOT_DIR}/.env.local" | cut -d'=' -f2- | tr -d "'\"" || true)
fi

if [ -z "$CLOUDFLARE_API_TOKEN" ]; then
  echo "❌ Error: CLOUDFLARE_API_TOKEN not found in environment or .env.local" >&2
  exit 1
fi

echo "============================================="
echo " Deploying Cloudflare Worker Keep-Alive Bot"
echo "============================================="

cd "${ROOT_DIR}/workers/keep-alive"
CLOUDFLARE_API_TOKEN="${CLOUDFLARE_API_TOKEN}" npx -y wrangler deploy

echo "✅ Worker successfully deployed with 10-minute Cron Trigger!"
