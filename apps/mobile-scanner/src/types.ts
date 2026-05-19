export type OptionKey = 'A' | 'B' | 'C' | 'D';
export type SessionStage =
  | 'binding'
  | 'scanning'
  | 'question_complete'
  | 'question_result'
  | 'session_report';

export interface QuestionView {
  id: string;
  stem: string;
  answer: OptionKey;
  options: Record<OptionKey, string>;
  subject?: string;
  grade?: string;
  difficulty?: string;
}

export interface SessionDetailView {
  id: string;
  title: string;
  classId: string;
  status: 'draft' | 'active' | 'ended';
  stage: SessionStage;
  currentQuestionId?: string;
  autoAdvanceAt?: string;
  questionIds: string[];
  teacherName?: string;
  subject?: string;
  classroomCode?: string;
  questions: QuestionView[];
}

export interface SessionView {
  id: string;
  title: string;
  classId: string;
  status: 'draft' | 'active' | 'ended';
  stage: SessionStage;
  currentQuestionId?: string;
  autoAdvanceAt?: string;
  questionIds: string[];
  teacherName?: string;
  subject?: string;
  classroomCode?: string;
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
  status: string;
}

export interface CreateQuestionPayload {
  subject: string;
  grade: string;
  stem: string;
  options: Record<OptionKey, string>;
  answer: OptionKey;
  explanation: string;
  knowledgePoints: string[];
  difficulty: '基础' | '巩固' | '提升';
}

export interface AiGeneratedQuestionItem extends CreateQuestionPayload {
  commonMistakes?: string[];
  aiGenerated?: boolean;
  reviewStatus?: 'pending';
}

export interface GenerateQuestionsPayload {
  subject: string;
  grade: string;
  knowledgePoint: string;
  description?: string;
  count: number;
  difficulty: string;
  questionType: 'single_choice';
}

export interface RecognizeQuestionImagePayload {
  imageDataUrl: string;
  subject: string;
  grade: string;
  difficulty?: string;
  count?: number;
  instruction?: string;
}

export interface RecognizedQuestionResult {
  item: CreateQuestionPayload & {
    commonMistakes?: string[];
    aiGenerated?: boolean;
    reviewStatus?: 'pending';
  };
  items?: AiGeneratedQuestionItem[];
  notice: string;
}

export interface UploadResult {
  acceptedCount: number;
  failedCount: number;
  errors: Array<{ rowNo: number; cardCode: string; message: string }>;
}

export interface QuestionStatsView {
  total: number;
  answered: number;
  unanswered: number;
  optionStats: Record<OptionKey, number>;
  correctRate: number;
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

export interface QuestionReportItem {
  questionId: string;
  runId?: string;
  runTitle?: string;
  stem: string;
  options: Record<OptionKey, string>;
  answer: OptionKey;
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

export interface WrongAnswerItem {
  studentId: string;
  studentNo: string;
  displayName: string;
  cardCode: string;
  selectedOption: OptionKey;
}

export interface SessionReportView {
  sessionId: string;
  title: string;
  mode: 'exit_ticket' | 'quiz' | 'vote';
  status: 'draft' | 'active' | 'ended';
  questionCount: number;
  averageCorrectRate: number;
  generatedAt: string;
  aiNotice: string;
  studentRankings: StudentRankingItem[];
  questions: QuestionReportItem[];
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
  answer: OptionKey;
  selectedOption?: OptionKey;
  answered: boolean;
  isCorrect?: boolean;
}

export interface AiDiagnosisItem {
  questionId: string;
  riskLevel: 'low' | 'medium' | 'high';
  mainMisconception: string;
  evidence: string;
  teachingSuggestion: string;
  followUpAction: string;
}

export interface AiDiagnosisResult {
  sessionId: string;
  generatedAt: string;
  source: 'model' | 'rule';
  items: AiDiagnosisItem[];
  notice: string;
}

export interface SessionLiveStateView {
  session: SessionDetailView;
  activeRun?: AssessmentRunView;
  stage: SessionStage;
  currentQuestion: QuestionView;
  stats: QuestionStatsView;
  participants: QuestionParticipantView[];
  mobileBindUrl: string;
  autoAdvanceAt?: string;
}

export interface AssessmentRunView {
  id: string;
  sessionId: string;
  title: string;
  type: 'exit_ticket' | 'quiz' | 'vote';
  status: 'draft' | 'active' | 'completed';
  stage: 'selecting' | 'scanning' | 'question_complete' | 'result';
  currentQuestionId?: string;
  questionIds: string[];
  startedAt?: string;
  completedAt?: string;
  createdAt: string;
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
