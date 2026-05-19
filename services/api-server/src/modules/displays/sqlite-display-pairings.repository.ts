import { Injectable } from '@nestjs/common';
import { SqliteService } from '../../common/sqlite/sqlite.service.js';
import {
  DisplayPairingEntity,
  DisplayPairingsRepository
} from './display.models.js';

interface DisplayPairingRow {
  pair_code: string;
  display_id: string;
  workspace_id: string | null;
  teacher_user_id: string | null;
  session_id: string | null;
  status: string;
  expires_at: string;
  created_at: string;
  bound_at: string | null;
}

@Injectable()
export class SqliteDisplayPairingsRepository implements DisplayPairingsRepository {
  constructor(private readonly sqlite: SqliteService) {}

  async save(entity: DisplayPairingEntity): Promise<void> {
    this.sqlite.db.prepare(`
      INSERT INTO display_pairings
        (pair_code, display_id, workspace_id, teacher_user_id, session_id, status, expires_at, created_at, bound_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(pair_code) DO UPDATE SET
        session_id = excluded.session_id,
        workspace_id = excluded.workspace_id,
        teacher_user_id = excluded.teacher_user_id,
        status = excluded.status,
        expires_at = excluded.expires_at,
        bound_at = excluded.bound_at
    `).run(
      entity.pairCode,
      entity.displayId,
      entity.workspaceId ?? null,
      entity.teacherUserId ?? null,
      entity.sessionId ?? null,
      entity.status,
      entity.expiresAt.toISOString(),
      entity.createdAt.toISOString(),
      entity.boundAt?.toISOString() ?? null
    );
  }

  async findByPairCode(pairCode: string): Promise<DisplayPairingEntity | undefined> {
    const row = this.sqlite.db
      .prepare('SELECT * FROM display_pairings WHERE pair_code = ?')
      .get(pairCode);
    return row ? this.toEntity(row as unknown as DisplayPairingRow) : undefined;
  }

  async findLatestByDisplayId(displayId: string): Promise<DisplayPairingEntity | undefined> {
    const row = this.sqlite.db
      .prepare('SELECT * FROM display_pairings WHERE display_id = ? ORDER BY created_at DESC LIMIT 1')
      .get(displayId);
    return row ? this.toEntity(row as unknown as DisplayPairingRow) : undefined;
  }

  private toEntity(row: DisplayPairingRow): DisplayPairingEntity {
    return {
      pairCode: row.pair_code,
      displayId: row.display_id,
      workspaceId: row.workspace_id ?? undefined,
      teacherUserId: row.teacher_user_id ?? undefined,
      sessionId: row.session_id ?? undefined,
      status: row.status as DisplayPairingEntity['status'],
      expiresAt: new Date(row.expires_at),
      createdAt: new Date(row.created_at),
      boundAt: row.bound_at ? new Date(row.bound_at) : undefined
    };
  }
}
