#!/usr/bin/env bash
set -euo pipefail

# --- Configuration ---
# Override these via environment variables, or edit the defaults below.
PI_HOST="${PI_HOST:-pi@raspberrypi.local}"              # SSH user@host or IP of your Raspberry Pi
PI_REPO_PATH="${PI_REPO_PATH:-/home/pi/26-home-server}" # Absolute path to this repo on the Pi

IMAGES="26-home-server-mailer 26-home-server-scraper"

step_time() {
  echo "    (${1}: $(( $(date +%s) - STEP_START ))s)"
}

echo "==> Checking local repo is committed and pushed"
if [ -n "$(git status --porcelain)" ]; then
  echo "error: uncommitted changes present. Commit or stash before deploying." >&2
  exit 1
fi
git fetch origin main
if [ "$(git rev-parse HEAD)" != "$(git rev-parse origin/main)" ]; then
  echo "error: local HEAD does not match origin/main. Push your changes before deploying." >&2
  exit 1
fi

echo "==> Building Docker images locally (docker compose build)"
STEP_START=$(date +%s)
docker compose build
step_time build

echo "==> Sending images to $PI_HOST"
STEP_START=$(date +%s)
IMG_SIZE=$(docker image inspect $IMAGES --format='{{.Size}}' | awk '{s+=$1} END {print s}')
echo "    ~$(( IMG_SIZE / 1024 / 1024 ))MB uncompressed (smaller after gzip)"

if command -v pv >/dev/null 2>&1; then
  docker save $IMAGES | pv -s "$IMG_SIZE" | gzip | ssh "$PI_HOST" 'gunzip | docker load'
else
  echo "    (tip: 'brew install pv' shows a live progress bar here instead of a heartbeat)"
  (docker save $IMAGES | gzip | ssh "$PI_HOST" 'gunzip | docker load') &
  XFER_PID=$!
  while kill -0 "$XFER_PID" 2>/dev/null; do
    sleep 5
    echo "    ...still transferring ($(( $(date +%s) - STEP_START ))s elapsed)"
  done
  wait "$XFER_PID"
fi
step_time transfer

echo "==> Connecting to $PI_HOST"
STEP_START=$(date +%s)

ssh "$PI_HOST" bash -s <<EOF
set -euo pipefail
cd "$PI_REPO_PATH"

echo "==> Pulling latest code (git pull origin main)"
git pull origin main

echo "==> Starting containers (docker compose up -d)"
docker compose up -d

echo "==> Pruning dangling images and stale build cache to reclaim disk space"
docker image prune -f
docker builder prune -f
EOF
step_time "remote apply"

echo "==> Deploy complete."
