#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
DB_PATH="${SQLITE_DB_PATH:-${ROOT_DIR}/data/zhida.dev.db}"

if [[ -f "${DB_PATH}" ]]; then
  mkdir -p "${ROOT_DIR}/data/backups"
  mv "${DB_PATH}" "${ROOT_DIR}/data/backups/zhida.dev.$(date +%Y%m%d%H%M%S).db"
fi

echo "已重置 SQLite 数据库。重新启动 API 后会自动建表：${DB_PATH}"
