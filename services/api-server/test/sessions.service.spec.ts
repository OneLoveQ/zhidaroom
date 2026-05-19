import { BadRequestException } from '@nestjs/common';
import { describe, expect, it } from 'vitest';
import { ClassesService } from '../src/modules/classes/classes.service.js';
import { InMemoryClassesRepository } from '../src/modules/classes/repositories/in-memory-classes.repository.js';
import { QuestionsService } from '../src/modules/questions/questions.service.js';
import { InMemoryQuestionsRepository } from '../src/modules/questions/repositories/in-memory-questions.repository.js';
import { InMemorySessionsRepository } from '../src/modules/sessions/repositories/in-memory-sessions.repository.js';
import { SessionsService } from '../src/modules/sessions/sessions.service.js';
import { verifyMobileBindToken } from '../src/common/auth/mobile-bind-token.js';

function createServices(): {
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

  return { classesService, questionsService, sessionsService };
}

describe('SessionsService', () => {
  it('创建、开始、结束出口检测活动', async () => {
    const { classesService, questionsService, sessionsService } = createServices();
    const createdClass = await classesService.createClass({ grade: '七年级', name: '1班' });
    const question = await questionsService.createQuestion({
      subject: '数学',
      grade: '七年级',
      stem: '下列不等式变形正确的是？',
      options: { A: '选项A', B: '选项B', C: '选项C', D: '选项D' },
      answer: 'C',
      explanation: '解析',
      knowledgePoints: ['不等式性质'],
      difficulty: '基础'
    });

    const session = await sessionsService.createSession({
      classId: createdClass.id,
      title: '出口检测',
      mode: 'exit_ticket',
      questionIds: [question.id]
    });
    const started = await sessionsService.startSession(session.id);
    const ended = await sessionsService.endSession(session.id);

    expect(session.questions).toHaveLength(1);
    expect(started.status).toBe('active');
    expect(ended.status).toBe('ended');
  });

  it('拒绝结束未开始的活动', async () => {
    const { classesService, questionsService, sessionsService } = createServices();
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

    await expect(sessionsService.endSession(session.id)).rejects.toThrow(BadRequestException);
  });

  it('生成大屏二维码使用的教师扫码端地址携带课堂绑定令牌', () => {
    const { sessionsService } = createServices();
    const url = sessionsService.getMobileBindUrl({
      id: 'session_001',
      classroomCode: '20260518-一年级1班-语文1'
    });
    const parsed = new URL(url);

    expect(parsed.origin).toBe('http://127.0.0.1:5177');
    expect(parsed.searchParams.get('sessionId')).toBe('session_001');
    expect(verifyMobileBindToken('session_001', parsed.searchParams.get('bindToken') ?? '')).toBe(true);
  });
});
