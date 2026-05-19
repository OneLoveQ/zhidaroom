import type { BatchAnswersPayload } from '../../../services/cv-service/src/answer-batch';

export interface BatchUploadResult {
  acceptedCount: number;
  failedCount: number;
  errors: Array<{ rowNo: number; cardCode: string; message: string }>;
}

async function request<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...init?.headers
    }
  });
  const data = (await response.json()) as T;
  if (!response.ok) {
    throw new Error(JSON.stringify(data));
  }
  return data;
}

export function uploadAnswers(
  sessionId: string,
  payload: BatchAnswersPayload
): Promise<BatchUploadResult> {
  return request(`/api/sessions/${sessionId}/answers/batch`, {
    method: 'POST',
    body: JSON.stringify(payload)
  });
}
