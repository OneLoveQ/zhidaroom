export interface GeneratedQuestionItem {
  stem: string;
  options: {
    A: string;
    B: string;
    C: string;
    D: string;
  };
  answer: 'A' | 'B' | 'C' | 'D';
  explanation: string;
  knowledgePoints: string[];
  difficulty: string;
  commonMistakes: string[];
  aiGenerated?: boolean;
  reviewStatus?: 'pending';
}

export interface GenerateQuestionsResult {
  items: GeneratedQuestionItem[];
  record: AiGenerationRecord;
  notice: string;
}

export interface RecognizeQuestionImageResult {
  item: GeneratedQuestionItem;
  items: GeneratedQuestionItem[];
  record: AiGenerationRecord;
  notice: string;
}

export interface AiDiagnosisItem {
  questionId: string;
  riskLevel: 'low' | 'medium' | 'high';
  mainMisconception: string;
  evidence: string;
  teachingSuggestion: string;
  followUpAction: string;
}

export interface AiGenerationRecord {
  id: string;
  type: 'question_generation' | 'question_image_recognition' | 'session_diagnosis';
  sessionId?: string;
  status: 'success' | 'fallback';
  source: 'model' | 'rule';
  createdAt: string;
}

export interface AiDiagnosisResult {
  sessionId: string;
  generatedAt: string;
  source: 'model' | 'rule';
  items: AiDiagnosisItem[];
  record: AiGenerationRecord;
  notice: string;
}
