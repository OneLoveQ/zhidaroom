import { Injectable } from '@nestjs/common';
import { SqliteService } from '../../../common/sqlite/sqlite.service.js';
import {
  QuestionEntity,
  QuestionOptions,
  QuestionsRepository
} from '../models/question.models.js';

interface QuestionRow {
  id: string;
  workspace_id: string | null;
  creator_id: string;
  subject: string;
  grade: string;
  stem: string;
  options_json: string;
  answer: string;
  explanation: string;
  knowledge_points_json: string;
  difficulty: string;
  source: string;
  ai_generated: number;
  review_status: string;
  created_at: string;
}

@Injectable()
export class SqliteQuestionsRepository implements QuestionsRepository {
  constructor(private readonly sqlite: SqliteService) {}

  async saveQuestion(entity: QuestionEntity): Promise<void> {
    this.sqlite.db.prepare(`
      INSERT INTO questions
        (id, workspace_id, creator_id, subject, grade, stem, options_json, answer, explanation,
         knowledge_points_json, difficulty, source, ai_generated, review_status, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        subject = excluded.subject,
        grade = excluded.grade,
        stem = excluded.stem,
        options_json = excluded.options_json,
        answer = excluded.answer,
        explanation = excluded.explanation,
        knowledge_points_json = excluded.knowledge_points_json,
        difficulty = excluded.difficulty
    `).run(...this.values(entity));
  }

  async listQuestions(workspaceId?: string): Promise<QuestionEntity[]> {
    const sql = workspaceId
      ? 'SELECT * FROM questions WHERE workspace_id = ? ORDER BY created_at DESC'
      : 'SELECT * FROM questions ORDER BY created_at DESC';
    return this.sqlite.db
      .prepare(sql)
      .all(...(workspaceId ? [workspaceId] : []))
      .map((row) => this.toEntity(row as unknown as QuestionRow));
  }

  async findQuestionById(questionId: string): Promise<QuestionEntity | undefined> {
    const row = this.sqlite.db.prepare('SELECT * FROM questions WHERE id = ?').get(questionId);
    return row ? this.toEntity(row as unknown as QuestionRow) : undefined;
  }

  async deleteQuestion(questionId: string): Promise<void> {
    this.sqlite.db.prepare('DELETE FROM questions WHERE id = ?').run(questionId);
  }

  private values(entity: QuestionEntity): Array<string | number> {
    return [
      entity.id,
      entity.workspaceId,
      entity.creatorId,
      entity.subject,
      entity.grade,
      entity.stem,
      JSON.stringify(entity.options),
      entity.answer,
      entity.explanation,
      JSON.stringify(entity.knowledgePoints),
      entity.difficulty,
      entity.source,
      entity.aiGenerated ? 1 : 0,
      entity.reviewStatus,
      entity.createdAt.toISOString()
    ];
  }

  private toEntity(row: QuestionRow): QuestionEntity {
    return {
      id: row.id,
      workspaceId: row.workspace_id ?? 'demo_workspace',
      creatorId: row.creator_id,
      subject: row.subject,
      grade: row.grade,
      stem: row.stem,
      options: JSON.parse(row.options_json) as QuestionOptions,
      answer: row.answer,
      explanation: row.explanation,
      knowledgePoints: JSON.parse(row.knowledge_points_json) as string[],
      difficulty: row.difficulty,
      source: row.source as QuestionEntity['source'],
      aiGenerated: Boolean(row.ai_generated),
      reviewStatus: row.review_status as QuestionEntity['reviewStatus'],
      createdAt: new Date(row.created_at)
    };
  }
}
