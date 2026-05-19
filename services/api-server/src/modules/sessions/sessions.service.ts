import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException
} from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { ClassesService } from '../classes/classes.service.js';
import { QuestionsService } from '../questions/questions.service.js';
import { QuestionView } from '../questions/models/question.models.js';
import { CreateSessionDto } from './dto/create-session.dto.js';
import {
  SessionDetailView,
  SessionEntity,
  SessionsRepository,
  SessionStage,
  SessionStatus,
  SessionView
} from './models/session.models.js';
import { UpdateSessionStageDto } from './dto/update-session-stage.dto.js';
import { createMobileBindToken } from '../../common/auth/mobile-bind-token.js';

const DEFAULT_TEACHER_ID = 'teacher_demo';
const DEFAULT_WORKSPACE_ID = 'demo_workspace';
const SCANNER_BASE_URL =
  process.env.SCANNER_PUBLIC_BASE_URL ??
  process.env.MOBILE_BIND_BASE_URL ??
  'http://127.0.0.1:5177';

@Injectable()
export class SessionsService {
  constructor(
    @Inject('SessionsRepository')
    private readonly repository: SessionsRepository,
    private readonly classesService: ClassesService,
    private readonly questionsService: QuestionsService
  ) {}

  async createSession(
    dto: CreateSessionDto,
    workspaceId = DEFAULT_WORKSPACE_ID,
    userId = DEFAULT_TEACHER_ID
  ): Promise<SessionDetailView> {
    await this.classesService.listStudents(dto.classId);
    const questions = await this.resolveQuestions(dto.questionIds);

    const entity: SessionEntity = {
      id: randomUUID(),
      workspaceId,
      teacherUserId: userId,
      teacherId: userId,
      classId: dto.classId,
      title: dto.title,
      mode: dto.mode,
      status: 'draft',
      stage: 'binding',
      currentQuestionId: dto.questionIds[0],
      questionIds: dto.questionIds,
      teacherName: dto.teacherName,
      subject: dto.subject,
      classroomCode: dto.classroomCode,
      createdAt: new Date()
    };

    await this.repository.saveSession(entity);
    return this.toSessionDetailView(entity, questions);
  }

  async listSessions(): Promise<SessionView[]> {
    return (await this.repository.listSessions()).map((item) => this.toSessionView(item));
  }

  async hideSession(sessionId: string): Promise<{ deleted: true }> {
    await this.getSessionEntity(sessionId);
    await this.repository.hideSession(sessionId, new Date());
    return { deleted: true };
  }

  async getSession(sessionId: string): Promise<SessionDetailView> {
    const entity = await this.getSessionEntity(sessionId);
    return this.toSessionDetailView(entity, await this.resolveQuestions(entity.questionIds));
  }

  async findSession(sessionId: string): Promise<SessionDetailView | undefined> {
    const entity = await this.repository.findSessionById(sessionId);
    if (!entity) {
      return undefined;
    }
    return this.toSessionDetailView(entity, await this.resolveQuestions(entity.questionIds));
  }

  async startSession(sessionId: string): Promise<SessionDetailView> {
    const entity = await this.getSessionEntity(sessionId);
    if (entity.status === 'ended') {
      throw new BadRequestException('已结束的课堂活动不能重新开始');
    }

    const updated = {
      ...entity,
      status: 'active' as SessionStatus,
      stage: entity.stage ?? 'binding',
      currentQuestionId: entity.currentQuestionId ?? entity.questionIds[0],
      startedAt: entity.startedAt ?? new Date()
    };

    await this.repository.saveSession(updated);
    return this.toSessionDetailView(updated, await this.resolveQuestions(updated.questionIds));
  }

  async endSession(sessionId: string): Promise<SessionDetailView> {
    const entity = await this.getSessionEntity(sessionId);
    if (entity.status !== 'active') {
      throw new BadRequestException('只有进行中的课堂活动可以结束');
    }

    const updated = {
      ...entity,
      status: 'ended' as SessionStatus,
      stage: 'session_report' as SessionStage,
      endedAt: new Date()
    };

    await this.repository.saveSession(updated);
    return this.toSessionDetailView(updated, await this.resolveQuestions(updated.questionIds));
  }

  async getSessionByClassroomCode(classroomCode: string): Promise<SessionDetailView> {
    const entity = await this.repository.findSessionByClassroomCode(classroomCode);
    if (!entity) {
      throw new NotFoundException('课堂活动不存在');
    }
    return this.toSessionDetailView(entity, await this.resolveQuestions(entity.questionIds));
  }

