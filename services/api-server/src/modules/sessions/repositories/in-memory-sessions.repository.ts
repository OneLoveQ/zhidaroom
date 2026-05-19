import { Injectable } from '@nestjs/common';
import {
  SessionEntity,
  SessionsRepository
} from '../models/session.models.js';
import { JsonStore } from '../../../common/storage/json-store.js';

@Injectable()
export class InMemorySessionsRepository implements SessionsRepository {
  private readonly sessions = new Map<string, SessionEntity>();
  private readonly store = new JsonStore();

  constructor() {
    this.store.read<SessionEntity[]>('sessions', []).forEach((item) => {
      this.sessions.set(item.id, {
        ...item,
        startedAt: item.startedAt ? new Date(item.startedAt) : undefined,
        endedAt: item.endedAt ? new Date(item.endedAt) : undefined,
        autoAdvanceAt: item.autoAdvanceAt ? new Date(item.autoAdvanceAt) : undefined,
        createdAt: new Date(item.createdAt)
      });
    });
  }

  async saveSession(entity: SessionEntity): Promise<void> {
    this.sessions.set(entity.id, entity);
    this.persist();
  }

  async listSessions(): Promise<SessionEntity[]> {
    return Array.from(this.sessions.values());
  }

  async findSessionById(sessionId: string): Promise<SessionEntity | undefined> {
    return this.sessions.get(sessionId);
  }

  async findSessionByClassroomCode(
    classroomCode: string
  ): Promise<SessionEntity | undefined> {
    return Array.from(this.sessions.values())
      .filter((item) => item.classroomCode === classroomCode)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())[0];
  }

  private persist(): void {
    this.store.write('sessions', Array.from(this.sessions.values()));
  }
}
