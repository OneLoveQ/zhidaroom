#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
DB_PATH="${SQLITE_DB_PATH:-${ROOT_DIR}/data/zhida.dev.db}"
export SQLITE_DB_PATH="${DB_PATH}"

if [[ ! -f "${DB_PATH}" ]]; then
  echo "SQLite 数据库不存在：${DB_PATH}"
  exit 0
fi

node --input-type=module <<'NODE'
const { DatabaseSync } = await import('node:sqlite');

const dbPath = process.env.SQLITE_DB_PATH;
const db = new DatabaseSync(dbPath);
const tables = ['classes', 'students', 'questions', 'sessions', 'answers'];
const counts = Object.fromEntries(
  tables.map((table) => [
    table,
    db.prepare(`SELECT COUNT(*) AS count FROM ${table}`).get().count
  ])
);
console.log(JSON.stringify({ dbPath, counts }, null, 2));
db.close();
NODE
