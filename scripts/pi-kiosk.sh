#!/bin/bash
# Opens Chromium fullscreen once the local kiosk API is up.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
URL="http://127.0.0.1:4173"

for _ in $(seq 1 40); do
  if curl -sf "$URL/api/health" >/dev/null 2>&1; then
    break
  fi
  sleep 1
done

CHROMIUM="$(command -v chromium || command -v chromium-browser || true)"
if [ -z "$CHROMIUM" ]; then
  echo "Chromium not found. Run: sudo apt install -y chromium"
  exit 1
fi

exec "$CHROMIUM" \
  --kiosk \
  --app="$URL" \
  --noerrdialogs \
  --disable-infobars \
  --disable-session-crashed-bubble \
  --check-for-update-interval=31536000 \
  --password-store=basic \
  "$URL"
