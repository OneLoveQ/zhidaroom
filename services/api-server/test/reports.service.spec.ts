import { describe, expect, it } from 'vitest';
import { AnswersService } from '../src/modules/answers/answers.service.js';
import { InMemoryAnswersRepository } from '../src/modules/answers/repositories/in-memory-answers.repository.js';
import { ClassesService } from '../src/modules/classes/classes.service.js';
import { InMemoryClassesRepository } from '../src/modules/classes/repositories/in-memory-classes.repository.js';
import { QuestionsService } from '../src/modules/questions/questions.service.js';
import { InMemoryQuestionsRepository } from '../src/modules/questions/repositories/in-memory-questions.repository.js';
import { ReportsService } from '../src/modules/reports/reports.service.js';
import { InMemorySessionsRepository } from '../src/modules/sessions/repositories/in-memory-sessions.repository.js';
import { SessionsService } from '../src/modules/sessions/sessions.service.js';

async function prepareReportService(): Promise<{
  answersService: AnswersService;
  reportsService: ReportsService;
  questionIds: string[];
  sessionId: string;
  classId: string;
}> {
  const classesService = new ClassesService(new InMemoryClassesRepository());
  const questionsService = new QuestionsService(new InMemoryQuestionsRepository());
  const sessionsService = new SessionsService(
    new InMemorySessionsRepository(),
    classesService,
    questionsService
  );
  const answersService = new AnswersService(
    new InMemoryAnswersRepository(),
    sessionsService,
    classesService,
    questionsService
  );
  const reportsService = new ReportsService(sessionsService, answersService, classesService);
  const createdClass = await classesService.createClass({ grade: '七年级', name: '1班' });

  await classesService.importStudents(createdClass.id, {
    students: [
      { studentNo: '20260101', name: '张三', cardCode: 'C001' },
      { studentNo: '20260102', name: '李四', cardCode: 'C002' }
    ]
  });
  const firstQuestion = await questionsService.createQuestion({
    subject: '数学',
    grade: '七年级',
    stem: '测试题',
    options: { A: '选项A', B: '选项B', C: '选项C', D: '选项D' },
    answer: 'C',
    explanation: '解析',
    knowledgePoints: ['测试知识点'],
    difficulty: '基础'
  });
  const secondQuestion = await questionsService.createQuestion({
    subject: '数学',
    grade: '七年级',
    stem: '第二题',
    options: { A: '选项A', B: '选项B', C: '选项C', D: '选项D' },
    answer: 'A',
    explanation: '第二题解析',
    knowledgePoints: ['测试知识点'],
    difficulty: '基础'
  });
  const session = await sessionsService.createSession({
    classId: createdClass.id,
    title: '出口检测',
    mode: 'exit_ticket',
    questionIds: [firstQuestion.id, secondQuestion.id]
  });

  return {
    answersService,
    reportsService,
    questionIds: [firstQuestion.id, secondQuestion.id],
    sessionId: (await sessionsService.startSession(session.id)).id,
    classId: createdClass.id
  };
}

