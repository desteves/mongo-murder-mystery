#!/usr/bin/env bash
# Builds the three production images and proves each one starts and answers, the way Cloud Run will run it.
# This catches what unit tests cannot: a startup dependency in devDependencies (MODULE_NOT_FOUND), a non-root
# user that cannot write its pid/cache files, a base-image change that refuses to bind. Run before pushing any
# Dockerfile or dependency change (every merge to main deploys). Needs Docker. Usage: scripts/smoke-images.sh [be|fe|mcp]
set -euo pipefail
cd "$(git rev-parse --show-toplevel)"

TAG="smoke-$$"
NET="mmm-smoke-$$"
fail=0
only="${1:-all}"

cleanup() {
  docker rm -f "mmm-mongo-$$" "mmm-be-$$" "mmm-fe-$$" "mmm-mcp-$$" >/dev/null 2>&1 || true
  docker network rm "$NET" >/dev/null 2>&1 || true
}
trap cleanup EXIT

ok()   { echo "  ok:   $*"; }
bad()  { echo "  FAIL: $*" >&2; fail=1; }
want() { [ "$only" = all ] || [ "$only" = "$1" ]; }

# Polls a URL until it returns the expected status (or gives up after ~40 s).
wait_status() { # url expected [curl args...]
  local url="$1" expected="$2"; shift 2
  local code=000
  for _ in $(seq 1 40); do
    code="$(curl -s -o /dev/null -w '%{http_code}' -m 3 "$@" "$url" || true)"
    [ "$code" = "$expected" ] && return 0
    sleep 1
  done
  echo "    last status: $code" >&2
  return 1
}

# Fails with the container's log if it already exited (crash loop), which is the usual symptom.
still_running() { [ "$(docker inspect -f '{{.State.Running}}' "$1" 2>/dev/null)" = true ]; }
show_logs()     { docker logs --tail 20 "$1" 2>&1 | sed 's/^/    | /' >&2 || true; }

docker network create "$NET" >/dev/null

if want be || want mcp; then
  docker run -d --rm --name "mmm-mongo-$$" --network "$NET" mongo:8 >/dev/null
  sleep 3
fi

if want be; then
  echo "backend"
  docker build -q -t "mmm-be:$TAG" app-backend >/dev/null && ok "image builds (includes its test stage)" || bad "build"
  docker run -d --name "mmm-be-$$" --network "$NET" -p 18080:8080 \
    -e PORT=8080 -e MONGODB_URI="mongodb://mmm-mongo-$$:27017" -e MONGODB_DBNAME=mmm \
    -e INTERNAL_API_KEY=smoke -e SALT=smoke -e CLUE_CRIME=000000000000000000000000 \
    "mmm-be:$TAG" >/dev/null
  if wait_status http://127.0.0.1:18080/health 200; then ok "/health returns 200"; else bad "/health"; show_logs "mmm-be-$$"; fi
  still_running "mmm-be-$$" && ok "still running" || bad "container exited"
  [ "$(docker exec "mmm-be-$$" id -u)" != 0 ] && ok "runs as non-root" || bad "runs as root"
fi

if want fe; then
  echo "frontend"
  docker build -q -t "mmm-fe:$TAG" --build-arg VITE_MMM_API_BASE_URL=http://localhost:8080 \
    --build-arg VITE_MMM_API_KEY=smoke app-frontend/murdermystery >/dev/null && ok "image builds" || bad "build"
  docker run -d --name "mmm-fe-$$" -p 18081:8080 "mmm-fe:$TAG" >/dev/null
  if wait_status http://127.0.0.1:18081/healthz 200; then ok "/healthz returns 200"; else bad "/healthz"; show_logs "mmm-fe-$$"; fi
  wait_status http://127.0.0.1:18081/ 200 && ok "/ returns 200" || bad "/"
  [ "$(docker exec "mmm-fe-$$" id -u)" != 0 ] && ok "runs as non-root" || bad "runs as root"
fi

if want mcp; then
  echo "mcp"
  docker build -q -t "mmm-mcp:$TAG" app-mcp >/dev/null && ok "image builds" || bad "build"
  docker run -d --name "mmm-mcp-$$" --network "$NET" -p 18082:8080 \
    -e MDB_MCP_CONNECTION_STRING="mongodb://mmm-mongo-$$:27017" "mmm-mcp:$TAG" >/dev/null
  init='{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2025-03-26","capabilities":{},"clientInfo":{"name":"smoke","version":"1"}}}'
  if wait_status http://127.0.0.1:18082/mcp 200 -X POST -H 'content-type: application/json' \
       -H 'accept: application/json, text/event-stream' -d "$init"; then ok "MCP initialize returns 200"; else bad "MCP initialize"; show_logs "mmm-mcp-$$"; fi
  [ "$(docker exec "mmm-mcp-$$" id -u)" != 0 ] && ok "runs as non-root" || bad "runs as root"
fi

[ "$fail" -eq 0 ] && echo "all smoke checks passed" || { echo "smoke checks FAILED" >&2; exit 1; }
