import { AssessmentRunEntity, AssessmentRunsRepository } from '../models/run.models.js';

export class InMemoryRunsRepository implements AssessmentRunsRepository {
  private readonly runs = new Map<string, AssessmentRunEntity>();

  async save(entity: AssessmentRunEntity): Promise<void> {
    this.runs.set(entity.id, this.clone(entity));
  }

  async listBySession(sessionId: string): Promise<AssessmentRunEntity[]> {
    return Array.from(this.runs.values())
      .filter((item) => item.sessionId === sessionId)
      .sort((left, right) => left.createdAt.getTime() - right.createdAt.getTime())
      .map((item) => this.clone(item));
  }

  async findById(runId: string): Promise<AssessmentRunEntity | undefined> {
    const entity = this.runs.get(runId);
    return entity ? this.clone(entity) : undefined;
  }

  async findActiveBySession(sessionId: string): Promise<AssessmentRunEntity | undefined> {
    return (await this.listBySession(sessionId))
      .filter((item) => item.status === 'active')
      .sort((left, right) => right.createdAt.getTime() - left.createdAt.getTime())[0];
  }

  async findLatestBySession(sessionId: string): Promise<AssessmentRunEntity | undefined> {
    return (await this.listBySession(sessionId))
      .sort((left, right) => right.createdAt.getTime() - left.createdAt.getTime())[0];
  }

  private clone(entity: AssessmentRunEntity): AssessmentRunEntity {
    return {
      ...entity,
      questionIds: [...entity.questionIds],
      createdAt: new Date(entity.createdAt),
      startedAt: entity.startedAt ? new Date(entity.startedAt) : undefined,
      completedAt: entity.completedAt ? new Date(entity.completedAt) : undefined
    };
  }
}
