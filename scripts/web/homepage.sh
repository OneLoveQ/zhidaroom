#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
APP_DIR="${ROOT_DIR}/apps/homepage"
ACTION="${1:-dev}"

mkdir -p "${ROOT_DIR}/logs"

case "${ACTION}" in
  install)
    npm install --prefix "${APP_DIR}" 2>&1 | tee "${ROOT_DIR}/logs/homepage-install.log"
    ;;
  dev)
    npm run dev --prefix "${APP_DIR}" 2>&1 | tee "${ROOT_DIR}/logs/homepage.log"
    ;;
  build)
    npm run build --prefix "${APP_DIR}" 2>&1 | tee "${ROOT_DIR}/logs/homepage-build.log"
    ;;
  preview)
    npm run preview --prefix "${APP_DIR}" 2>&1 | tee "${ROOT_DIR}/logs/homepage-preview.log"
    ;;
  *)
    echo "Usage: bash scripts/web/homepage.sh [install|dev|build|preview]" >&2
    exit 1
    ;;
esac
