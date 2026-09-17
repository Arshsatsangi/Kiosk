#!/bin/bash
# One-shot Raspberry Pi 4 installer: Node server (frontend+API) + kiosk autostart.
set -euo pipefail

if [ "$(id -u)" -eq 0 ]; then
  echo "Pi ke normal user se chalao (pi / jo login hai) — sudo password maange to daal dena."
  echo "Example: bash scripts/pi-setup.sh"
  exit 1
fi

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
USER_NAME="$(id -un)"
HOME_DIR="$(eval echo "~$USER_NAME")"
NODE_MAJOR=0

echo "==> AarogyaVaani MediKiosk · Raspberry Pi setup"
echo "    folder: $ROOT"
echo "    user:   $USER_NAME"

export DEBIAN_FRONTEND=noninteractive
sudo apt-get update -y
sudo apt-get install -y git curl ca-certificates chromium unclutter fonts-noto-core fonts-noto-ui-core || \
  sudo apt-get install -y git curl ca-certificates chromium-browser unclutter fonts-noto-core || \
  sudo apt-get install -y git curl ca-certificates chromium unclutter

if command -v node >/dev/null 2>&1; then
  NODE_MAJOR="$(node -v | sed 's/v//' | cut -d. -f1)"
fi
if [ "$NODE_MAJOR" -lt 18 ]; then
  echo "==> Installing Node.js 20"
  curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
  sudo apt-get install -y nodejs
fi
echo "    node $(node -v)"

mkdir -p "$ROOT/data"
if [ ! -f "$ROOT/.env" ]; then
  cat > "$ROOT/.env" <<'EOF'
# Optional AI keys — add later if DocBot/AyurVaani live chat is needed
# OPENROUTER_API_KEY=
# NVIDIA_API_KEY=
# OPENAI_API_KEY=
PORT=4173
EOF
  echo "==> Created $ROOT/.env (keys optional for kiosk demo)"
fi

sudo tee /etc/systemd/system/aarogyavaani.service >/dev/null <<EOF
[Unit]
Description=AarogyaVaani MediKiosk (frontend + API)
After=network.target

[Service]
Type=simple
User=$USER_NAME
WorkingDirectory=$ROOT
Environment=PORT=4173
Environment=NODE_ENV=production
EnvironmentFile=-$ROOT/.env
ExecStart=$(command -v node) $ROOT/server.mjs
Restart=always
RestartSec=3

[Install]
WantedBy=multi-user.target
EOF

sudo systemctl daemon-reload
sudo systemctl enable aarogyavaani.service
sudo systemctl restart aarogyavaani.service

mkdir -p "$HOME_DIR/.config/autostart"
cat > "$HOME_DIR/.config/autostart/aarogyavaani-kiosk.desktop" <<EOF
[Desktop Entry]
Type=Application
Name=AarogyaVaani Kiosk
Comment=Fullscreen MediKiosk
Exec=/bin/bash $ROOT/scripts/pi-kiosk.sh
X-GNOME-Autostart-enabled=true
Terminal=false
EOF

sleep 2
if curl -sf http://127.0.0.1:4173/api/health >/dev/null; then
  echo "==> Server OK on http://127.0.0.1:4173"
else
  echo "==> Server starting… check: sudo journalctl -u aarogyavaani -n 40"
fi

IP="$(hostname -I 2>/dev/null | awk '{print $1}')"
echo
echo "=============================================="
echo "  Ready. HDMI screen laga ke Pi REBOOT karo."
echo "  Local:  http://127.0.0.1:4173"
echo "  Phone:  http://${IP:-<pi-ip>}:4173"
echo "=============================================="
echo "Reboot:  sudo reboot"
echo "Logs:    sudo journalctl -u aarogyavaani -f"
echo "Stop:    sudo systemctl stop aarogyavaani"
