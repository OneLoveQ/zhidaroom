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

export interface LearningSummaryView {
  sessionCount: number;
  questionCount: number;
  studentCount: number;
  answeredCount: number;
  totalAnswerSlots: number;
  averageCorrectRate: number;
  participationRate: number;
  weakKnowledgeCount: number;
  attentionStudentCount: number;
}

export interface KnowledgePointAnalysisItem {
  name: string;
  questionCount: number;
  answeredCount: number;
  correctCount: number;
  correctRate: number;
  status: '掌握较好' | '需要巩固' | '重点讲评';
}

export interface StudentLearningAnalysisItem {
  studentId: string;
  studentNo: string;
  displayName: string;
  answeredCount: number;
  correctCount: number;
  totalQuestionCount: number;
  missedCount: number;
  correctRate: number;
  status: '稳定' | '需关注' | '参与不足';
  weakKnowledgePoints: string[];
}

export interface RecentSessionAnalysisItem {
  sessionId: string;
  title: string;
  subject?: string;
  createdAt: string;
  averageCorrectRate: number;
  participationRate: number;
}

export interface ClassLearningAnalysisView {
  classId: string;
  className: string;
  generatedAt: string;
  summary: LearningSummaryView;
  knowledgePoints: KnowledgePointAnalysisItem[];
  students: StudentLearningAnalysisItem[];
  recentSessions: RecentSessionAnalysisItem[];
  totalRecentSessionCount: number;
  aiDiagnosis: string[];
}

export interface LearningAnalysisRange {
  from?: string;
  to?: string;
  subject?: string;
  limit?: number;
  offset?: number;
}

export interface StudentLearningSummaryView {
  sessionCount: number;
  totalQuestionCount: number;
  answeredCount: number;
  correctCount: number;
  missedCount: number;
  correctRate: number;
  participationRate: number;
  latestSessionAt?: string;
}

export interface StudentWeakKnowledgeItem {
  name: string;
  totalCount: number;
  wrongCount: number;
  correctRate: number;
}

export interface StudentRecentAnswerItem {
  sessionId: string;
  sessionTitle: string;
  questionId: string;
  stem: string;
  answer: string;
  selectedOption?: string;
  answered: boolean;
  isCorrect?: boolean;
  knowledgePoints: string[];
  createdAt: string;
}

export interface StudentLearningDetailView {
  classId: string;
  className: string;
  studentId: string;
  studentNo: string;
  displayName: string;
  generatedAt: string;
  summary: StudentLearningSummaryView;
  weakKnowledgePoints: StudentWeakKnowledgeItem[];
  recentAnswers: StudentRecentAnswerItem[];
  aiDiagnosis: string[];
}
