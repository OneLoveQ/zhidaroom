import { SessionMode } from '../../sessions/models/session.models.js';

export type AssessmentRunStatus = 'draft' | 'active' | 'completed';
export type AssessmentRunStage = 'selecting' | 'scanning' | 'question_complete' | 'result';

export interface AssessmentRunEntity {
  id: string;
  sessionId: string;
  title: string;
  type: SessionMode;
  status: AssessmentRunStatus;
  stage: AssessmentRunStage;
  currentQuestionId?: string;
  questionIds: string[];
  startedAt?: Date;
  completedAt?: Date;
  createdAt: Date;
}

export interface AssessmentRunView extends Omit<AssessmentRunEntity, 'createdAt' | 'startedAt' | 'completedAt'> {
  createdAt: string;
  startedAt?: string;
  completedAt?: string;
}

export interface AssessmentRunsRepository {
  save(entity: AssessmentRunEntity): Promise<void>;
  listBySession(sessionId: string): Promise<AssessmentRunEntity[]>;
  findById(runId: string): Promise<AssessmentRunEntity | undefined>;
  findActiveBySession(sessionId: string): Promise<AssessmentRunEntity | undefined>;
  findLatestBySession(sessionId: string): Promise<AssessmentRunEntity | undefined>;
}
