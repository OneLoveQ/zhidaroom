import { Injectable } from '@nestjs/common';
import { SqliteService } from '../../../common/sqlite/sqlite.service.js';
import {
  SessionEntity,
  SessionsRepository
} from '../models/session.models.js';

interface SessionRow {
  id: string;
  workspace_id: string | null;
  teacher_user_id: string | null;
  teacher_id: string;
  class_id: string;
  title: string;
  mode: string;
  status: string;
  stage: string | null;
  current_question_id: string | null;
  auto_advance_at: string | null;
  teacher_name: string | null;
  subject: string | null;
  classroom_code: string | null;
  started_at: string | null;
  ended_at: string | null;
  created_at: string;
}

interface SessionQuestionRow {
  question_id: string;
}

@Injectable()
export class SqliteSessionsRepository implements SessionsRepository {
  constructor(private readonly sqlite: SqliteService) {}

  async saveSession(entity: SessionEntity): Promise<void> {
    this.sqlite.db.exec('BEGIN');
    try {
      this.sqlite.db.prepare(`
        INSERT INTO sessions
          (id, workspace_id, teacher_user_id, teacher_id, class_id, title, mode, status, stage,
           current_question_id, auto_advance_at, teacher_name, subject,
           classroom_code, started_at, ended_at, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(id) DO UPDATE SET
          title = excluded.title,
          workspace_id = excluded.workspace_id,
          teacher_user_id = excluded.teacher_user_id,
          status = excluded.status,
          stage = excluded.stage,
          current_question_id = excluded.current_question_id,
          auto_advance_at = excluded.auto_advance_at,
          teacher_name = excluded.teacher_name,
          subject = excluded.subject,
          classroom_code = excluded.classroom_code,
          started_at = excluded.started_at,
          ended_at = excluded.ended_at
      `).run(...this.values(entity));
      this.sqlite.db.prepare('DELETE FROM session_questions WHERE session_id = ?').run(entity.id);
      const insertQuestion = this.sqlite.db.prepare(`
        INSERT INTO session_questions (session_id, question_id, order_no) VALUES (?, ?, ?)
      `);
      entity.questionIds.forEach((questionId, index) => {
        insertQuestion.run(entity.id, questionId, index + 1);
      });
      this.sqlite.db.exec('COMMIT');
    } catch (error) {
      this.sqlite.db.exec('ROLLBACK');
      throw error;
    }
  }

  async listSessions(): Promise<SessionEntity[]> {
    return this.sqlite.db
      .prepare('SELECT * FROM sessions ORDER BY created_at DESC')
      .all()
      .map((row) => this.toEntity(row as unknown as SessionRow));
  }

  async findSessionById(sessionId: string): Promise<SessionEntity | undefined> {
    const row = this.sqlite.db.prepare('SELECT * FROM sessions WHERE id = ?').get(sessionId);
    return row ? this.toEntity(row as unknown as SessionRow) : undefined;
  }

  async findSessionByClassroomCode(
    classroomCode: string
  ): Promise<SessionEntity | undefined> {
    const row = this.sqlite.db
      .prepare('SELECT * FROM sessions WHERE classroom_code = ? ORDER BY created_at DESC LIMIT 1')
      .get(classroomCode);
    return row ? this.toEntity(row as unknown as SessionRow) : undefined;
  }

  private values(entity: SessionEntity): Array<string | null> {
    return [
      entity.id,
      entity.workspaceId,
      entity.teacherUserId,
      entity.teacherId,
      entity.classId,
      entity.title,
      entity.mode,
      entity.status,
      entity.stage ?? null,
      entity.currentQuestionId ?? null,
      entity.autoAdvanceAt?.toISOString() ?? null,
      entity.teacherName ?? null,
      entity.subject ?? null,
      entity.classroomCode ?? null,
      entity.startedAt?.toISOString() ?? null,
      entity.endedAt?.toISOString() ?? null,
      entity.createdAt.toISOString()
    ];
  }

  private toEntity(row: SessionRow): SessionEntity {
    return {
      id: row.id,
      workspaceId: row.workspace_id ?? 'demo_workspace',
      teacherUserId: row.teacher_user_id ?? row.teacher_id,
      teacherId: row.teacher_id,
      classId: row.class_id,
      title: row.title,
      mode: row.mode as SessionEntity['mode'],
      status: row.status as SessionEntity['status'],
      stage: (row.stage ?? undefined) as SessionEntity['stage'],
      currentQuestionId: row.current_question_id ?? undefined,
      autoAdvanceAt: row.auto_advance_at ? new Date(row.auto_advance_at) : undefined,
      questionIds: this.questionIds(row.id),
      teacherName: row.teacher_name ?? undefined,
      subject: row.subject ?? undefined,
      classroomCode: row.classroom_code ?? undefined,
      startedAt: row.started_at ? new Date(row.started_at) : undefined,
      endedAt: row.ended_at ? new Date(row.ended_at) : undefined,
      createdAt: new Date(row.created_at)
    };
  }

  private questionIds(sessionId: string): string[] {
    return this.sqlite.db
      .prepare('SELECT question_id FROM session_questions WHERE session_id = ? ORDER BY order_no')
      .all(sessionId)
      .map((row) => (row as unknown as SessionQuestionRow).question_id);
  }
}
