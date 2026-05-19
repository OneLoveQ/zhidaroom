import { BadRequestException } from '@nestjs/common';
import { describe, expect, it } from 'vitest';
import { AnswersService } from '../src/modules/answers/answers.service.js';
import { InMemoryAnswersRepository } from '../src/modules/answers/repositories/in-memory-answers.repository.js';
import { ClassesService } from '../src/modules/classes/classes.service.js';
import { InMemoryClassesRepository } from '../src/modules/classes/repositories/in-memory-classes.repository.js';
import { QuestionsService } from '../src/modules/questions/questions.service.js';
import { InMemoryQuestionsRepository } from '../src/modules/questions/repositories/in-memory-questions.repository.js';
import { InMemorySessionsRepository } from '../src/modules/sessions/repositories/in-memory-sessions.repository.js';
import { SessionsService } from '../src/modules/sessions/sessions.service.js';

function createServices(): {
  answersService: AnswersService;
  classesService: ClassesService;
  questionsService: QuestionsService;
  sessionsService: SessionsService;
} {
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

  return { answersService, classesService, questionsService, sessionsService };
}

async function prepareActiveSession() {
  const services = createServices();
  const createdClass = await services.classesService.createClass({
    grade: '七年级',
    name: '1班'
  });
  await services.classesService.importStudents(createdClass.id, {
    students: [
      { studentNo: '20260101', name: '张三', cardCode: 'C001' },
      { studentNo: '20260102', name: '李四', cardCode: 'C002' }
    ]
  });
  const question = await services.questionsService.createQuestion({
    subject: '数学',
    grade: '七年级',
    stem: '测试题',
    options: { A: '选项A', B: '选项B', C: '选项C', D: '选项D' },
    answer: 'C',
    explanation: '解析',
    knowledgePoints: ['测试知识点'],
    difficulty: '基础'
  });
  const session = await services.sessionsService.createSession({
    classId: createdClass.id,
    title: '出口检测',
    mode: 'exit_ticket',
    questionIds: [question.id]
  });

  return {
    ...services,
    question,
    session: await services.sessionsService.startSession(session.id)
  };
}

async function prepareLargeActiveSession(studentCount: number) {
  const services = createServices();
  const createdClass = await services.classesService.createClass({
    grade: '七年级',
    name: '扫码模拟班'
  });
  await services.classesService.importStudents(createdClass.id, {
    students: Array.from({ length: studentCount }, (_, index) => {
      const no = String(index + 1).padStart(3, '0');
      return { studentNo: `2026${no}`, name: `学生${no}`, cardCode: `C${no}` };
    })
  });
  const question = await services.questionsService.createQuestion({
    subject: '数学',
    grade: '七年级',
    stem: '测试题',
    options: { A: '选项A', B: '选项B', C: '选项C', D: '选项D' },
    answer: 'C',
    explanation: '解析',
    knowledgePoints: ['测试知识点'],
    difficulty: '基础'
  });
  const session = await services.sessionsService.createSession({
    classId: createdClass.id,
    title: '60 人出口检测',
    mode: 'exit_ticket',
    questionIds: [question.id]
  });

  return {
    ...services,
    question,
    session: await services.sessionsService.startSession(session.id)
  };
}

