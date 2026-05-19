import { BadRequestException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { CreateQuestionDto } from './dto/create-question.dto.js';
import { ImportQuestionsDto } from './dto/import-questions.dto.js';
import {
  QuestionEntity,
  QuestionsRepository,
  QuestionView
} from './models/question.models.js';

const DEFAULT_TEACHER_ID = 'teacher_demo';
const DEFAULT_WORKSPACE_ID = 'demo_workspace';

@Injectable()
export class QuestionsService {
  constructor(
    @Inject('QuestionsRepository')
    private readonly repository: QuestionsRepository
  ) {}

  createQuestion(dto: CreateQuestionDto, workspaceId = DEFAULT_WORKSPACE_ID, userId = DEFAULT_TEACHER_ID): Promise<QuestionView> {
    return this.createQuestionEntity(dto, 'manual', workspaceId, userId);
  }

  async listQuestions(workspaceId = DEFAULT_WORKSPACE_ID): Promise<QuestionView[]> {
    return (await this.repository.listQuestions(workspaceId)).map((item) => this.toQuestionView(item));
  }

  async importQuestions(
    dto: ImportQuestionsDto,
    workspaceId = DEFAULT_WORKSPACE_ID,
    userId = DEFAULT_TEACHER_ID
  ): Promise<{ importedCount: number; items: QuestionView[] }> {
    const items: QuestionView[] = [];
    for (const question of dto.questions) {
      items.push(await this.createQuestionEntity(question, 'import', workspaceId, userId));
    }
    return { importedCount: items.length, items };
  }

  async updateQuestion(questionId: string, dto: CreateQuestionDto): Promise<QuestionView> {
    this.ensureAnswerExists(dto.options, dto.answer);
    const entity = await this.repository.findQuestionById(questionId);
    if (!entity) {
      throw new NotFoundException('题目不存在');
    }
    const updated: QuestionEntity = {
      ...entity,
      subject: dto.subject,
      grade: dto.grade,
      stem: dto.stem,
      options: dto.options,
      answer: dto.answer,
      explanation: dto.explanation,
      knowledgePoints: dto.knowledgePoints,
      difficulty: dto.difficulty
    };
    await this.repository.saveQuestion(updated);
    return this.toQuestionView(updated);
  }

  async deleteQuestion(questionId: string): Promise<{ deleted: true }> {
    if (!(await this.repository.findQuestionById(questionId))) {
      throw new NotFoundException('题目不存在');
    }
    await this.repository.deleteQuestion(questionId);
    return { deleted: true };
  }

  async findQuestionById(questionId: string): Promise<QuestionView | undefined> {
    const question = await this.repository.findQuestionById(questionId);
    return question ? this.toQuestionView(question) : undefined;
  }

  private async createQuestionEntity(
    dto: CreateQuestionDto,
    source: QuestionEntity['source'],
    workspaceId = DEFAULT_WORKSPACE_ID,
    userId = DEFAULT_TEACHER_ID
  ): Promise<QuestionView> {
    this.ensureAnswerExists(dto.options, dto.answer);

    const entity: QuestionEntity = {
      id: randomUUID(),
      workspaceId,
      creatorId: userId,
      subject: dto.subject,
      grade: dto.grade,
      stem: dto.stem,
      options: dto.options,
      answer: dto.answer,
      explanation: dto.explanation,
      knowledgePoints: dto.knowledgePoints,
      difficulty: dto.difficulty,
      source,
      aiGenerated: false,
      reviewStatus: 'approved',
      createdAt: new Date()
    };

    await this.repository.saveQuestion(entity);
    return this.toQuestionView(entity);
  }

  private ensureAnswerExists(
    options: CreateQuestionDto['options'],
    answer: string
  ): void {
    if (!options[answer as keyof CreateQuestionDto['options']]) {
      throw new BadRequestException('正确答案必须对应一个已填写的选项');
    }
  }

  private toQuestionView(entity: QuestionEntity): QuestionView {
    return {
      id: entity.id,
      workspaceId: entity.workspaceId,
      creatorId: entity.creatorId,
      subject: entity.subject,
      grade: entity.grade,
      stem: entity.stem,
      options: entity.options,
      answer: entity.answer,
      explanation: entity.explanation,
      knowledgePoints: entity.knowledgePoints,
      difficulty: entity.difficulty,
      source: entity.source,
      aiGenerated: entity.aiGenerated,
      reviewStatus: entity.reviewStatus,
      createdAt: entity.createdAt.toISOString()
    };
  }
}
