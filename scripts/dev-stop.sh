#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
LOG_DIR="$ROOT/.dev-logs"

stop_pid() {
  local pid_file="$1"
  if [[ -f "$pid_file" ]]; then
    local pid
    pid="$(cat "$pid_file")"
    if kill -0 "$pid" >/dev/null 2>&1; then
      kill "$pid" || true
    fi
    rm -f "$pid_file"
  fi
}

stop_pid "$LOG_DIR/mcap-file-server.pid"
stop_pid "$LOG_DIR/web-dev-server.pid"

for port in 3100 8080; do
  pids="$(lsof -t -iTCP:${port} -sTCP:LISTEN || true)"
  if [[ -n "$pids" ]]; then
    kill $pids || true
  fi
done

echo "Stopped."
