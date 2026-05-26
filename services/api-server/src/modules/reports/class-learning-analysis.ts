import { NotFoundException } from '@nestjs/common';
import { AnswersService } from '../answers/answers.service.js';
import { QuestionParticipantView } from '../answers/models/answer.models.js';
import { ClassesService } from '../classes/classes.service.js';
import { AssessmentRunView } from '../runs/models/run.models.js';
import { RunsService } from '../runs/runs.service.js';
import { SessionsService } from '../sessions/sessions.service.js';
import {
  ClassLearningAnalysisView,
  KnowledgePointAnalysisItem,
  LearningAnalysisRange,
  StudentLearningAnalysisItem
} from './models/report.models.js';
import { isInLearningRange } from './learning-date-range.js';

interface LearningDeps {
  answersService: AnswersService;
  classesService: ClassesService;
  sessionsService: SessionsService;
  runsService?: RunsService;
}

type KnowledgeDraft = { questionCount: number; answeredCount: number; correctCount: number };

export async function buildClassLearningAnalysis(
  classId: string,
  deps: LearningDeps,
  range?: LearningAnalysisRange
): Promise<ClassLearningAnalysisView> {
  const classItem = await deps.classesService.findClassById(classId);
  if (!classItem) throw new NotFoundException('班级不存在');

  const students = await deps.classesService.listStudents(classId, true);
  const sessions = (await deps.sessionsService.listSessions())
    .filter((session) =>
      session.classId === classId &&
      session.status !== 'draft' &&
      isSubjectMatched(session.subject, range?.subject) &&
      isInLearningRange(session.createdAt, range)
    )
    .sort((left, right) => left.createdAt.localeCompare(right.createdAt));
  const studentMap = new Map(students.map((student) => [student.id, {
    studentId: student.id,
    studentNo: student.studentNo,
    displayName: student.displayName,
    answeredCount: 0,
    correctCount: 0,
    totalQuestionCount: 0,
    missedCount: 0,
    correctRate: 0,
    status: '稳定' as const,
    weakKnowledgePoints: [] as string[]
  }]));
  const knowledge = new Map<string, KnowledgeDraft>();
  const recentSessions: ClassLearningAnalysisView['recentSessions'] = [];
  let questionCount = 0, answeredCount = 0, correctCount = 0;

  for (const session of sessions) {
    const detail = await deps.sessionsService.getSession(session.id);
    const items = await listQuestionItems(detail.id, detail.questionIds, deps.runsService);
    let sessionAnswered = 0, sessionCorrect = 0, sessionSlots = 0;
    for (const item of items) {
      const question = detail.questions.find((candidate) => candidate.id === item.questionId);
      if (!question) continue;
      const participants = await deps.answersService.listQuestionParticipants(
        detail.id,
        item.questionId,
        true,
        item.run?.id
      );
      const totals = applyQuestionAnalysis(studentMap, knowledge, participants, question.knowledgePoints);
      questionCount += 1;
      answeredCount += totals.answered;
      correctCount += totals.correct;
      sessionAnswered += totals.answered;
      sessionCorrect += totals.correct;
      sessionSlots += participants.length;
    }
    recentSessions.push({
      sessionId: detail.id,
      title: detail.title,
      subject: detail.subject,
      createdAt: detail.createdAt,
      averageCorrectRate: rate(sessionCorrect, sessionAnswered),
      participationRate: rate(sessionAnswered, sessionSlots)
    });
  }

  const studentItems = finalizeStudents(Array.from(studentMap.values()));
  const knowledgeItems = finalizeKnowledge(knowledge);
  const recentSessionItems = recentSessions.slice().reverse();
  const offset = Math.max(range?.offset ?? 0, 0);
  const limit = Math.max(range?.limit ?? 20, 1);
  return {
    classId,
    className: `${classItem.grade}${classItem.name}`,
    generatedAt: new Date().toISOString(),
    summary: {
      sessionCount: sessions.length,
      questionCount,
      studentCount: students.length,
      answeredCount,
      totalAnswerSlots: questionCount * students.length,
      averageCorrectRate: rate(correctCount, answeredCount),
      participationRate: rate(answeredCount, questionCount * students.length),
      weakKnowledgeCount: knowledgeItems.filter((item) => item.status !== '掌握较好').length,
      attentionStudentCount: studentItems.filter((item) => item.status !== '稳定').length
    },
    knowledgePoints: knowledgeItems,
    students: studentItems,
    recentSessions: recentSessionItems.slice(offset, offset + limit),
    totalRecentSessionCount: recentSessionItems.length,
    aiDiagnosis: createDiagnosis(knowledgeItems, studentItems, answeredCount, correctCount)
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

function applyQuestionAnalysis(
  students: Map<string, StudentLearningAnalysisItem>,
  knowledge: Map<string, KnowledgeDraft>,
  participants: QuestionParticipantView[],
  points: string[]
): { answered: number; correct: number } {
  let answered = 0, correct = 0;
  const names = points.length ? points : ['未标注知识点'];
  participants.forEach((participant) => {
    const student = students.get(participant.studentId);
    if (!student) return;
    student.totalQuestionCount += 1;
    student.answeredCount += participant.answered ? 1 : 0;
    student.correctCount += participant.isCorrect ? 1 : 0;
    student.missedCount += participant.answered ? 0 : 1;
    if (participant.answered && participant.isCorrect === false) student.weakKnowledgePoints.push(...names);
    answered += participant.answered ? 1 : 0;
    correct += participant.isCorrect ? 1 : 0;
  });
  names.forEach((name) => {
    const item = knowledge.get(name) ?? { questionCount: 0, answeredCount: 0, correctCount: 0 };
    item.questionCount += 1;
    item.answeredCount += answered;
    item.correctCount += correct;
    knowledge.set(name, item);
  });
  return { answered, correct };
}

function finalizeKnowledge(knowledge: Map<string, KnowledgeDraft>): KnowledgePointAnalysisItem[] {
  return Array.from(knowledge.entries()).map(([name, item]) => {
    const correctRate = rate(item.correctCount, item.answeredCount);
    const status: KnowledgePointAnalysisItem['status'] =
      correctRate >= 0.8 ? '掌握较好' : correctRate >= 0.6 ? '需要巩固' : '重点讲评';
    return {
      name,
      questionCount: item.questionCount,
      answeredCount: item.answeredCount,
      correctCount: item.correctCount,
      correctRate,
      status
    };
  }).sort((left, right) => left.correctRate - right.correctRate || right.questionCount - left.questionCount);
}

function finalizeStudents(items: StudentLearningAnalysisItem[]): StudentLearningAnalysisItem[] {
  return items.map((item) => {
    const correctRate = rate(item.correctCount, item.answeredCount);
    const participationRate = rate(item.answeredCount, item.totalQuestionCount);
    const status: StudentLearningAnalysisItem['status'] =
      participationRate < 0.7 ? '参与不足' : correctRate < 0.6 ? '需关注' : '稳定';
    return {
      ...item,
      correctRate,
      status,
      weakKnowledgePoints: Array.from(new Set(item.weakKnowledgePoints)).slice(0, 4)
    };
  }).sort((left, right) =>
    Number(left.status === '稳定') - Number(right.status === '稳定') ||
    left.correctRate - right.correctRate ||
    right.missedCount - left.missedCount ||
    left.studentNo.localeCompare(right.studentNo)
  );
}

function createDiagnosis(
  knowledge: KnowledgePointAnalysisItem[],
  students: StudentLearningAnalysisItem[],
  answeredCount: number,
  correctCount: number
): string[] {
  if (!answeredCount) return ['当前班级还没有可分析的答题记录，建议先完成一次课堂扫码。'];
  const weakPoints = knowledge.filter((item) => item.status !== '掌握较好').slice(0, 3);
  const attention = students.filter((item) => item.status !== '稳定').slice(0, 5);
  const diagnosis = [`班级累计正确率为 ${Math.round(rate(correctCount, answeredCount) * 100)}%，可作为后续 AI 诊断的基础口径。`];
  diagnosis.push(weakPoints.length
    ? `优先讲评 ${weakPoints.map((item) => item.name).join('、')}，这些知识点错误更集中。`
    : '暂未发现持续薄弱知识点，可以安排少量迁移题保持手感。');
  diagnosis.push(attention.length
    ? `需要关注 ${attention.map((item) => item.displayName).join('、')}，建议结合错题记录做个别辅导。`
    : '学生整体参与和正确率较稳定，课后复盘可聚焦少数高频错题。');
  return diagnosis;
}

function rate(numerator: number, denominator: number): number {
  return denominator ? Number((numerator / denominator).toFixed(3)) : 0;
}
