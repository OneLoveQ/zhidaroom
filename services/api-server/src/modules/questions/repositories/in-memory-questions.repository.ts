import { Injectable } from '@nestjs/common';
import {
  QuestionEntity,
  QuestionsRepository
} from '../models/question.models.js';
import { JsonStore } from '../../../common/storage/json-store.js';

@Injectable()
export class InMemoryQuestionsRepository implements QuestionsRepository {
  private readonly questions = new Map<string, QuestionEntity>();
  private readonly store = new JsonStore();

  constructor() {
    this.store.read<QuestionEntity[]>('questions', []).forEach((item) => {
      this.questions.set(item.id, {
        ...item,
        createdAt: new Date(item.createdAt)
      });
    });
  }

  async saveQuestion(entity: QuestionEntity): Promise<void> {
    this.questions.set(entity.id, entity);
    this.persist();
  }

  async listQuestions(): Promise<QuestionEntity[]> {
    return Array.from(this.questions.values());
  }

  async findQuestionById(questionId: string): Promise<QuestionEntity | undefined> {
    return this.questions.get(questionId);
  }

  async deleteQuestion(questionId: string): Promise<void> {
    this.questions.delete(questionId);
    this.persist();
  }

  private persist(): void {
    this.store.write('questions', Array.from(this.questions.values()));
  }
}
