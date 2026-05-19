import { Injectable } from '@nestjs/common';
import { SqliteService } from '../../../common/sqlite/sqlite.service.js';
import { AnswerEntity, AnswersRepository } from '../models/answer.models.js';

interface AnswerRow {
  id: string;
  run_id: string | null;
  session_id: string;
  question_id: string;
  student_id: string;
  card_code: string;
  selected_option: string;
  is_correct: number;
  recognized_at: string;
  recognition_score: number;
  device_id: string;
}

@Injectable()
export class SqliteAnswersRepository implements AnswersRepository {
  constructor(private readonly sqlite: SqliteService) {}

  async upsertAnswers(answers: AnswerEntity[]): Promise<void> {
    const statement = this.sqlite.db.prepare(`
      INSERT INTO answers
        (id, run_id, session_id, question_id, student_id, card_code, selected_option,
         is_correct, recognized_at, recognition_score, device_id)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(run_id, question_id, student_id) DO UPDATE SET
        id = excluded.id,
        session_id = excluded.session_id,
        card_code = excluded.card_code,
        selected_option = excluded.selected_option,
        is_correct = excluded.is_correct,
        recognized_at = excluded.recognized_at,
        recognition_score = excluded.recognition_score,
        device_id = excluded.device_id
    `);
    this.sqlite.db.exec('BEGIN');
    try {
      answers.forEach((answer) => statement.run(...this.values(answer)));
      this.sqlite.db.exec('COMMIT');
    } catch (error) {
      this.sqlite.db.exec('ROLLBACK');
      throw error;
    }
  }

  async listAnswers(sessionId: string, questionId: string, runId?: string): Promise<AnswerEntity[]> {
    return this.sqlite.db
      .prepare(`
        SELECT * FROM answers
        WHERE session_id = ? AND question_id = ? AND (? IS NULL OR run_id = ?)
        ORDER BY recognized_at
      `)
      .all(sessionId, questionId, runId ?? null, runId ?? null)
      .map((row) => this.toEntity(row as unknown as AnswerRow));
  }

  private values(answer: AnswerEntity): Array<string | number | null> {
    return [
      answer.id,
      answer.runId ?? answer.sessionId,
      answer.sessionId,
      answer.questionId,
      answer.studentId,
      answer.cardCode,
      answer.selectedOption,
      answer.isCorrect ? 1 : 0,
      answer.recognizedAt.toISOString(),
      answer.recognitionScore,
      answer.deviceId
    ];
  }

  private toEntity(row: AnswerRow): AnswerEntity {
    return {
      id: row.id,
      runId: row.run_id ?? undefined,
      sessionId: row.session_id,
      questionId: row.question_id,
      studentId: row.student_id,
      cardCode: row.card_code,
      selectedOption: row.selected_option as AnswerEntity['selectedOption'],
      isCorrect: Boolean(row.is_correct),
      recognizedAt: new Date(row.recognized_at),
      recognitionScore: row.recognition_score,
      deviceId: row.device_id
    };
  }
}
