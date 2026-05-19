import { Injectable } from '@nestjs/common';
import { SqliteService } from '../../../common/sqlite/sqlite.service.js';
import {
  AuthRepository,
  AuthSessionEntity,
  UserEntity,
  WorkspaceEntity,
  WorkspaceMemberEntity
} from '../models/auth.models.js';

interface UserRow {
  id: string; email: string; password_hash: string; display_name: string;
  phone: string | null; school: string | null; subject: string | null;
  status: string; created_at: string;
}
interface WorkspaceRow {
  id: string; type: string; name: string; school_name: string | null;
  owner_user_id: string; created_at: string;
}
interface SessionRow {
  token: string; user_id: string; workspace_id: string; expires_at: string; created_at: string;
}

@Injectable()
export class SqliteAuthRepository implements AuthRepository {
  constructor(private readonly sqlite: SqliteService) {}

  async saveUser(entity: UserEntity): Promise<void> {
    this.sqlite.db.prepare(`
      INSERT INTO users (id, email, password_hash, display_name, phone, school, subject, status, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(entity.id, entity.email, entity.passwordHash, entity.displayName, entity.phone ?? null,
      entity.school ?? null, entity.subject ?? null, entity.status, entity.createdAt.toISOString());
  }

  async findUserByEmail(email: string): Promise<UserEntity | undefined> {
    const row = this.sqlite.db.prepare('SELECT * FROM users WHERE email = ?').get(email);
    return row ? this.toUser(row as unknown as UserRow) : undefined;
  }

  async findUserById(userId: string): Promise<UserEntity | undefined> {
    const row = this.sqlite.db.prepare('SELECT * FROM users WHERE id = ?').get(userId);
    return row ? this.toUser(row as unknown as UserRow) : undefined;
  }

  async saveWorkspace(entity: WorkspaceEntity): Promise<void> {
    this.sqlite.db.prepare(`
      INSERT INTO workspaces (id, type, name, school_name, owner_user_id, created_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(entity.id, entity.type, entity.name, entity.schoolName ?? null, entity.ownerUserId, entity.createdAt.toISOString());
  }

  async saveMember(entity: WorkspaceMemberEntity): Promise<void> {
    this.sqlite.db.prepare(`
      INSERT INTO workspace_members (id, workspace_id, user_id, role, status, created_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(entity.id, entity.workspaceId, entity.userId, entity.role, entity.status, entity.createdAt.toISOString());
  }

  async findDefaultWorkspace(userId: string): Promise<WorkspaceEntity | undefined> {
    const row = this.sqlite.db.prepare(`
      SELECT w.* FROM workspaces w
      JOIN workspace_members m ON m.workspace_id = w.id
      WHERE m.user_id = ? AND m.status = 'active'
      ORDER BY CASE WHEN w.type = 'personal' THEN 0 ELSE 1 END, w.created_at
      LIMIT 1
    `).get(userId);
    return row ? this.toWorkspace(row as unknown as WorkspaceRow) : undefined;
  }

  async saveSession(entity: AuthSessionEntity): Promise<void> {
    this.sqlite.db.prepare(`
      INSERT INTO auth_sessions (token, user_id, workspace_id, expires_at, created_at)
      VALUES (?, ?, ?, ?, ?)
    `).run(entity.token, entity.userId, entity.workspaceId, entity.expiresAt.toISOString(), entity.createdAt.toISOString());
  }

  async findSession(token: string): Promise<AuthSessionEntity | undefined> {
    const row = this.sqlite.db.prepare('SELECT * FROM auth_sessions WHERE token = ?').get(token);
    return row ? this.toSession(row as unknown as SessionRow) : undefined;
  }

  async deleteSession(token: string): Promise<void> {
    this.sqlite.db.prepare('DELETE FROM auth_sessions WHERE token = ?').run(token);
  }

  private toUser(row: UserRow): UserEntity {
    return {
      id: row.id, email: row.email, passwordHash: row.password_hash, displayName: row.display_name,
      phone: row.phone ?? undefined, school: row.school ?? undefined, subject: row.subject ?? undefined,
      status: row.status === 'disabled' ? 'disabled' : 'active', createdAt: new Date(row.created_at)
    };
  }

  private toWorkspace(row: WorkspaceRow): WorkspaceEntity {
    return {
      id: row.id, type: row.type === 'school' ? 'school' : 'personal', name: row.name,
      schoolName: row.school_name ?? undefined, ownerUserId: row.owner_user_id, createdAt: new Date(row.created_at)
    };
  }

  private toSession(row: SessionRow): AuthSessionEntity {
    return {
      token: row.token, userId: row.user_id, workspaceId: row.workspace_id,
      expiresAt: new Date(row.expires_at), createdAt: new Date(row.created_at)
    };
  }
}
