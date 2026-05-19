import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
  Optional
} from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { ClassesService } from '../classes/classes.service.js';
import { QuestionsService } from '../questions/questions.service.js';
import { SessionsService } from '../sessions/sessions.service.js';
import { RunsService } from '../runs/runs.service.js';
import { BatchAnswersDto } from './dto/batch-answers.dto.js';
import {
  AnswerBatchResult,
  AnswerEntity,
  AnswersRepository,
  QuestionParticipantView,
  QuestionStatsView,
  SessionLiveStateView
} from './models/answer.models.js';

@Injectable()
export class AnswersService {
  constructor(
    @Inject('AnswersRepository')
    private readonly repository: AnswersRepository,
    private readonly sessionsService: SessionsService,
    private readonly classesService: ClassesService,
    private readonly questionsService: QuestionsService,
    @Optional()
    private readonly runsService?: RunsService
  ) {}

  async submitBatch(sessionId: string, dto: BatchAnswersDto): Promise<AnswerBatchResult> {
    const session = await this.sessionsService.findSession(sessionId);
    if (!session) {
      throw new NotFoundException('课堂活动不存在');
    }
    if (session.status !== 'active') {
      throw new BadRequestException('只有进行中的课堂活动可以提交答题结果');
    }
    const run = dto.runId ? await this.runsService?.findRun(dto.runId) : undefined;
    const allowedQuestionIds = run?.questionIds ?? session.questionIds;
    if (run && run.sessionId !== sessionId) {
      throw new BadRequestException('评测不属于当前课堂');
    }
    if (!allowedQuestionIds.includes(dto.questionId)) {
      throw new BadRequestException('题目不属于当前课堂活动');
    }

    const question = await this.questionsService.findQuestionById(dto.questionId);
    if (!question) {
      throw new NotFoundException('题目不存在');
    }

    const errors: AnswerBatchResult['errors'] = [];
    const accepted: AnswerEntity[] = [];

    for (const [index, item] of dto.answers.entries()) {
      const rowNo = index + 1;
      const student = await this.classesService.findStudentByCard(
        session.classId,
        item.cardCode
      );
      if (!student) {
        errors.push({ rowNo, cardCode: item.cardCode, message: '答题卡未绑定到本班学生' });
        continue;
      }

      accepted.push({
        id: randomUUID(),
        runId: dto.runId,
        sessionId,
        questionId: dto.questionId,
        studentId: student.id,
        cardCode: item.cardCode,
        selectedOption: item.selectedOption,
        isCorrect: item.selectedOption === question.answer,
        recognizedAt: new Date(item.recognizedAt),
        recognitionScore: item.recognitionScore,
        deviceId: dto.deviceId
      });
    }

    await this.repository.upsertAnswers(accepted);
    await this.markCompleteWhenAllAnswered(sessionId, dto.questionId, dto.runId);

    return {
      acceptedCount: accepted.length,
      failedCount: errors.length,
      errors
    };
  }

  async getQuestionStats(
    sessionId: string,
    questionId: string,
    runId?: string
  ): Promise<QuestionStatsView> {
    const session = await this.sessionsService.findSession(sessionId);
    if (!session) {
      throw new NotFoundException('课堂活动不存在');
    }
    const allowedQuestionIds = runId
      ? (await this.runsService?.findRun(runId))?.questionIds
      : session.questionIds;
    if (!allowedQuestionIds?.includes(questionId)) {
      throw new BadRequestException('题目不属于当前课堂活动');
    }

    const total = (await this.classesService.listStudents(session.classId)).length;
    const answers = await this.repository.listAnswers(sessionId, questionId, runId);
    const optionStats = { A: 0, B: 0, C: 0, D: 0 };
    let correctCount = 0;

    answers.forEach((answer) => {
      optionStats[answer.selectedOption] += 1;
      if (answer.isCorrect) {
        correctCount += 1;
      }
    });

    const answered = answers.length;
    return {
      total,
      answered,
      unanswered: Math.max(total - answered, 0),
      optionStats,
      correctRate: answered === 0 ? 0 : Number((correctCount / answered).toFixed(3))
    };
  }

  async listQuestionParticipants(
    sessionId: string,
    questionId: string,
    showRealNames = false,
    runId?: string
  ): Promise<QuestionParticipantView[]> {
    const session = await this.sessionsService.findSession(sessionId);
    if (!session) {
      throw new NotFoundException('课堂活动不存在');
    }
    const allowedQuestionIds = runId
      ? (await this.runsService?.findRun(runId))?.questionIds
      : session.questionIds;
    if (!allowedQuestionIds?.includes(questionId)) {
      throw new BadRequestException('题目不属于当前课堂活动');
    }

    const answerByStudentId = new Map(
      (await this.repository.listAnswers(sessionId, questionId, runId)).map((answer) => [
        answer.studentId,
        answer
      ])
    );

    return (await this.classesService.listStudents(session.classId, showRealNames)).map((student) => {
      const answer = answerByStudentId.get(student.id);
      return {
        studentId: student.id,
        studentNo: student.studentNo,
        displayName: student.displayName,
        cardCode: student.cardCode,
        answered: Boolean(answer),
        selectedOption: answer?.selectedOption,
        isCorrect: answer?.isCorrect,
        recognizedAt: answer?.recognizedAt.toISOString()
      };
    });
  }

  async getLiveState(
    sessionId: string,
    showRealNames = false
  ): Promise<SessionLiveStateView> {
    let session = await this.sessionsService.findSession(sessionId);
    if (!session) throw new NotFoundException('课堂活动不存在');
    const currentRun =
      (await this.runsService?.applyAutoAdvance(sessionId)) ??
      (await this.runsService?.getCurrentRun(sessionId));
    session = currentRun ? await this.sessionsService.getSession(sessionId) : await this.sessionsService.applyAutoAdvance(sessionId);
    const currentQuestionId = currentRun?.currentQuestionId ?? session.currentQuestionId;
    const currentQuestion = session.questions.find(
      (item) => item.id === currentQuestionId
    ) ?? session.questions[0];
    const [stats, participants] = await Promise.all([
      this.getQuestionStats(session.id, currentQuestion.id, currentRun?.id),
      this.listQuestionParticipants(session.id, currentQuestion.id, showRealNames, currentRun?.id)
    ]);
    return {
      session,
      activeRun: currentRun,
      stage: session.stage === 'session_report'
        ? 'session_report'
        : currentRun?.stage === 'result' ? 'question_result' : session.stage,
      currentQuestion,
      stats,
      participants,
      mobileBindUrl: this.sessionsService.getMobileBindUrl(session),
      autoAdvanceAt: session.autoAdvanceAt
    };
  }

  private async markCompleteWhenAllAnswered(
    sessionId: string,
    questionId: string,
    runId?: string
  ): Promise<void> {
    const stats = await this.getQuestionStats(sessionId, questionId, runId);
    if (stats.total > 0 && stats.answered >= stats.total) {
      if (runId) {
        await this.runsService?.advanceAfterQuestionComplete(sessionId, runId, questionId);
      } else {
        await this.sessionsService.markQuestionCompleteIfCurrent(sessionId, questionId);
      }
    }
  }
}
