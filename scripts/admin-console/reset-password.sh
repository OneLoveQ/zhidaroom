#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/../.." && pwd)"
EMAIL="${1:-}"
PASSWORD="${2:-}"
DB_PATH="${DB_PATH:-${ROOT_DIR}/data/zhida.dev.db}"

if [ -z "${EMAIL}" ] || [ -z "${PASSWORD}" ]; then
  echo "用法: $0 用户邮箱 新密码" >&2
  exit 1
fi

DB_PATH="${DB_PATH}" EMAIL="${EMAIL}" PASSWORD="${PASSWORD}" node --experimental-sqlite --input-type=module - <<'NODE'
import { randomBytes, scryptSync } from 'node:crypto';
import { DatabaseSync } from 'node:sqlite';

const db = new DatabaseSync(process.env.DB_PATH);
const email = process.env.EMAIL.trim().toLowerCase();

function hashPassword(password) {
  const salt = randomBytes(16).toString('hex');
  return `${salt}:${scryptSync(password, salt, 32).toString('hex')}`;
}

const result = db.prepare(`
  UPDATE users
  SET password_hash = ?, status = 'active'
  WHERE email = ?
`).run(hashPassword(process.env.PASSWORD), email);

if (!result.changes) {
  console.error(`未找到用户: ${email}`);
  process.exit(1);
}

console.log(`已重置用户密码: ${email}`);
NODE
