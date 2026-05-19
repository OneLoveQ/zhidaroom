import { Injectable, NotFoundException, Optional } from '@nestjs/common';
import { AnswersService } from '../answers/answers.service.js';
import { AssessmentRunView } from '../runs/models/run.models.js';
import { RunsService } from '../runs/runs.service.js';
import { SessionsService } from '../sessions/sessions.service.js';
import {
  QuestionReportItem,
  SessionReportView,
  StudentRankingItem
} from './models/report.models.js';

@Injectable()
export class ReportsService {
  constructor(
    private readonly sessionsService: SessionsService,
    private readonly answersService: AnswersService,
    @Optional()
    private readonly runsService?: RunsService
  ) {}

  async getSessionReport(sessionId: string): Promise<SessionReportView> {
    const session = await this.sessionsService.findSession(sessionId);
    if (!session) {
      throw new NotFoundException('课堂活动不存在');
    }

    const runs = await this.listReportRuns(sessionId);
    const items = runs.length
      ? runs.flatMap((run) => run.questionIds.map((questionId) => ({ run, questionId })))
      : session.questionIds.map((questionId) => ({ run: undefined, questionId }));
    const questionReports: QuestionReportItem[] = [];
    for (const item of items) {
      const question = session.questions.find((candidate) => candidate.id === item.questionId);
      if (!question) continue;
      const stats = await this.answersService.getQuestionStats(sessionId, question.id, item.run?.id);
      const participants = await this.answersService.listQuestionParticipants(
        sessionId,
        question.id,
        true,
        item.run?.id
      );
      const diagnosis = this.createQuestionDiagnosis(stats.correctRate);
      questionReports.push({
        questionId: question.id,
        runId: item.run?.id,
        runTitle: item.run?.title,
        stem: question.stem,
        options: question.options,
        answer: question.answer,
        explanation: question.explanation,
        knowledgePoints: question.knowledgePoints,
        difficulty: question.difficulty,
        stats,
        misconception: diagnosis.misconception,
        evidence: this.createEvidence(stats),
        teachingSuggestion: diagnosis.teachingSuggestion,
        followUpAction: diagnosis.followUpAction,
        wrongAnswers: participants
          .filter((student) => student.answered && student.isCorrect === false && student.selectedOption)
          .map((student) => ({
            studentId: student.studentId,
            studentNo: student.studentNo,
            displayName: student.displayName,
            cardCode: student.cardCode,
            selectedOption: student.selectedOption as 'A' | 'B' | 'C' | 'D'
          }))
          .sort((left, right) =>
            left.selectedOption.localeCompare(right.selectedOption) ||
            left.studentNo.localeCompare(right.studentNo)
          )
      });
    }

    return {
      sessionId: session.id,
      title: session.title,
      mode: session.mode,
      status: session.status,
      questionCount: questionReports.length,
      averageCorrectRate: this.calculateAverageCorrectRate(questionReports),
      generatedAt: new Date().toISOString(),
      aiNotice: 'AI 生成内容需教师审核后使用。当前报告为规则生成的基础报告。',
      studentRankings: await this.createStudentRankings(sessionId, items),
      questions: questionReports
    };
  }

  private async listReportRuns(sessionId: string): Promise<AssessmentRunView[]> {
    return (await this.runsService?.listRuns(sessionId))?.filter((run) => run.status === 'completed') ?? [];
  }

  private calculateAverageCorrectRate(items: QuestionReportItem[]): number {
    if (items.length === 0) {
      return 0;
    }
    const total = items.reduce((sum, item) => sum + item.stats.correctRate, 0);
    return Number((total / items.length).toFixed(3));
  }

  private createQuestionDiagnosis(correctRate: number): {
    misconception: string;
    teachingSuggestion: string;
    followUpAction: string;
  } {
    if (correctRate >= 0.9) {
      return {
        misconception: '暂未发现明显共性错因。',
        teachingSuggestion: '全班掌握较好，可快速讲评后进入下一环节。',
        followUpAction: '安排 1 道提升题，检查学生能否迁移应用。'
      };
    }
    if (correctRate >= 0.7) {
      return {
        misconception: '少量学生可能对关键条件理解不稳。',
        teachingSuggestion: '多数学生已掌握，建议请学生说明理由并巩固关键点。',
        followUpAction: '对错误学生补充 1 道同类基础题。'
      };
    }
    if (correctRate >= 0.5) {
      return {
        misconception: '学生理解存在分化，可能混淆题目中的限制条件。',
        teachingSuggestion: '存在明显分化，建议针对集中错误选项进行讲评。',
        followUpAction: '用 2 道变式题区分相近概念。'
      };
    }
    return {
      misconception: '多数学生尚未建立核心概念，可能依赖记忆而非理解。',
      teachingSuggestion: '掌握情况偏弱，建议暂停推进，重新讲解核心概念并补充变式练习。',
      followUpAction: '回到例题讲解，并安排分层订正。'
    };
  }

  private createEvidence(stats: QuestionReportItem['stats']): string {
    return `已答 ${stats.answered}/${stats.total}，正确率 ${Math.round(stats.correctRate * 100)}%，未答 ${stats.unanswered}。`;
  }

  private async createStudentRankings(
    sessionId: string,
    items: Array<{ run?: AssessmentRunView; questionId: string }>
  ): Promise<StudentRankingItem[]> {
    const session = await this.sessionsService.findSession(sessionId);
    if (!session) {
      throw new NotFoundException('课堂活动不存在');
    }
    const rankings = new Map<string, StudentRankingItem>();
    for (const itemRef of items) {
      const question = session.questions.find((item) => item.id === itemRef.questionId);
      if (!question) continue;
      const participants = await this.answersService.listQuestionParticipants(
        sessionId,
        itemRef.questionId,
        true,
        itemRef.run?.id
      );
      participants.forEach((student) => {
        const item = rankings.get(student.studentId) ?? {
          studentId: student.studentId,
          studentNo: student.studentNo,
          displayName: student.displayName,
          cardCode: student.cardCode,
          answeredCount: 0,
          correctCount: 0,
          totalQuestionCount: items.length,
          correctRate: 0,
          answers: []
        };
        item.answeredCount += student.answered ? 1 : 0;
        item.correctCount += student.isCorrect ? 1 : 0;
        item.answers.push({
          questionId: question.id,
          runId: itemRef.run?.id,
          runTitle: itemRef.run?.title,
          stem: question.stem,
          answer: question.answer,
          selectedOption: student.selectedOption,
          answered: student.answered,
          isCorrect: student.isCorrect
        });
        rankings.set(student.studentId, item);
      });
    }
    return Array.from(rankings.values())
      .map((item) => ({
        ...item,
        correctRate: items.length ? Number((item.correctCount / items.length).toFixed(3)) : 0
      }))
      .sort((left, right) =>
        right.correctRate - left.correctRate ||
        right.answeredCount - left.answeredCount ||
        left.studentNo.localeCompare(right.studentNo)
      );
  }
}