  async updateStage(
    sessionId: string,
    dto: UpdateSessionStageDto
  ): Promise<SessionDetailView> {
    const entity = await this.getSessionEntity(sessionId);
    const questionId = dto.questionId ?? entity.currentQuestionId ?? entity.questionIds[0];
    if (questionId && !entity.questionIds.includes(questionId)) {
      throw new BadRequestException('题目不属于当前课堂活动');
    }
    const updated = {
      ...entity,
      stage: dto.stage,
      currentQuestionId: questionId,
      autoAdvanceAt: undefined
    };
    await this.repository.saveSession(updated);
    return this.toSessionDetailView(updated, await this.resolveQuestions(updated.questionIds));
  }

  async appendQuestions(sessionId: string, questionIds: string[]): Promise<SessionDetailView> {
    const entity = await this.getSessionEntity(sessionId);
    const updated = {
      ...entity,
      questionIds: Array.from(new Set([...entity.questionIds, ...questionIds])),
      currentQuestionId: entity.currentQuestionId ?? questionIds[0] ?? entity.currentQuestionId
    };
    await this.repository.saveSession(updated);
    return this.toSessionDetailView(updated, await this.resolveQuestions(updated.questionIds));
  }

  async markQuestionCompleteIfCurrent(
    sessionId: string,
    questionId: string
  ): Promise<void> {
    const entity = await this.getSessionEntity(sessionId);
    if ((entity.currentQuestionId ?? entity.questionIds[0]) !== questionId) {
      return;
    }
    await this.repository.saveSession({
      ...entity,
      stage: 'question_complete',
      autoAdvanceAt: new Date(Date.now() + 3000)
    });
  }

  async applyAutoAdvance(sessionId: string): Promise<SessionDetailView> {
    const entity = await this.getSessionEntity(sessionId);
    if (entity.stage !== 'question_complete' || !entity.autoAdvanceAt) {
      return this.toSessionDetailView(entity, await this.resolveQuestions(entity.questionIds));
    }
    if (entity.autoAdvanceAt.getTime() > Date.now()) {
      return this.toSessionDetailView(entity, await this.resolveQuestions(entity.questionIds));
    }
    const currentId = entity.currentQuestionId ?? entity.questionIds[0];
    const currentIndex = entity.questionIds.indexOf(currentId);
    const nextQuestionId = entity.questionIds[currentIndex + 1];
    const updated = nextQuestionId
      ? { ...entity, stage: 'scanning' as SessionStage, currentQuestionId: nextQuestionId, autoAdvanceAt: undefined }
      : { ...entity, stage: 'session_report' as SessionStage, autoAdvanceAt: undefined };
    await this.repository.saveSession(updated);
    return this.toSessionDetailView(updated, await this.resolveQuestions(updated.questionIds));
  }

  getMobileBindUrl(session: Pick<SessionView, 'id' | 'classroomCode'>): string {
    return this.getScannerUrl(new URLSearchParams({
      sessionId: session.id,
      bindToken: createMobileBindToken(session.id)
    }));
  }

  getMobileBindToken(sessionId: string): string {
    return createMobileBindToken(sessionId);
  }

  getScannerUrl(params: URLSearchParams): string {
    return `${SCANNER_BASE_URL.replace(/\/$/, '')}/?${params.toString()}`;
  }

  private async getSessionEntity(sessionId: string): Promise<SessionEntity> {
    const entity = await this.repository.findSessionById(sessionId);
    if (!entity) {
      throw new NotFoundException('课堂活动不存在');
    }
    return entity;
  }

  private async resolveQuestions(questionIds: string[]): Promise<QuestionView[]> {
    const questions: QuestionView[] = [];
    for (const questionId of questionIds) {
      const question = await this.questionsService.findQuestionById(questionId);
      if (!question) {
        throw new NotFoundException(`题目不存在: ${questionId}`);
      }
      questions.push(question);
    }
    return questions;
  }

  private toSessionView(entity: SessionEntity): SessionView {
    return {
      id: entity.id,
      workspaceId: entity.workspaceId,
      teacherUserId: entity.teacherUserId,
      teacherId: entity.teacherId,
      classId: entity.classId,
      title: entity.title,
      mode: entity.mode,
      status: entity.status,
      stage: entity.stage ?? 'binding',
      currentQuestionId: entity.currentQuestionId ?? entity.questionIds[0],
      autoAdvanceAt: entity.autoAdvanceAt?.toISOString(),
      questionIds: entity.questionIds,
      teacherName: entity.teacherName,
      subject: entity.subject,
      classroomCode: entity.classroomCode,
      startedAt: entity.startedAt?.toISOString(),
      endedAt: entity.endedAt?.toISOString(),
      deletedAt: entity.deletedAt?.toISOString(),
      createdAt: entity.createdAt.toISOString()
    };
  }

  private toSessionDetailView(
    entity: SessionEntity,
    questions: QuestionView[]
  ): SessionDetailView {
    return {
      ...this.toSessionView(entity),
      questions
    };
  }
}
