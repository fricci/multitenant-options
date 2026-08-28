#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")" && pwd)"
pids=()

cleanup() {
  for pid in "${pids[@]+"${pids[@]}"}"; do
    kill "$pid" 2>/dev/null || true
  done
}
trap cleanup EXIT INT TERM

ensure_deps() {
  local dir="$1"
  if [[ ! -d "$dir/node_modules" ]]; then
    (cd "$dir" && npm install)
  fi
}

ensure_deps "$ROOT/sgmy"
ensure_deps "$ROOT/gxb"
ensure_deps "$ROOT/gxs"

PORT=3001 npm --prefix "$ROOT/sgmy" run start:dev &
pids+=($!)
PORT=3002 npm --prefix "$ROOT/gxb" run start:dev &
pids+=($!)
PORT=3003 npm --prefix "$ROOT/gxs" run start:dev &
pids+=($!)
python3 -m http.server 3010 --bind 127.0.0.1 --directory "$ROOT/proxy" &
pids+=($!)

echo "SGMY   http://sgmy.localtest.me:3001/   admin  http://sgmy.localtest.me:3001/admin"
echo "GXB    http://gxb.localtest.me:3002/    admin  http://gxb.localtest.me:3002/admin"
echo "GXS    http://gxs.localtest.me:3003/    admin  http://gxs.localtest.me:3003/admin"
echo "hub    http://proxy.localtest.me:3010/"
echo "Ctrl+C to stop"

wait
