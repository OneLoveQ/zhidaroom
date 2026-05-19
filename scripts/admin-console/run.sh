#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/../.." && pwd)"
ACTION="${1:-build}"

case "${ACTION}" in
  install)
    npm install --prefix "${ROOT_DIR}/apps/admin-console" --workspaces=false
    ;;
  build)
    npm run build --prefix "${ROOT_DIR}/apps/admin-console" --workspaces=false
    ;;
  dev)
    mkdir -p "${ROOT_DIR}/logs"
    npm run dev --prefix "${ROOT_DIR}/apps/admin-console" --workspaces=false 2>&1 | tee "${ROOT_DIR}/logs/admin-console.log"
    ;;
  *)
    echo "用法: $0 {install|build|dev}" >&2
    exit 1
    ;;
esac
