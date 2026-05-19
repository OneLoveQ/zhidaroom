import { describe, expect, it, vi } from 'vitest';
import { AnswersService } from '../src/modules/answers/answers.service.js';
import { InMemoryAnswersRepository } from '../src/modules/answers/repositories/in-memory-answers.repository.js';
import { ClassesService } from '../src/modules/classes/classes.service.js';
import { InMemoryClassesRepository } from '../src/modules/classes/repositories/in-memory-classes.repository.js';
import { QuestionsService } from '../src/modules/questions/questions.service.js';
import { InMemoryQuestionsRepository } from '../src/modules/questions/repositories/in-memory-questions.repository.js';
import { ReportsService } from '../src/modules/reports/reports.service.js';
import { InMemoryRunsRepository } from '../src/modules/runs/repositories/in-memory-runs.repository.js';
import { RunsService } from '../src/modules/runs/runs.service.js';
import { InMemorySessionsRepository } from '../src/modules/sessions/repositories/in-memory-sessions.repository.js';
import { SessionsService } from '../src/modules/sessions/sessions.service.js';

async function prepareServices() {
  const classesService = new ClassesService(new InMemoryClassesRepository());
  const questionsService = new QuestionsService(new InMemoryQuestionsRepository());
  const sessionsService = new SessionsService(new InMemorySessionsRepository(), classesService, questionsService);
  const runsService = new RunsService(new InMemoryRunsRepository(), sessionsService, questionsService);
  const answersService = new AnswersService(
    new InMemoryAnswersRepository(),
    sessionsService,
    classesService,
    questionsService,
    runsService
  );
  const reportsService = new ReportsService(sessionsService, answersService, runsService);
  const classView = await classesService.createClass({ grade: '一年级', name: '1班' });
  await classesService.importStudents(classView.id, {
    students: [
      { studentNo: '1001', name: '学生甲', cardCode: 'C001' },
      { studentNo: '1002', name: '学生乙', cardCode: 'C002' }
    ]
  });
  const questions = await Promise.all(['第一题', '第二题', '第三题'].map((stem, index) =>
    questionsService.createQuestion({
      subject: '数学',
      grade: '一年级',
      stem,
      options: { A: '选项A', B: '选项B', C: '选项C', D: '选项D' },
      answer: index === 1 ? 'B' : 'A',
      explanation: `${stem}解析`,
      knowledgePoints: ['测试知识点'],
      difficulty: '基础'
    })
  ));
  const session = await sessionsService.createSession({
    classId: classView.id,
    title: '多次评测课堂',
    mode: 'exit_ticket',
    questionIds: [questions[0]!.id]
  });
  return {
    answersService,
    reportsService,
    runsService,
    questions,
    session: await sessionsService.startSession(session.id)
  };
}

