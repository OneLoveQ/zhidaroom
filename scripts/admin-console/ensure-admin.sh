#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/../.." && pwd)"
EMAIL="${1:-}"
PASSWORD="${2:-}"
DISPLAY_NAME="${3:-平台总管理员}"
DB_PATH="${DB_PATH:-${ROOT_DIR}/data/zhida.dev.db}"

if [ -z "${EMAIL}" ] || [ -z "${PASSWORD}" ]; then
  echo "用法: $0 用户邮箱 登录密码 [显示名称]" >&2
  exit 1
fi

DB_PATH="${DB_PATH}" EMAIL="${EMAIL}" PASSWORD="${PASSWORD}" DISPLAY_NAME="${DISPLAY_NAME}" node --experimental-sqlite --input-type=module - <<'NODE'
import { randomBytes, randomUUID, scryptSync } from 'node:crypto';
import { DatabaseSync } from 'node:sqlite';

const db = new DatabaseSync(process.env.DB_PATH);
const email = process.env.EMAIL.trim().toLowerCase();
const displayName = process.env.DISPLAY_NAME.trim() || '平台总管理员';
const now = new Date().toISOString();

function hashPassword(password) {
  const salt = randomBytes(16).toString('hex');
  return `${salt}:${scryptSync(password, salt, 32).toString('hex')}`;
}

try {
  db.exec("ALTER TABLE users ADD COLUMN role TEXT NOT NULL DEFAULT 'teacher'");
} catch {
  // SQLite has no IF NOT EXISTS for ADD COLUMN in this runtime.
}

const user = db.prepare('SELECT id FROM users WHERE email = ?').get(email);
const passwordHash = hashPassword(process.env.PASSWORD);

if (user) {
  db.prepare(`
    UPDATE users
    SET password_hash = ?, role = 'platform_admin', status = 'active'
    WHERE id = ?
  `).run(passwordHash, user.id);
  console.log(`已更新平台总管理员账号: ${email}`);
} else {
  const userId = randomUUID();
  const workspaceId = randomUUID();
  db.prepare(`
    INSERT INTO users
      (id, email, password_hash, display_name, phone, school, subject, status, role, created_at)
    VALUES (?, ?, ?, ?, NULL, NULL, NULL, 'active', 'platform_admin', ?)
  `).run(userId, email, passwordHash, displayName, now);
  db.prepare(`
    INSERT INTO workspaces (id, type, name, school_name, owner_user_id, created_at)
    VALUES (?, 'personal', ?, NULL, ?, ?)
  `).run(workspaceId, `${displayName}的个人空间`, userId, now);
  db.prepare(`
    INSERT INTO workspace_members (id, workspace_id, user_id, role, status, created_at)
    VALUES (?, ?, ?, 'owner', 'active', ?)
  `).run(randomUUID(), workspaceId, userId, now);
  console.log(`已创建平台总管理员账号: ${email}`);
}
NODE
