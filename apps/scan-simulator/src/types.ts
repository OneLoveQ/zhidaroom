export type OptionKey = 'A' | 'B' | 'C' | 'D';

export interface ClassView {
  id: string;
}

export interface QuestionView {
  id: string;
}

export interface SessionDetailView {
  id: string;
  title: string;
  status: 'draft' | 'active' | 'ended';
}

export interface QuestionStatsView {
  total: number;
  answered: number;
  unanswered: number;
  optionStats: Record<OptionKey, number>;
  correctRate: number;
}

export interface BatchResultView {
  acceptedCount: number;
  failedCount: number;
  errors: Array<{ rowNo: number; cardCode?: string; message: string }>;
}
