#!/usr/bin/env bash
# Automatically spin up Cloudflare quick tunnels, update environment variables, and start dev server
set -euo pipefail

# Clean up stale processes
echo "🧹 Cleaning up previous server and tunnel processes..."
killall cloudflared 2>/dev/null || true

# Function to start a tunnel and extract its URL
start_tunnel() {
  local port=$1
  local log_file="/tmp/cloudflared_port_${port}.log"
  rm -f "$log_file"
  
  echo "📡 Starting cloudflared tunnel on port ${port}..." >&2
  nohup cloudflared tunnel --url "http://localhost:${port}" > "$log_file" 2>&1 &
  local pid=$!
  
  # Wait for the URL to appear in the logs (up to 25 seconds)
  local url=""
  for i in {1..25}; do
    sleep 1
    if [ -f "$log_file" ]; then
      url=$(grep -oE 'https://[a-zA-Z0-9.-]+\.trycloudflare\.com' "$log_file" | head -n 1 || true)
      if [ -n "$url" ]; then
        break
      fi
    fi
  done
  
  if [ -z "$url" ]; then
    echo "❌ Failed to obtain tunnel URL for port ${port}." >&2
    echo "Logs:" >&2
    tail -n 15 "$log_file" >&2
    kill "$pid" 2>/dev/null || true
    return 1
  fi
  
  echo "$url"
}

# Start all three tunnels
DASHBOARD_URL=$(start_tunnel 3000)
echo "✅ Dashboard: ${DASHBOARD_URL}"

INVITATION_URL=$(start_tunnel 3001)
echo "✅ Invitation: ${INVITATION_URL}"

SCANNER_URL=$(start_tunnel 3002)
echo "✅ Scanner: ${SCANNER_URL}"

# Update .env.local file
ENV_FILE=".env.local"
if [ ! -f "$ENV_FILE" ]; then
  echo "❌ Error: ${ENV_FILE} not found." >&2
  exit 1
fi

echo "✏️  Updating ${ENV_FILE} with new tunnel origins..."
sed -i -E "s|DASHBOARD_ORIGIN=.*|DASHBOARD_ORIGIN=${DASHBOARD_URL}|" "$ENV_FILE"
sed -i -E "s|INVITATION_ORIGIN=.*|INVITATION_ORIGIN=${INVITATION_URL}|" "$ENV_FILE"
sed -i -E "s|SCANNER_ORIGIN=.*|SCANNER_ORIGIN=${SCANNER_URL}|" "$ENV_FILE"

echo "🚀 Starting development servers via Turborepo..."
npm run dev
