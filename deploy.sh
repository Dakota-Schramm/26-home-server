#!/usr/bin/env bash
set -euo pipefail

# --- Configuration ---
# Override these via environment variables, or edit the defaults below.
PI_HOST="${PI_HOST:-pi@raspberrypi.local}"              # SSH user@host or IP of your Raspberry Pi
PI_REPO_PATH="${PI_REPO_PATH:-/home/pi/26-home-server}" # Absolute path to this repo on the Pi

echo "==> Connecting to $PI_HOST"

ssh "$PI_HOST" bash -s <<EOF
set -euo pipefail
cd "$PI_REPO_PATH"

echo "==> Pulling latest code (git pull origin main)"
git pull origin main

echo "==> Pruning dangling images and build cache to free disk space before building"
docker image prune -f
docker builder prune -f

echo "==> Building Docker images (docker compose build)"
docker compose build

echo "==> Starting containers (docker compose up -d)"
docker compose up -d

echo "==> Pruning dangling images to reclaim disk space"
docker image prune -f
EOF

echo "==> Deploy complete."
