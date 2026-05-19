import { QuestionView } from '../../questions/models/question.models.js';

export type SessionMode = 'exit_ticket' | 'quiz' | 'vote';
export type SessionStatus = 'draft' | 'active' | 'ended';
export type SessionStage =
  | 'binding'
  | 'scanning'
  | 'question_complete'
  | 'question_result'
  | 'session_report';

export interface SessionEntity {
  id: string;
  workspaceId: string;
  teacherUserId: string;
  teacherId: string;
  classId: string;
  title: string;
  mode: SessionMode;
  status: SessionStatus;
  stage?: SessionStage;
  currentQuestionId?: string;
  autoAdvanceAt?: Date;
  questionIds: string[];
  teacherName?: string;
  subject?: string;
  classroomCode?: string;
  startedAt?: Date;
  endedAt?: Date;
  createdAt: Date;
}

export interface SessionView {
  id: string;
  workspaceId: string;
  teacherUserId: string;
  teacherId: string;
  classId: string;
  title: string;
  mode: SessionMode;
  status: SessionStatus;
  stage: SessionStage;
  currentQuestionId?: string;
  autoAdvanceAt?: string;
  questionIds: string[];
  teacherName?: string;
  subject?: string;
  classroomCode?: string;
  startedAt?: string;
  endedAt?: string;
  createdAt: string;
}

export interface SessionDetailView extends SessionView {
  questions: QuestionView[];
}

export interface SessionsRepository {
  saveSession(entity: SessionEntity): Promise<void>;
  listSessions(): Promise<SessionEntity[]>;
  findSessionById(sessionId: string): Promise<SessionEntity | undefined>;
  findSessionByClassroomCode(classroomCode: string): Promise<SessionEntity | undefined>;
}
