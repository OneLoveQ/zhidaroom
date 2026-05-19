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
  const reportsService = new ReportsService(sessionsService, answersService);
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
    sessionId: (await sessionsService.startSession(session.id)).id
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
});
