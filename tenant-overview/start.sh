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

PORT=3101 npm --prefix "$ROOT/sgmy" run start:dev &
pids+=($!)
PORT=3102 npm --prefix "$ROOT/gxb" run start:dev &
pids+=($!)
PORT=3103 npm --prefix "$ROOT/gxs" run start:dev &
pids+=($!)
python3 -m http.server 3110 --bind 127.0.0.1 --directory "$ROOT/proxy" &
pids+=($!)

echo "SGMY      http://sgmy.localtest.me:3101/   admin  http://sgmy.localtest.me:3101/admin"
echo "GXB       http://gxb.localtest.me:3102/    admin  http://gxb.localtest.me:3102/admin"
echo "GXS       http://gxs.localtest.me:3103/    admin  http://gxs.localtest.me:3103/admin"
echo "overview  http://proxy.localtest.me:3110/"
echo "Ctrl+C to stop"

wait
