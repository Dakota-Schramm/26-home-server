#!/usr/bin/env bash
set -euo pipefail

# --- Configuration ---
# Override these via environment variables, or edit the defaults below.
PI_HOST="${PI_HOST:-pi@raspberrypi.local}"              # SSH user@host or IP of your Raspberry Pi
PI_REPO_PATH="${PI_REPO_PATH:-/home/pi/26-home-server}" # Absolute path to this repo on the Pi

echo "Deploying to $PI_HOST:$PI_REPO_PATH ..."

ssh "$PI_HOST" bash -s <<EOF
set -euo pipefail
cd "$PI_REPO_PATH"
git pull origin main
docker compose up -d --build
EOF

echo "Deploy complete."