describe('ReportsService', () => {
  it('基于答题统计生成课堂报告', async () => {
    const { answersService, reportsService, questionIds, sessionId } =
      await prepareReportService();

    await answersService.submitBatch(sessionId, {
      questionId: questionIds[0]!,
      deviceId: 'simulator_001',
      answers: [
        {
          cardCode: 'C001',
          selectedOption: 'C',
          recognitionScore: 0.98,
          recognizedAt: '2026-05-14T10:20:30+08:00'
        },
        {
          cardCode: 'C002',
          selectedOption: 'A',
          recognitionScore: 0.96,
          recognizedAt: '2026-05-14T10:20:31+08:00'
        }
      ]
    });
    await answersService.submitBatch(sessionId, {
      questionId: questionIds[1]!,
      deviceId: 'simulator_001',
      answers: [
        {
          cardCode: 'C001',
          selectedOption: 'A',
          recognitionScore: 0.98,
          recognizedAt: '2026-05-14T10:21:30+08:00'
        }
      ]
    });

    const report = await reportsService.getSessionReport(sessionId);

    expect(report.questionCount).toBe(2);
    expect(report.averageCorrectRate).toBe(0.75);
    expect(report.aiNotice).toContain('教师审核');
    expect(report.questions[0]?.teachingSuggestion).toContain('集中错误选项');
    expect(report.questions[0]?.explanation).toBe('解析');
    expect(report.studentRankings).toMatchObject([
      { displayName: '张三', correctCount: 2, correctRate: 1 },
      { displayName: '李四', correctCount: 0, correctRate: 0 }
    ]);
  });

  it('汇总班级长期学情和学生关注名单', async () => {
    const { answersService, reportsService, questionIds, sessionId, classId } =
      await prepareReportService();

    await answersService.submitBatch(sessionId, {
      questionId: questionIds[0]!,
      deviceId: 'simulator_001',
      answers: [
        {
          cardCode: 'C001',
          selectedOption: 'C',
          recognitionScore: 0.98,
          recognizedAt: '2026-05-14T10:20:30+08:00'
        },
        {
          cardCode: 'C002',
          selectedOption: 'A',
          recognitionScore: 0.96,
          recognizedAt: '2026-05-14T10:20:31+08:00'
        }
      ]
    });

    const analysis = await reportsService.getClassLearningAnalysis(classId);

    expect(analysis.summary).toMatchObject({
      sessionCount: 1,
      questionCount: 2,
      studentCount: 2,
      answeredCount: 2,
      totalAnswerSlots: 4,
      averageCorrectRate: 0.5,
      participationRate: 0.5,
      attentionStudentCount: 2
    });
    expect(analysis.knowledgePoints[0]).toMatchObject({
      name: '测试知识点',
      status: '重点讲评'
    });
    expect(analysis.students[0]?.displayName).toBe('李四');
    expect(analysis.aiDiagnosis.join('')).toContain('优先讲评');
  });

  it('生成单个学生的答题诊断详情', async () => {
    const { answersService, reportsService, questionIds, sessionId, classId } =
      await prepareReportService();

    await answersService.submitBatch(sessionId, {
      questionId: questionIds[0]!,
      deviceId: 'simulator_001',
      answers: [
        {
          cardCode: 'C001',
          selectedOption: 'A',
          recognitionScore: 0.98,
          recognizedAt: '2026-05-14T10:20:30+08:00'
        }
      ]
    });
    const classAnalysis = await reportsService.getClassLearningAnalysis(classId);
    const studentId = classAnalysis.students.find((item) => item.displayName === '张三')!.studentId;

    const detail = await reportsService.getStudentLearningAnalysis(classId, studentId);

    expect(detail.summary).toMatchObject({
      totalQuestionCount: 2,
      answeredCount: 1,
      correctCount: 0,
      missedCount: 1,
      correctRate: 0,
      participationRate: 0.5
    });
    expect(detail.weakKnowledgePoints[0]).toMatchObject({
      name: '测试知识点',
      wrongCount: 1
    });
    expect(detail.recentAnswers).toHaveLength(2);
    expect(detail.aiDiagnosis.join('')).toContain('张三');
  });

  it('支持按日期范围筛选班级和学生学情', async () => {
    const { answersService, reportsService, questionIds, sessionId, classId } =
      await prepareReportService();

    await answersService.submitBatch(sessionId, {
      questionId: questionIds[0]!,
      deviceId: 'simulator_001',
      answers: [
        {
          cardCode: 'C001',
          selectedOption: 'C',
          recognitionScore: 0.98,
          recognizedAt: '2026-05-14T10:20:30+08:00'
        }
      ]
    });
    const full = await reportsService.getClassLearningAnalysis(classId);
    const studentId = full.students[0]!.studentId;

    const emptyClass = await reportsService.getClassLearningAnalysis(classId, { from: '2099-01-01' });
    const emptyStudent = await reportsService.getStudentLearningAnalysis(classId, studentId, { from: '2099-01-01' });

    expect(full.summary.questionCount).toBe(2);
    expect(emptyClass.summary.questionCount).toBe(0);
    expect(emptyClass.summary.answeredCount).toBe(0);
    expect(emptyStudent.summary.totalQuestionCount).toBe(0);
    expect(emptyStudent.recentAnswers).toHaveLength(0);
  });
});
