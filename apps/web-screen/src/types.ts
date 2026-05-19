export type OptionKey = 'A' | 'B' | 'C' | 'D';

export interface AuthPayload {
  email: string;
  password: string;
  displayName?: string;
  school?: string;
  subject?: string;
  phone?: string;
}

export interface AuthUserView {
  id: string;
  email: string;
  displayName: string;
  phone?: string;
  school?: string;
  subject?: string;
  workspaceId: string;
  workspaceName: string;
  workspaceType: 'personal' | 'school';
}

export interface QuestionStatsView {
  total: number;
  answered: number;
  unanswered: number;
  optionStats: Record<OptionKey, number>;
  correctRate: number;
}

export interface ClassView {
  id: string;
  grade: string;
  name: string;
}

export interface StudentView {
  id: string;
  classId: string;
  studentNo: string;
  displayName: string;
  cardCode: string;
  status: 'active' | 'inactive';
}

export interface ScreenQuestionView {
  id: string;
  stem: string;
  answer: OptionKey;
  options: Record<OptionKey, string>;
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

export interface WrongAnswerItem {
  studentId: string;
  studentNo: string;
  displayName: string;
  cardCode: string;
  selectedOption: OptionKey;
}

export interface StudentAnswerDetail {
  questionId: string;
  runId?: string;
  runTitle?: string;
  stem: string;
  answer: string;
  selectedOption?: OptionKey;
  answered: boolean;
  isCorrect?: boolean;
}

export interface SessionDetailView {
  id: string;
  title: string;
  status: 'draft' | 'active' | 'ended';
  stage: SessionStage;
  currentQuestionId?: string;
  autoAdvanceAt?: string;
  classroomCode?: string;
  startedAt?: string;
  endedAt?: string;
  createdAt: string;
  questions: ScreenQuestionView[];
}

export interface SessionView {
  id: string;
  title: string;
  status: 'draft' | 'active' | 'ended';
  stage: SessionStage;
  currentQuestionId?: string;
  autoAdvanceAt?: string;
  classroomCode?: string;
  startedAt?: string;
  endedAt?: string;
  createdAt: string;
}

export interface SessionReportView {
  sessionId: string;
  title: string;
  questionCount: number;
  averageCorrectRate: number;
  aiNotice: string;
  questions: Array<{
    questionId: string;
    stem: string;
    runId?: string;
    runTitle?: string;
    options: Record<OptionKey, string>;
    answer: string;
    explanation: string;
    stats: QuestionStatsView;
    misconception: string;
    evidence: string;
    teachingSuggestion: string;
    followUpAction: string;
    wrongAnswers: WrongAnswerItem[];
  }>;
  studentRankings: StudentRankingItem[];
}

export interface QuestionParticipantView {
  studentId: string;
  studentNo: string;
  displayName: string;
  cardCode: string;
  answered: boolean;
  selectedOption?: OptionKey;
  isCorrect?: boolean;
  recognizedAt?: string;
}

export interface ScreenState {
  session: SessionDetailView | null;
  question: ScreenQuestionView | null;
  stats: QuestionStatsView;
  report: SessionReportView | null;
  participants: QuestionParticipantView[];
  mobileBindUrl: string;
  stage: SessionStage | 'unbound';
}

export interface DisplayPairingView {
  pairCode: string;
  displayId: string;
  pairUrl: string;
  status: 'waiting' | 'bound' | 'expired';
  sessionId?: string;
  expiresAt: string;
  createdAt: string;
  boundAt?: string;
}

export interface SessionBindingView {
  sessionId: string;
  classroomCode?: string;
  bindToken: string;
  mobileBindUrl: string;
}

export interface HistoryReportItem {
  session: SessionView;
  report: SessionReportView;
}

export type SessionStage =
  | 'binding'
  | 'scanning'
  | 'question_complete'
  | 'question_result'
  | 'session_report';

export interface SessionLiveStateView {
  session: SessionDetailView;
  activeRun?: {
    id: string;
    title: string;
    status: string;
    stage: string;
    currentQuestionId?: string;
    questionIds: string[];
  };
  stage: SessionStage;
  currentQuestion: ScreenQuestionView;
  stats: QuestionStatsView;
  participants: QuestionParticipantView[];
  mobileBindUrl: string;
  autoAdvanceAt?: string;
}
