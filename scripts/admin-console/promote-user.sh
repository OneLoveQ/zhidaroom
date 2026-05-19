#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/../.." && pwd)"
EMAIL="${1:-}"
DB_PATH="${DB_PATH:-${ROOT_DIR}/data/zhida.dev.db}"

if [ -z "${EMAIL}" ]; then
  echo "用法: $0 用户邮箱" >&2
  exit 1
fi

DB_PATH="${DB_PATH}" node --experimental-sqlite -e "
  const { DatabaseSync } = require('node:sqlite');
  const db = new DatabaseSync(process.env.DB_PATH);
  db.exec(\"ALTER TABLE users ADD COLUMN role TEXT NOT NULL DEFAULT 'teacher'\");
" 2>/dev/null || true

DB_PATH="${DB_PATH}" EMAIL="${EMAIL}" node --experimental-sqlite -e "
  const { DatabaseSync } = require('node:sqlite');
  const db = new DatabaseSync(process.env.DB_PATH);
  const result = db.prepare(\"UPDATE users SET role = 'platform_admin' WHERE email = ?\").run(process.env.EMAIL.trim().toLowerCase());
  if (!result.changes) {
    console.error('未找到用户: ' + process.env.EMAIL);
    process.exit(1);
  }
  console.log('已设置为平台总管理员: ' + process.env.EMAIL);
"
