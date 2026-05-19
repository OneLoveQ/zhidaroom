import type { CreateQuestionPayload } from './types';

export interface QuestionDraft {
  subject: string;
  grade: string;
  stem: string;
  optionA: string;
  optionB: string;
  optionC: string;
  optionD: string;
  answer: CreateQuestionPayload['answer'];
  explanation: string;
  knowledgeText: string;
  difficulty: CreateQuestionPayload['difficulty'];
}

export function createEmptyQuestionDraft(subject = '语文', grade = '一年级'): QuestionDraft {
  return {
    subject,
    grade,
    stem: '',
    optionA: '',
    optionB: '',
    optionC: '',
    optionD: '',
    answer: 'A',
    explanation: '',
    knowledgeText: '',
    difficulty: '基础'
  };
}

export function toQuestionPayload(draft: QuestionDraft): CreateQuestionPayload {
  const knowledgePoints = draft.knowledgeText
    .split(/[，,]/)
    .map((item) => item.trim())
    .filter(Boolean);
  const payload = {
    subject: draft.subject.trim(),
    grade: draft.grade.trim(),
    stem: draft.stem.trim(),
    options: {
      A: draft.optionA.trim(),
      B: draft.optionB.trim(),
      C: draft.optionC.trim(),
      D: draft.optionD.trim()
    },
    answer: draft.answer,
    explanation: draft.explanation.trim(),
    knowledgePoints,
    difficulty: draft.difficulty
  };
  validateQuestionPayload(payload);
  return payload;
}

function validateQuestionPayload(payload: CreateQuestionPayload): void {
  if (!payload.subject || !payload.grade || !payload.stem || !payload.explanation) {
    throw new Error('题目必须包含学科、年级、题干和解析');
  }
  const missingOption = Object.entries(payload.options).find(([, value]) => !value);
  if (missingOption) {
    throw new Error(`选项 ${missingOption[0]} 不能为空`);
  }
  if (!payload.options[payload.answer]) {
    throw new Error('正确答案必须对应一个已填写的选项');
  }
  if (!payload.knowledgePoints.length) {
    throw new Error('请至少填写一个知识点');
  }
}
