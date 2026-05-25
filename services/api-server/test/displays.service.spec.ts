import { describe, expect, it } from 'vitest';
import {
  DisplayPairingEntity,
  DisplayPairingsRepository
} from '../src/modules/displays/display.models.js';
import { DisplaysService } from '../src/modules/displays/displays.service.js';
import { ClassesService } from '../src/modules/classes/classes.service.js';
import { InMemoryClassesRepository } from '../src/modules/classes/repositories/in-memory-classes.repository.js';
import { QuestionsService } from '../src/modules/questions/questions.service.js';
import { InMemoryQuestionsRepository } from '../src/modules/questions/repositories/in-memory-questions.repository.js';
import { InMemorySessionsRepository } from '../src/modules/sessions/repositories/in-memory-sessions.repository.js';
import { SessionsService } from '../src/modules/sessions/sessions.service.js';

class InMemoryDisplayPairingsRepository implements DisplayPairingsRepository {
  private readonly pairings = new Map<string, DisplayPairingEntity>();

  async save(entity: DisplayPairingEntity): Promise<void> {
    this.pairings.set(entity.pairCode, entity);
  }

  async findByPairCode(pairCode: string): Promise<DisplayPairingEntity | undefined> {
    return this.pairings.get(pairCode);
  }

  async findLatestByDisplayId(displayId: string): Promise<DisplayPairingEntity | undefined> {
    return Array.from(this.pairings.values())
      .filter((item) => item.displayId === displayId)
      .sort((left, right) => right.createdAt.getTime() - left.createdAt.getTime())[0];
  }
}

function createServices(): {
  classesService: ClassesService;
  questionsService: QuestionsService;
  sessionsService: SessionsService;
  displaysService: DisplaysService;
} {
  const classesService = new ClassesService(new InMemoryClassesRepository());
  const questionsService = new QuestionsService(new InMemoryQuestionsRepository());
  const sessionsService = new SessionsService(
    new InMemorySessionsRepository(),
    classesService,
    questionsService
  );
  const displaysService = new DisplaysService(
    new InMemoryDisplayPairingsRepository(),
    sessionsService
  );
  return { classesService, questionsService, sessionsService, displaysService };
}

describe('DisplaysService', () => {
  it('同一大屏在等待期间复用同一个配对码', async () => {
    const { displaysService } = createServices();

    const first = await displaysService.createOrRestorePairing('display_001');
    const second = await displaysService.createOrRestorePairing('display_001');

    expect(second.pairCode).toBe(first.pairCode);
    expect(first.pairUrl).toContain(`displayPairCode=${first.pairCode}`);
  });

  it('等待中的配对码会随着大屏轮询续期', async () => {
    const { displaysService } = createServices();

    const first = await displaysService.createOrRestorePairing('display_keep_alive');
    const restored = await displaysService.getPairing(first.pairCode);

    expect(restored.pairCode).toBe(first.pairCode);
    expect(new Date(restored.expiresAt).getTime()).toBeGreaterThanOrEqual(new Date(first.expiresAt).getTime());
  });

  it('教师手机创建课堂后把课堂绑定到大屏配对码', async () => {
    const { classesService, questionsService, sessionsService, displaysService } = createServices();
    const classView = await classesService.createClass({ grade: '一年级', name: '1班' });
    const question = await questionsService.createQuestion({
      subject: '语文',
      grade: '一年级',
      stem: '测试题',
      options: { A: 'A', B: 'B', C: 'C', D: 'D' },
      answer: 'A',
      explanation: '解析',
      knowledgePoints: ['测试'],
      difficulty: '基础'
    });
    const session = await sessionsService.createSession({
      classId: classView.id,
      title: '课堂测试',
      mode: 'exit_ticket',
      questionIds: [question.id]
    });
    const pairing = await displaysService.createOrRestorePairing('display_002');

    const bound = await displaysService.bindSession(pairing.pairCode, session.id);

    expect(bound).toMatchObject({
      pairCode: pairing.pairCode,
      status: 'bound',
      sessionId: session.id
    });
    await expect(displaysService.getPairing(pairing.pairCode)).resolves.toMatchObject({
      status: 'bound',
      sessionId: session.id
    });
  });

  it('大屏退出课堂后清除绑定并让配对失效', async () => {
    const { classesService, questionsService, sessionsService, displaysService } = createServices();
    const classView = await classesService.createClass({ grade: '一年级', name: '1班' });
    const question = await questionsService.createQuestion({
      subject: '语文',
      grade: '一年级',
      stem: '测试题',
      options: { A: 'A', B: 'B', C: 'C', D: 'D' },
      answer: 'A',
      explanation: '解析',
      knowledgePoints: ['测试'],
      difficulty: '基础'
    });
    const session = await sessionsService.createSession({
      classId: classView.id,
      title: '课堂测试',
      mode: 'exit_ticket',
      questionIds: [question.id]
    });
    const pairing = await displaysService.createOrRestorePairing('display_003');
    await displaysService.bindSession(pairing.pairCode, session.id);

    const unbound = await displaysService.unbindDisplay('display_003');

    expect(unbound.status).toBe('expired');
    expect(unbound.sessionId).toBeUndefined();
  });

  it('退出课堂不会误作废新的等待配对码', async () => {
    const { displaysService } = createServices();
    const waiting = await displaysService.createOrRestorePairing('display_waiting');

    const unchanged = await displaysService.unbindDisplay('display_waiting');

    expect(unchanged.status).toBe('waiting');
    expect(unchanged.pairCode).toBe(waiting.pairCode);
  });

  it('已绑定课堂被隐藏后，大屏会获得新的等待配对码', async () => {
    const { classesService, questionsService, sessionsService, displaysService } = createServices();
    const classView = await classesService.createClass({ grade: '一年级', name: '1班' });
    const question = await questionsService.createQuestion({
      subject: '语文',
      grade: '一年级',
      stem: '测试题',
      options: { A: 'A', B: 'B', C: 'C', D: 'D' },
      answer: 'A',
      explanation: '解析',
      knowledgePoints: ['测试'],
      difficulty: '基础'
    });
    const session = await sessionsService.createSession({
      classId: classView.id,
      title: '课堂测试',
      mode: 'exit_ticket',
      questionIds: [question.id]
    });
    const pairing = await displaysService.createOrRestorePairing('display_deleted_session');
    await displaysService.bindSession(pairing.pairCode, session.id);
    await sessionsService.hideSession(session.id);

    const expired = await displaysService.getPairing(pairing.pairCode);
    const next = await displaysService.createOrRestorePairing('display_deleted_session');

    expect(expired).toMatchObject({ status: 'expired', sessionId: undefined });
    expect(next.status).toBe('waiting');
    expect(next.pairCode).not.toBe(pairing.pairCode);
  });
});
