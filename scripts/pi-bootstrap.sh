#!/bin/bash
# Paste this on a Pi 4 (with internet). Clones the repo and runs setup.
set -euo pipefail

if [ "$(id -u)" -eq 0 ]; then
  echo "Root se mat chalao. Pi Desktop user se Terminal kholo."
  exit 1
fi

export DEBIAN_FRONTEND=noninteractive
sudo apt-get update -y
sudo apt-get install -y git curl

DEST="${HOME}/SIHround2"
REPO="https://github.com/Arshsatsangi/SIHround2.git"

if [ -d "$DEST/.git" ]; then
  git -C "$DEST" pull --ff-only || git -C "$DEST" pull
else
  git clone "$REPO" "$DEST"
fi

chmod +x "$DEST/scripts/"*.sh
bash "$DEST/scripts/pi-setup.sh"
