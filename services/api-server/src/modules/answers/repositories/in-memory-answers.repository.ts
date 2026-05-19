import { Injectable } from '@nestjs/common';
import { AnswerEntity, AnswersRepository } from '../models/answer.models.js';
import { JsonStore } from '../../../common/storage/json-store.js';

@Injectable()
export class InMemoryAnswersRepository implements AnswersRepository {
  private readonly answers = new Map<string, AnswerEntity>();
  private readonly store = new JsonStore();

  constructor() {
    this.store.read<AnswerEntity[]>('answers', []).forEach((item) => {
      const answer = {
        ...item,
        recognizedAt: new Date(item.recognizedAt)
      };
      this.answers.set(this.getKey(answer), answer);
    });
  }

  async upsertAnswers(answers: AnswerEntity[]): Promise<void> {
    answers.forEach((answer) => {
      this.answers.set(this.getKey(answer), answer);
    });
    this.persist();
  }

  async listAnswers(sessionId: string, questionId: string, runId?: string): Promise<AnswerEntity[]> {
    return Array.from(this.answers.values()).filter(
      (answer) =>
        answer.sessionId === sessionId &&
        answer.questionId === questionId &&
        (!runId || (answer.runId ?? answer.sessionId) === runId)
    );
  }

  private getKey(answer: AnswerEntity): string {
    return `${answer.runId ?? answer.sessionId}:${answer.questionId}:${answer.studentId}`;
  }

  private persist(): void {
    this.store.write('answers', Array.from(this.answers.values()));
  }
}
