#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
LOG_DIR="$ROOT/.dev-logs"

if [[ -x "$ROOT/.node/bin/node" ]]; then
  NODE_BIN="$ROOT/.node/bin/node"
elif [[ -x "$ROOT/../.node/bin/node" ]]; then
  NODE_BIN="$ROOT/../.node/bin/node"
else
  NODE_BIN="$(command -v node || true)"
fi

if [[ -z "$NODE_BIN" ]]; then
  echo "Node.js not found. Ensure it is installed and available."
  exit 1
fi

mkdir -p "$LOG_DIR"

if lsof -n -iTCP:8080 -sTCP:LISTEN >/dev/null 2>&1; then
  echo "Port 8080 is already in use. Run scripts/dev-stop.sh or free the port."
  exit 1
fi

if lsof -n -iTCP:3100 -sTCP:LISTEN >/dev/null 2>&1; then
  echo "Port 3100 is already in use. Run scripts/dev-stop.sh or free the port."
  exit 1
fi

nohup /bin/zsh -lc "cd \"$ROOT\"; \"$NODE_BIN\" --import tsx packages/mcap-file-server/src/index.ts" \
  > "$LOG_DIR/mcap-file-server.log" 2>&1 &
echo $! > "$LOG_DIR/mcap-file-server.pid"

nohup /bin/zsh -lc "cd \"$ROOT\"; \"$NODE_BIN\" ./node_modules/.bin/webpack serve --mode development --progress --config web/webpack.config.ts" \
  > "$LOG_DIR/web-dev-server.log" 2>&1 &
echo $! > "$LOG_DIR/web-dev-server.pid"

echo "Started."
echo "MCAP server log: $LOG_DIR/mcap-file-server.log"
echo "Web dev server log: $LOG_DIR/web-dev-server.log"
