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