describe('RunsService', () => {
  it('创建新评测时把题目并入课堂并切换当前 active run', async () => {
    const { runsService, questions, session } = await prepareServices();
    const first = await runsService.createRun(session.id, {
      title: '课前检测',
      type: 'exit_ticket',
      questionIds: [questions[0]!.id]
    });
    const second = await runsService.createRun(session.id, {
      title: '随堂练习',
      type: 'exit_ticket',
      questionIds: [questions[1]!.id, questions[2]!.id]
    });

    await runsService.startRun(session.id, first.id);
    await runsService.startRun(session.id, second.id);
    const runs = await runsService.listRuns(session.id);

    expect(runs.map((item) => item.status)).toEqual(['completed', 'active']);
    expect(runs[1]?.currentQuestionId).toBe(questions[1]!.id);
  });

  it('按评测隔离答案，并在课堂报告中累计多个已完成评测', async () => {
    const { answersService, reportsService, runsService, questions, session } = await prepareServices();
    const first = await runsService.createRun(session.id, {
      title: '课前检测',
      type: 'exit_ticket',
      questionIds: [questions[0]!.id]
    });
    const second = await runsService.createRun(session.id, {
      title: '随堂练习',
      type: 'exit_ticket',
      questionIds: [questions[1]!.id]
    });

    await runsService.startRun(session.id, first.id);
    await answersService.submitBatch(session.id, {
      runId: first.id,
      questionId: questions[0]!.id,
      deviceId: 'test',
      answers: [
        { cardCode: 'C001', selectedOption: 'A', recognitionScore: 0.99, recognizedAt: '2026-05-18T10:00:00+08:00' },
        { cardCode: 'C002', selectedOption: 'C', recognitionScore: 0.99, recognizedAt: '2026-05-18T10:00:01+08:00' }
      ]
    });
    await runsService.completeRun(session.id, first.id);
    await runsService.startRun(session.id, second.id);
    await answersService.submitBatch(session.id, {
      runId: second.id,
      questionId: questions[1]!.id,
      deviceId: 'test',
      answers: [
        { cardCode: 'C001', selectedOption: 'B', recognitionScore: 0.99, recognizedAt: '2026-05-18T10:01:00+08:00' },
        { cardCode: 'C002', selectedOption: 'B', recognitionScore: 0.99, recognizedAt: '2026-05-18T10:01:01+08:00' }
      ]
    });
    await runsService.completeRun(session.id, second.id);
    const report = await reportsService.getSessionReport(session.id);

    expect(report.questionCount).toBe(2);
    expect(report.questions.map((item) => item.runTitle)).toEqual(['课前检测', '随堂练习']);
    expect(report.averageCorrectRate).toBe(0.75);
    expect(report.studentRankings).toMatchObject([
      { displayName: '学生甲', correctCount: 2, correctRate: 1 },
      { displayName: '学生乙', correctCount: 1, correctRate: 0.5 }
    ]);
  });

  it('一轮多题收齐后先提示下一题，再自动切到下一题，最后一题完成本轮', async () => {
    vi.useFakeTimers();
    const { answersService, runsService, questions, session } = await prepareServices();
    const run = await runsService.createRun(session.id, {
      title: '随堂两题',
      type: 'exit_ticket',
      questionIds: [questions[0]!.id, questions[1]!.id]
    });
    await runsService.startRun(session.id, run.id);
    await answersService.submitBatch(session.id, {
      runId: run.id,
      questionId: questions[0]!.id,
      deviceId: 'test',
      answers: [
        { cardCode: 'C001', selectedOption: 'A', recognitionScore: 0.99, recognizedAt: '2026-05-18T10:00:00+08:00' },
        { cardCode: 'C002', selectedOption: 'A', recognitionScore: 0.99, recognizedAt: '2026-05-18T10:00:01+08:00' }
      ]
    });
    const waitingNext = await runsService.findRun(run.id);
    vi.setSystemTime(new Date(Date.now() + 4000));
    const advanced = await runsService.applyAutoAdvance(session.id);
    await answersService.submitBatch(session.id, {
      runId: run.id,
      questionId: questions[1]!.id,
      deviceId: 'test',
      answers: [
        { cardCode: 'C001', selectedOption: 'B', recognitionScore: 0.99, recognizedAt: '2026-05-18T10:01:00+08:00' },
        { cardCode: 'C002', selectedOption: 'B', recognitionScore: 0.99, recognizedAt: '2026-05-18T10:01:01+08:00' }
      ]
    });
    const completed = await runsService.findRun(run.id);

    expect(waitingNext).toMatchObject({ status: 'active', stage: 'question_complete', currentQuestionId: questions[0]!.id });
    expect(advanced).toMatchObject({ status: 'active', stage: 'scanning', currentQuestionId: questions[1]!.id });
    expect(completed).toMatchObject({ status: 'completed', stage: 'result' });
    vi.useRealTimers();
  });

  it('支持老师在未全员作答时手动完成当前题搜集', async () => {
    const { runsService, questions, session } = await prepareServices();
    const run = await runsService.createRun(session.id, {
      title: '有人请假的测试',
      type: 'exit_ticket',
      questionIds: [questions[0]!.id, questions[1]!.id]
    });

    await runsService.startRun(session.id, run.id);
    const waitingNext = await runsService.finishQuestion(session.id, run.id, questions[0]!.id);

    expect(waitingNext).toMatchObject({
      status: 'active',
      stage: 'question_complete',
      currentQuestionId: questions[0]!.id
    });
  });
});
