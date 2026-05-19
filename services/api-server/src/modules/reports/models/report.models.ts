import { QuestionStatsView } from '../../answers/models/answer.models.js';
import {
  SessionMode,
  SessionStatus
} from '../../sessions/models/session.models.js';

export interface WrongAnswerItem {
  studentId: string;
  studentNo: string;
  displayName: string;
  cardCode: string;
  selectedOption: 'A' | 'B' | 'C' | 'D';
}

export interface QuestionReportItem {
  questionId: string;
  runId?: string;
  runTitle?: string;
  stem: string;
  options: Record<'A' | 'B' | 'C' | 'D', string>;
  answer: string;
  explanation: string;
  knowledgePoints: string[];
  difficulty: string;
  stats: QuestionStatsView;
  misconception: string;
  evidence: string;
  teachingSuggestion: string;
  followUpAction: string;
  wrongAnswers: WrongAnswerItem[];
}

export interface StudentRankingItem {
  studentId: string;
  studentNo: string;
  displayName: string;
  cardCode: string;
  answeredCount: number;
  correctCount: number;
  totalQuestionCount: number;
  correctRate: number;
  answers: StudentAnswerDetail[];
}

export interface StudentAnswerDetail {
  questionId: string;
  runId?: string;
  runTitle?: string;
  stem: string;
  answer: string;
  selectedOption?: 'A' | 'B' | 'C' | 'D';
  answered: boolean;
  isCorrect?: boolean;
}

export interface SessionReportView {
  sessionId: string;
  title: string;
  mode: SessionMode;
  status: SessionStatus;
  questionCount: number;
  averageCorrectRate: number;
  generatedAt: string;
  aiNotice: string;
  studentRankings: StudentRankingItem[];
  questions: QuestionReportItem[];
}