describe('AnswersService', () => {
  it('提交扫码答案并计算统计', async () => {
    const { answersService, question, session } = await prepareActiveSession();

    const result = await answersService.submitBatch(session.id, {
      questionId: question.id,
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
    const stats = await answersService.getQuestionStats(session.id, question.id);

    expect(result.acceptedCount).toBe(2);
    expect(stats).toEqual({
      total: 2,
      answered: 2,
      unanswered: 0,
      optionStats: { A: 1, B: 0, C: 1, D: 0 },
      correctRate: 0.5
    });
  });

  it('列出学生答题状态，区分已答和未答', async () => {
    const { answersService, question, session } = await prepareActiveSession();

    await answersService.submitBatch(session.id, {
      questionId: question.id,
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

    expect(await answersService.listQuestionParticipants(session.id, question.id)).toMatchObject([
      {
        studentNo: '20260101',
        cardCode: 'C001',
        answered: true,
        selectedOption: 'C',
        isCorrect: true
      },
      {
        studentNo: '20260102',
        cardCode: 'C002',
        answered: false
      }
    ]);
  });

  it('学生答题状态默认脱敏，可按开关显示原始姓名', async () => {
    const { answersService, question, session } = await prepareActiveSession();

    const masked = await answersService.listQuestionParticipants(session.id, question.id);
    const realNames = await answersService.listQuestionParticipants(session.id, question.id, true);

    expect(masked[0]?.displayName).not.toBe('张三');
    expect(realNames[0]?.displayName).toBe('张三');
    expect(realNames[1]?.displayName).toBe('李四');
  });

  it('同一学生重复提交时以最新答案覆盖', async () => {
    const { answersService, question, session } = await prepareActiveSession();

    await answersService.submitBatch(session.id, {
      questionId: question.id,
      deviceId: 'simulator_001',
      answers: [
        {
          cardCode: 'C001',
          selectedOption: 'A',
          recognitionScore: 0.8,
          recognizedAt: '2026-05-14T10:20:30+08:00'
        }
      ]
    });
    await answersService.submitBatch(session.id, {
      questionId: question.id,
      deviceId: 'simulator_001',
      answers: [
        {
          cardCode: 'C001',
          selectedOption: 'C',
          recognitionScore: 0.99,
          recognizedAt: '2026-05-14T10:20:35+08:00'
        }
      ]
    });

    expect(await answersService.getQuestionStats(session.id, question.id)).toMatchObject({
      answered: 1,
      optionStats: { A: 0, B: 0, C: 1, D: 0 },
      correctRate: 1
    });
  });

  it('支持 60 人扫码批量提交并按最新答案覆盖统计', async () => {
    const { answersService, question, session } = await prepareLargeActiveSession(60);

    const firstResult = await answersService.submitBatch(session.id, {
      questionId: question.id,
      deviceId: 'simulator_001',
      answers: Array.from({ length: 60 }, (_, index) => {
        const no = String(index + 1).padStart(3, '0');
        return {
          cardCode: `C${no}`,
          selectedOption: index < 30 ? 'C' : 'A',
          recognitionScore: 0.9,
          recognizedAt: '2026-05-14T10:20:30+08:00'
        };
      })
    });
    const firstStats = await answersService.getQuestionStats(session.id, question.id);

    expect(firstResult).toMatchObject({ acceptedCount: 60, failedCount: 0 });
    expect(firstStats).toMatchObject({
      total: 60,
      answered: 60,
      unanswered: 0,
      optionStats: { A: 30, B: 0, C: 30, D: 0 },
      correctRate: 0.5
    });

    await answersService.submitBatch(session.id, {
      questionId: question.id,
      deviceId: 'simulator_001',
      answers: Array.from({ length: 60 }, (_, index) => {
        const no = String(index + 1).padStart(3, '0');
        return {
          cardCode: `C${no}`,
          selectedOption: 'C',
          recognitionScore: 0.95,
          recognizedAt: '2026-05-14T10:21:30+08:00'
        };
      })
    });

    expect(await answersService.getQuestionStats(session.id, question.id)).toMatchObject({
      total: 60,
      answered: 60,
      optionStats: { A: 0, B: 0, C: 60, D: 0 },
      correctRate: 1
    });
  });

  it('拒绝向未开始的活动提交答案', async () => {
    const { answersService, classesService, questionsService, sessionsService } =
      createServices();
    const createdClass = await classesService.createClass({ grade: '七年级', name: '1班' });
    const question = await questionsService.createQuestion({
      subject: '数学',
      grade: '七年级',
      stem: '测试题',
      options: { A: '选项A', B: '选项B', C: '选项C', D: '选项D' },
      answer: 'A',
      explanation: '解析',
      knowledgePoints: ['测试知识点'],
      difficulty: '基础'
    });
    const session = await sessionsService.createSession({
      classId: createdClass.id,
      title: '出口检测',
      mode: 'exit_ticket',
      questionIds: [question.id]
    });

    await expect(
      answersService.submitBatch(session.id, {
        questionId: question.id,
        deviceId: 'simulator_001',
        answers: [
          {
            cardCode: 'C001',
            selectedOption: 'A',
            recognitionScore: 0.9,
            recognizedAt: '2026-05-14T10:20:30+08:00'
          }
        ]
      })
    ).rejects.toThrow(BadRequestException);
  });
});
