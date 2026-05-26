import { NotFoundException } from '@nestjs/common';
import { AnswersService } from '../answers/answers.service.js';
import { ClassesService } from '../classes/classes.service.js';
import { AssessmentRunView } from '../runs/models/run.models.js';
import { RunsService } from '../runs/runs.service.js';
import { SessionsService } from '../sessions/sessions.service.js';
import {
  LearningAnalysisRange,
  StudentLearningDetailView,
  StudentRecentAnswerItem,
  StudentWeakKnowledgeItem
} from './models/report.models.js';
import { isInLearningRange } from './learning-date-range.js';

interface LearningDeps {
  answersService: AnswersService;
  classesService: ClassesService;
  sessionsService: SessionsService;
  runsService?: RunsService;
}

type KnowledgeDraft = { totalCount: number; wrongCount: number; correctCount: number };

export async function buildStudentLearningAnalysis(
  classId: string,
  studentId: string,
  deps: LearningDeps,
  range?: LearningAnalysisRange
): Promise<StudentLearningDetailView> {
  const classItem = await deps.classesService.findClassById(classId);
  if (!classItem) throw new NotFoundException('班级不存在');
  const student = (await deps.classesService.listStudents(classId, true))
    .find((item) => item.id === studentId);
  if (!student) throw new NotFoundException('学生不存在');

  const sessions = (await deps.sessionsService.listSessions())
    .filter((session) =>
      session.classId === classId &&
      session.status !== 'draft' &&
      isSubjectMatched(session.subject, range?.subject) &&
      isInLearningRange(session.createdAt, range)
    )
    .sort((left, right) => left.createdAt.localeCompare(right.createdAt));
  const knowledge = new Map<string, KnowledgeDraft>();
  const recentAnswers: StudentRecentAnswerItem[] = [];
  let totalQuestionCount = 0, answeredCount = 0, correctCount = 0, missedCount = 0;

  for (const session of sessions) {
    const detail = await deps.sessionsService.getSession(session.id);
    const items = await listQuestionItems(detail.id, detail.questionIds, deps.runsService);
    for (const item of items) {
      const question = detail.questions.find((candidate) => candidate.id === item.questionId);
      if (!question) continue;
      const participant = (await deps.answersService.listQuestionParticipants(
        detail.id,
        item.questionId,
        true,
        item.run?.id
      )).find((candidate) => candidate.studentId === studentId);
      if (!participant) continue;
      totalQuestionCount += 1;
      answeredCount += participant.answered ? 1 : 0;
      correctCount += participant.isCorrect ? 1 : 0;
      missedCount += participant.answered ? 0 : 1;
      collectKnowledge(knowledge, question.knowledgePoints, participant.answered, Boolean(participant.isCorrect));
      recentAnswers.push({
        sessionId: detail.id,
        sessionTitle: detail.title,
        questionId: question.id,
        stem: question.stem,
        answer: question.answer,
        selectedOption: participant.selectedOption,
        answered: participant.answered,
        isCorrect: participant.isCorrect,
        knowledgePoints: question.knowledgePoints,
        createdAt: detail.createdAt
      });
    }
  }

  const weakPoints = finalizeKnowledge(knowledge);
  return {
    classId,
    className: `${classItem.grade}${classItem.name}`,
    studentId: student.id,
    studentNo: student.studentNo,
    displayName: student.displayName,
    generatedAt: new Date().toISOString(),
    summary: {
      sessionCount: sessions.length,
      totalQuestionCount,
      answeredCount,
      correctCount,
      missedCount,
      correctRate: rate(correctCount, answeredCount),
      participationRate: rate(answeredCount, totalQuestionCount),
      latestSessionAt: sessions.at(-1)?.createdAt
    },
    weakKnowledgePoints: weakPoints,
    recentAnswers: recentAnswers.reverse(),
    aiDiagnosis: createDiagnosis(student.displayName, weakPoints, totalQuestionCount, answeredCount, correctCount)
  };
}

function isSubjectMatched(sessionSubject?: string, subject?: string): boolean {
  if (!subject || subject === '全部') return true;
  return sessionSubject === subject;
}

async function listQuestionItems(
  sessionId: string,
  questionIds: string[],
  runsService?: RunsService
): Promise<Array<{ run?: AssessmentRunView; questionId: string }>> {
  const runs = (await runsService?.listRuns(sessionId))?.filter((run) => run.status === 'completed') ?? [];
  return runs.length
    ? runs.flatMap((run) => run.questionIds.map((questionId) => ({ run, questionId })))
    : questionIds.map((questionId) => ({ questionId }));
}

function collectKnowledge(
  knowledge: Map<string, KnowledgeDraft>,
  points: string[],
  answered: boolean,
  correct: boolean
): void {
  const names = points.length ? points : ['未标注知识点'];
  names.forEach((name) => {
    const item = knowledge.get(name) ?? { totalCount: 0, wrongCount: 0, correctCount: 0 };
    item.totalCount += 1;
    item.correctCount += correct ? 1 : 0;
    item.wrongCount += answered && !correct ? 1 : 0;
    knowledge.set(name, item);
  });
}

function finalizeKnowledge(knowledge: Map<string, KnowledgeDraft>): StudentWeakKnowledgeItem[] {
  return Array.from(knowledge.entries()).map(([name, item]) => ({
    name,
    totalCount: item.totalCount,
    wrongCount: item.wrongCount,
    correctRate: rate(item.correctCount, item.totalCount)
  })).filter((item) => item.wrongCount > 0)
    .sort((left, right) => right.wrongCount - left.wrongCount || left.correctRate - right.correctRate)
    .slice(0, 8);
}

function createDiagnosis(
  name: string,
  weakPoints: StudentWeakKnowledgeItem[],
  totalQuestionCount: number,
  answeredCount: number,
  correctCount: number
): string[] {
  if (!totalQuestionCount) return [`${name} 暂无可分析的课堂答题记录。`];
  const diagnosis = [`${name} 累计参与 ${answeredCount}/${totalQuestionCount} 题，正确率 ${Math.round(rate(correctCount, answeredCount) * 100)}%。`];
  diagnosis.push(weakPoints.length
    ? `主要薄弱点集中在 ${weakPoints.slice(0, 3).map((item) => item.name).join('、')}。`
    : '当前未发现持续薄弱知识点，可以继续观察后续课堂表现。');
  diagnosis.push(rate(answeredCount, totalQuestionCount) < 0.7
    ? '参与率偏低，建议先确认是否存在漏扫、请假或座位扫码覆盖问题。'
    : '参与情况基本稳定，可结合错题做短时个别反馈。');
  return diagnosis;
}

function rate(numerator: number, denominator: number): number {
  return denominator ? Number((numerator / denominator).toFixed(3)) : 0;
}
