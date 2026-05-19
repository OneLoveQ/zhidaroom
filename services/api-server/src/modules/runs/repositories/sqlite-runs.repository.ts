import { Injectable } from '@nestjs/common';
import { SqliteService } from '../../../common/sqlite/sqlite.service.js';
import { AssessmentRunEntity, AssessmentRunsRepository } from '../models/run.models.js';

interface RunRow {
  id: string;
  session_id: string;
  title: string;
  type: string;
  status: string;
  stage: string;
  current_question_id: string | null;
  started_at: string | null;
  completed_at: string | null;
  created_at: string;
}

interface RunQuestionRow { question_id: string }

@Injectable()
export class SqliteRunsRepository implements AssessmentRunsRepository {
  constructor(private readonly sqlite: SqliteService) {}

  async save(entity: AssessmentRunEntity): Promise<void> {
    this.sqlite.db.exec('BEGIN');
    try {
      this.sqlite.db.prepare(`
        INSERT INTO assessment_runs
          (id, session_id, title, type, status, stage, current_question_id,
           started_at, completed_at, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(id) DO UPDATE SET
          title = excluded.title,
          status = excluded.status,
          stage = excluded.stage,
          current_question_id = excluded.current_question_id,
          started_at = excluded.started_at,
          completed_at = excluded.completed_at
      `).run(...this.values(entity));
      this.sqlite.db.prepare('DELETE FROM assessment_run_questions WHERE run_id = ?').run(entity.id);
      const insert = this.sqlite.db.prepare(`
        INSERT INTO assessment_run_questions (run_id, question_id, order_no) VALUES (?, ?, ?)
      `);
      entity.questionIds.forEach((questionId, index) => insert.run(entity.id, questionId, index + 1));
      this.sqlite.db.exec('COMMIT');
    } catch (error) {
      this.sqlite.db.exec('ROLLBACK');
      throw error;
    }
  }

  async listBySession(sessionId: string): Promise<AssessmentRunEntity[]> {
    return this.sqlite.db
      .prepare('SELECT * FROM assessment_runs WHERE session_id = ? ORDER BY created_at')
      .all(sessionId)
      .map((row) => this.toEntity(row as unknown as RunRow));
  }

  async findById(runId: string): Promise<AssessmentRunEntity | undefined> {
    const row = this.sqlite.db.prepare('SELECT * FROM assessment_runs WHERE id = ?').get(runId);
    return row ? this.toEntity(row as unknown as RunRow) : undefined;
  }

  async findActiveBySession(sessionId: string): Promise<AssessmentRunEntity | undefined> {
    const row = this.sqlite.db
      .prepare('SELECT * FROM assessment_runs WHERE session_id = ? AND status = ? ORDER BY created_at DESC LIMIT 1')
      .get(sessionId, 'active');
    return row ? this.toEntity(row as unknown as RunRow) : undefined;
  }

  async findLatestBySession(sessionId: string): Promise<AssessmentRunEntity | undefined> {
    const row = this.sqlite.db
      .prepare('SELECT * FROM assessment_runs WHERE session_id = ? ORDER BY created_at DESC LIMIT 1')
      .get(sessionId);
    return row ? this.toEntity(row as unknown as RunRow) : undefined;
  }

  private values(entity: AssessmentRunEntity): Array<string | null> {
    return [
      entity.id,
      entity.sessionId,
      entity.title,
      entity.type,
      entity.status,
      entity.stage,
      entity.currentQuestionId ?? null,
      entity.startedAt?.toISOString() ?? null,
      entity.completedAt?.toISOString() ?? null,
      entity.createdAt.toISOString()
    ];
  }

  private toEntity(row: RunRow): AssessmentRunEntity {
    return {
      id: row.id,
      sessionId: row.session_id,
      title: row.title,
      type: row.type as AssessmentRunEntity['type'],
      status: row.status as AssessmentRunEntity['status'],
      stage: row.stage as AssessmentRunEntity['stage'],
      currentQuestionId: row.current_question_id ?? undefined,
      questionIds: this.questionIds(row.id),
      startedAt: row.started_at ? new Date(row.started_at) : undefined,
      completedAt: row.completed_at ? new Date(row.completed_at) : undefined,
      createdAt: new Date(row.created_at)
    };
  }

  private questionIds(runId: string): string[] {
    return this.sqlite.db
      .prepare('SELECT question_id FROM assessment_run_questions WHERE run_id = ? ORDER BY order_no')
      .all(runId)
      .map((row) => (row as unknown as RunQuestionRow).question_id);
  }
}
