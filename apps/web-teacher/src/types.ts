export interface ClassView {
  id: string;
  grade: string;
  name: string;
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

export interface AuthPayload {
  email: string;
  password: string;
  displayName?: string;
  school?: string;
  subject?: string;
  phone?: string;
}

export interface CreateClassPayload {
  grade: string;
  name: string;
}

export interface StudentImportItem {
  studentNo: string;
  name: string;
  cardCode: string;
}

export interface StudentView {
  id: string;
  classId: string;
  studentNo: string;
  displayName: string;
  cardCode: string;
  status: 'active' | 'disabled';
}

export interface UpdateStudentPayload extends StudentImportItem {
  status: 'active' | 'disabled';
}

export interface ImportStudentsResult {
  importedCount: number;
  failedCount: number;
  errors: Array<{ rowNo: number; message: string }>;
}

export interface QuestionView {
  id: string;
  subject?: string;
  grade?: string;
  stem: string;
  answer: 'A' | 'B' | 'C' | 'D';
  options: Record<'A' | 'B' | 'C' | 'D', string>;
  explanation?: string;
  knowledgePoints?: string[];
  difficulty?: '基础' | '巩固' | '提升';
}

export interface CreateQuestionPayload {
  subject: string;
  grade: string;
  stem: string;
  options: Record<'A' | 'B' | 'C' | 'D', string>;
  answer: 'A' | 'B' | 'C' | 'D';
  explanation: string;
  knowledgePoints: string[];
  difficulty: '基础' | '巩固' | '提升';
}

export interface ImportQuestionsResult {
  importedCount: number;
  items: QuestionView[];
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
  textbookVersion?: string;
}

export interface RecognizeQuestionImagePayload {
  imageDataUrl: string;
  subject: string;
  grade: string;
  difficulty?: string;
  count?: number;
  instruction?: string;
}

export interface AiQuestionResult {
  item?: AiGeneratedQuestionItem;
  items: AiGeneratedQuestionItem[];
  notice: string;
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

export interface StudentLearningDetailView {
  classId: string;
  className: string;
  studentId: string;
  studentNo: string;
  displayName: string;
  generatedAt: string;
  summary: {
    sessionCount: number;
    totalQuestionCount: number;
    answeredCount: number;
    correctCount: number;
    missedCount: number;
    correctRate: number;
    participationRate: number;
    latestSessionAt?: string;
  };
  weakKnowledgePoints: Array<{
    name: string;
    totalCount: number;
    wrongCount: number;
    correctRate: number;
  }>;
  recentAnswers: Array<{
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
  }>;
  aiDiagnosis: string[];
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

export interface QuestionReportItem {
  questionId: string;
  runId?: string;
  runTitle?: string;
  stem: string;
  answer: string;
  difficulty: string;
  knowledgePoints: string[];
  stats: {
    total: number;
    answered: number;
    unanswered: number;
    optionStats: Record<'A' | 'B' | 'C' | 'D', number>;
    correctRate: number;
  };
  misconception: string;
  teachingSuggestion: string;
  followUpAction: string;
}

export interface SessionReportView {
  sessionId: string;
  title: string;
  status: string;
  questionCount: number;
  averageCorrectRate: number;
  generatedAt: string;
  aiNotice: string;
  studentRankings: StudentRankingItem[];
  questions: QuestionReportItem[];
}

export interface AiLearningDiagnosisResult {
  scope: 'class' | 'student';
  targetId: string;
  generatedAt: string;
  source: 'model' | 'rule';
  diagnosis: string[];
  recommendations: string[];
  notice: string;
}

export interface AiLearningDiagnosisRecordView {
  id: string;
  scope: 'class' | 'student';
  targetId: string;
  classId?: string;
  studentId?: string;
  source: 'model' | 'rule';
  status: 'success' | 'fallback';
  rangeFrom?: string;
  rangeTo?: string;
  diagnosis: string[];
  recommendations: string[];
  createdAt: string;
}
