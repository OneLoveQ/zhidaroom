import { QuestionView } from '../../questions/models/question.models.js';
import {
  SessionDetailView,
  SessionStage
} from '../../sessions/models/session.models.js';

export type AnswerOption = 'A' | 'B' | 'C' | 'D';

export interface AnswerEntity {
  id: string;
  runId?: string;
  sessionId: string;
  questionId: string;
  studentId: string;
  cardCode: string;
  selectedOption: AnswerOption;
  isCorrect: boolean;
  recognizedAt: Date;
  recognitionScore: number;
  deviceId: string;
}

export interface AnswerBatchResult {
  acceptedCount: number;
  failedCount: number;
  errors: Array<{
    rowNo: number;
    cardCode: string;
    message: string;
  }>;
}

export interface QuestionStatsView {
  total: number;
  answered: number;
  unanswered: number;
  optionStats: Record<AnswerOption, number>;
  correctRate: number;
}

export interface QuestionParticipantView {
  studentId: string;
  studentNo: string;
  displayName: string;
  cardCode: string;
  answered: boolean;
  selectedOption?: AnswerOption;
  isCorrect?: boolean;
  recognizedAt?: string;
}

export interface SessionLiveStateView {
  session: SessionDetailView;
  activeRun?: {
    id: string;
    title: string;
    status: string;
    stage: string;
    questionIds: string[];
  };
  stage: SessionStage;
  currentQuestion: QuestionView;
  stats: QuestionStatsView;
  participants: QuestionParticipantView[];
  mobileBindUrl: string;
  autoAdvanceAt?: string;
}

export interface AnswersRepository {
  upsertAnswers(answers: AnswerEntity[]): Promise<void>;
  listAnswers(sessionId: string, questionId: string, runId?: string): Promise<AnswerEntity[]>;
}
