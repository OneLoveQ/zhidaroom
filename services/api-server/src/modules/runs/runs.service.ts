import { BadRequestException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { QuestionsService } from '../questions/questions.service.js';
import { SessionsService } from '../sessions/sessions.service.js';
import { CreateRunDto } from './dto/create-run.dto.js';
import { AssessmentRunEntity, AssessmentRunsRepository, AssessmentRunView } from './models/run.models.js';

@Injectable()
export class RunsService {
  constructor(
    @Inject('AssessmentRunsRepository')
    private readonly repository: AssessmentRunsRepository,
    private readonly sessionsService: SessionsService,
    private readonly questionsService: QuestionsService
  ) {}

  async createRun(sessionId: string, dto: CreateRunDto): Promise<AssessmentRunView> {
    await this.sessionsService.getSession(sessionId);
    for (const questionId of dto.questionIds) {
      if (!(await this.questionsService.findQuestionById(questionId))) {
        throw new NotFoundException(`题目不存在: ${questionId}`);
      }
    }
    await this.sessionsService.appendQuestions(sessionId, dto.questionIds);
    const entity: AssessmentRunEntity = {
      id: randomUUID(),
      sessionId,
      title: dto.title,
      type: dto.type,
      status: 'draft',
      stage: 'selecting',
      currentQuestionId: dto.questionIds[0],
      questionIds: dto.questionIds,
      createdAt: new Date()
    };
    await this.repository.save(entity);
    return this.toView(entity);
  }

  async listRuns(sessionId: string): Promise<AssessmentRunView[]> {
    await this.sessionsService.getSession(sessionId);
    return (await this.repository.listBySession(sessionId)).map((item) => this.toView(item));
  }

  async findRun(runId: string): Promise<AssessmentRunView | undefined> {
    const entity = await this.repository.findById(runId);
    return entity ? this.toView(entity) : undefined;
  }

  async getActiveRun(sessionId: string): Promise<AssessmentRunView | undefined> {
    const active = await this.repository.findActiveBySession(sessionId);
    return active ? this.toView(active) : undefined;
  }

  async getCurrentRun(sessionId: string): Promise<AssessmentRunView | undefined> {
    const entity =
      (await this.repository.findActiveBySession(sessionId)) ??
      (await this.repository.findLatestBySession(sessionId));
    return entity ? this.toView(entity) : undefined;
  }

  async startRun(sessionId: string, runId: string): Promise<AssessmentRunView> {
    const entity = await this.getRunEntity(sessionId, runId);
    const active = await this.repository.findActiveBySession(sessionId);
    if (active && active.id !== runId) {
      await this.repository.save({ ...active, status: 'completed', stage: 'result', completedAt: new Date() });
    }
    const updated = { ...entity, status: 'active' as const, stage: 'scanning' as const, startedAt: entity.startedAt ?? new Date() };
    await this.repository.save(updated);
    await this.sessionsService.updateStage(sessionId, { stage: 'scanning', questionId: updated.currentQuestionId });
    return this.toView(updated);
  }

  async completeRun(sessionId: string, runId: string): Promise<AssessmentRunView> {
    const entity = await this.getRunEntity(sessionId, runId);
    const updated = { ...entity, status: 'completed' as const, stage: 'result' as const, completedAt: new Date() };
    await this.repository.save(updated);
    return this.toView(updated);
  }

  async finishQuestion(sessionId: string, runId: string, questionId: string): Promise<AssessmentRunView> {
    const entity = await this.getRunEntity(sessionId, runId);
    if (entity.status !== 'active') throw new BadRequestException('只有进行中的评测可以完成搜集');
    if ((entity.currentQuestionId ?? entity.questionIds[0]) !== questionId) {
      throw new BadRequestException('只能完成当前题目的搜集');
    }
    return this.advanceAfterQuestionComplete(sessionId, runId, questionId);
  }

  async setCurrentQuestion(runId: string, questionId: string): Promise<AssessmentRunView> {
    const entity = await this.repository.findById(runId);
    if (!entity) throw new NotFoundException('评测不存在');
    if (!entity.questionIds.includes(questionId)) throw new BadRequestException('题目不属于当前评测');
    const updated = { ...entity, stage: 'scanning' as const, currentQuestionId: questionId };
    await this.repository.save(updated);
    return this.toView(updated);
  }

  async advanceAfterQuestionComplete(sessionId: string, runId: string, questionId: string): Promise<AssessmentRunView> {
    const entity = await this.getRunEntity(sessionId, runId);
    const index = entity.questionIds.indexOf(questionId);
    if (index < 0) throw new BadRequestException('题目不属于当前评测');
    if (index < entity.questionIds.length - 1) {
      const updated = { ...entity, stage: 'question_complete' as const, currentQuestionId: questionId };
      await this.repository.save(updated);
      await this.sessionsService.markQuestionCompleteIfCurrent(sessionId, questionId);
      return this.toView(updated);
    }
    const completed = await this.completeRun(sessionId, runId);
    await this.sessionsService.updateStage(sessionId, { stage: 'session_report', questionId });
    return completed;
  }

  async applyAutoAdvance(sessionId: string): Promise<AssessmentRunView | undefined> {
    const active = await this.repository.findActiveBySession(sessionId);
    if (!active || active.stage !== 'question_complete') {
      return active ? this.toView(active) : undefined;
    }
    const session = await this.sessionsService.findSession(sessionId);
    if (!session?.autoAdvanceAt || new Date(session.autoAdvanceAt).getTime() > Date.now()) {
      return this.toView(active);
    }
    const index = active.questionIds.indexOf(active.currentQuestionId ?? active.questionIds[0]);
    const nextQuestionId = active.questionIds[index + 1];
    if (!nextQuestionId) {
      return this.advanceAfterQuestionComplete(sessionId, active.id, active.currentQuestionId ?? active.questionIds[0]);
    }
    const updated = { ...active, stage: 'scanning' as const, currentQuestionId: nextQuestionId };
    await this.repository.save(updated);
    await this.sessionsService.updateStage(sessionId, { stage: 'scanning', questionId: nextQuestionId });
    return this.toView(updated);
  }

  private async getRunEntity(sessionId: string, runId: string): Promise<AssessmentRunEntity> {
    const entity = await this.repository.findById(runId);
    if (!entity || entity.sessionId !== sessionId) throw new NotFoundException('评测不存在');
    return entity;
  }

  private toView(entity: AssessmentRunEntity): AssessmentRunView {
    return {
      ...entity,
      createdAt: entity.createdAt.toISOString(),
      startedAt: entity.startedAt?.toISOString(),
      completedAt: entity.completedAt?.toISOString()
    };
  }
}
