import type {
  AiDiagnosisResult,
  AiGeneratedQuestionItem,
  ClassView,
  CreateQuestionPayload,
  GenerateQuestionsPayload,
  QuestionParticipantView,
  QuestionStatsView,
  QuestionView,
  RecognizeQuestionImagePayload,
  RecognizedQuestionResult,
  DisplayPairingView,
  AssessmentRunView,
  SessionDetailView,
  SessionLiveStateView,
  SessionReportView,
  SessionStage,
  SessionView,
  StudentView,
  UploadResult
} from './types';
import type { BatchAnswersPayload } from '../../../services/cv-service/src/answer-batch';

let mobileBinding: { sessionId: string; bindToken: string } | null = null;
let displayPairCode: string | null = null;

async function request<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...mobileHeaders(),
      ...init?.headers
    }
  });
  const data = (await response.json()) as T;
  if (!response.ok) {
    throw new Error(formatError(data));
  }
  return data;
}

export const api = {
  setMobileBinding(sessionId: string, bindToken: string): void {
    mobileBinding = { sessionId, bindToken };
    displayPairCode = null;
  },

  setDisplayPairing(pairCode: string): void {
    displayPairCode = pairCode;
  },

  clearDisplayPairing(): void {
    displayPairCode = null;
  },

  listClasses(): Promise<ClassView[]> {
    return request('/api/classes');
  },

  listStudents(classId: string): Promise<StudentView[]> {
    return request(`/api/classes/${classId}/students?showRealNames=true`);
  },

  listQuestions(): Promise<QuestionView[]> {
    return request('/api/questions');
  },

  listSessions(): Promise<SessionView[]> {
    return request('/api/sessions');
  },

  createQuestion(payload: CreateQuestionPayload): Promise<QuestionView> {
    return request('/api/questions', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
  },

  recognizeQuestionImage(payload: {
    imageDataUrl: string;
    subject: string;
    grade: string;
  }): Promise<RecognizedQuestionResult> {
    return request('/api/ai/questions/recognize-image', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
  },

  generateQuestions(payload: GenerateQuestionsPayload): Promise<{
    items: AiGeneratedQuestionItem[];
    notice: string;
  }> {
    return request('/api/ai/questions/generate', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
  },

  recognizeQuestionImageCandidates(payload: RecognizeQuestionImagePayload): Promise<RecognizedQuestionResult> {
    return request('/api/ai/questions/recognize-image', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
  },

  createSession(payload: {
    classId: string;
    title: string;
    mode: 'exit_ticket' | 'quiz' | 'vote';
    questionIds: string[];
    teacherName?: string;
    subject?: string;
    classroomCode?: string;
  }): Promise<SessionDetailView> {
    return request('/api/sessions', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
  },

  createRun(sessionId: string, payload: {
    title: string;
    type: 'exit_ticket' | 'quiz' | 'vote';
    questionIds: string[];
  }): Promise<AssessmentRunView> {
    return request(`/api/sessions/${sessionId}/runs`, {
      method: 'POST',
      body: JSON.stringify(payload)
    });
  },

  listRuns(sessionId: string): Promise<AssessmentRunView[]> {
    return request(`/api/sessions/${sessionId}/runs`);
  },

  startRun(sessionId: string, runId: string): Promise<AssessmentRunView> {
    return request(`/api/sessions/${sessionId}/runs/${runId}/start`, { method: 'POST' });
  },

  completeRun(sessionId: string, runId: string): Promise<AssessmentRunView> {
    return request(`/api/sessions/${sessionId}/runs/${runId}/complete`, { method: 'POST' });
  },

  setRunQuestion(sessionId: string, runId: string, questionId: string): Promise<AssessmentRunView> {
    return request(`/api/sessions/${sessionId}/runs/${runId}/questions/${questionId}/current`, { method: 'POST' });
  },

  startSession(sessionId: string): Promise<SessionDetailView> {
    return request(`/api/sessions/${sessionId}/start`, { method: 'POST' });
  },

  getSession(sessionId: string): Promise<SessionDetailView> {
    return request(`/api/sessions/${sessionId}`);
  },

  getLiveState(sessionId: string): Promise<SessionLiveStateView> {
    return request(`/api/sessions/${sessionId}/live-state?showRealNames=true`);
  },

  updateStage(sessionId: string, stage: SessionStage, questionId?: string): Promise<SessionDetailView> {
    return request(`/api/sessions/${sessionId}/stage`, {
      method: 'POST',
      body: JSON.stringify({ stage, questionId })
    });
  },

  uploadAnswers(sessionId: string, payload: BatchAnswersPayload): Promise<UploadResult> {
    return request(`/api/sessions/${sessionId}/answers/batch`, {
      method: 'POST',
      body: JSON.stringify(payload)
    });
  },

  getStats(sessionId: string, questionId: string): Promise<QuestionStatsView> {
    return request(`/api/sessions/${sessionId}/questions/${questionId}/stats`);
  },

  getParticipants(sessionId: string, questionId: string): Promise<QuestionParticipantView[]> {
    return request(`/api/sessions/${sessionId}/questions/${questionId}/participants?showRealNames=true`);
  },

  getSessionReport(sessionId: string): Promise<SessionReportView> {
    return request(`/api/sessions/${sessionId}/report`);
  },

  diagnoseSession(sessionId: string): Promise<AiDiagnosisResult> {
    return request(`/api/ai/sessions/${sessionId}/diagnose`, { method: 'POST' });
  },

  bindDisplayPairing(pairCode: string, sessionId: string): Promise<DisplayPairingView> {
    return request(`/api/displays/pairings/${encodeURIComponent(pairCode)}/bind-session`, {
      method: 'POST',
      body: JSON.stringify({ sessionId })
    });
  },

  getBinding(sessionId: string): Promise<{ bindToken: string; mobileBindUrl: string; sessionId: string }> {
    return request(`/api/sessions/${sessionId}/binding`);
  }
};

function mobileHeaders(): Record<string, string> {
  if (!mobileBinding) {
    return displayPairCode ? { 'X-Zhida-Display-Pair-Code': displayPairCode } : {};
  }
  return {
    'X-Zhida-Mobile-Session-Id': mobileBinding.sessionId,
    'X-Zhida-Mobile-Bind-Token': mobileBinding.bindToken
  };
}

function formatError(data: unknown): string {
  if (typeof data === 'object' && data && 'message' in data) {
    const message = (data as { message: unknown }).message;
    return Array.isArray(message) ? message.join('；') : String(message);
  }
  return JSON.stringify(data);
}
