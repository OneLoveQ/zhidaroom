export type QuestionOptionKey = 'A' | 'B' | 'C' | 'D';

export interface QuestionOptions {
  A: string;
  B: string;
  C: string;
  D: string;
}

export interface QuestionEntity {
  id: string;
  workspaceId: string;
  creatorId: string;
  subject: string;
  grade: string;
  stem: string;
  options: QuestionOptions;
  answer: string;
  explanation: string;
  knowledgePoints: string[];
  difficulty: string;
  source: 'manual' | 'ai' | 'import';
  aiGenerated: boolean;
  reviewStatus: 'draft' | 'pending' | 'approved' | 'rejected';
  createdAt: Date;
}

export interface QuestionView extends Omit<QuestionEntity, 'createdAt'> {
  createdAt: string;
}

export interface QuestionsRepository {
  saveQuestion(entity: QuestionEntity): Promise<void>;
  listQuestions(workspaceId?: string): Promise<QuestionEntity[]>;
  findQuestionById(questionId: string): Promise<QuestionEntity | undefined>;
  deleteQuestion(questionId: string): Promise<void>;
}
