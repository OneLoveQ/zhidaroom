import type {
  QuestionParticipantView,
  QuestionStatsView,
  SessionDetailView,
  DisplayPairingView,
  SessionBindingView,
  SessionLiveStateView,
  SessionReportView,
  SessionView,
  AuthPayload,
  AuthUserView,
  ClassView,
  StudentView
} from './types';

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
    throw new Error(formatError(data));
  }
  return data;
}

export const api = {
  register(payload: AuthPayload): Promise<{ user: AuthUserView }> {
    return request('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
  },

  login(payload: AuthPayload): Promise<{ user: AuthUserView }> {
    return request('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
  },

  me(): Promise<{ user: AuthUserView }> {
    return request('/api/auth/me');
  },

  logout(): Promise<{ ok: true }> {
    return request('/api/auth/logout', { method: 'POST' });
  },

  listClasses(): Promise<ClassView[]> {
    return request('/api/classes');
  },

  listStudents(classId: string): Promise<StudentView[]> {
    return request(`/api/classes/${classId}/students?showRealNames=true`);
  },

  getSession(sessionId: string): Promise<SessionDetailView> {
    return request(`/api/sessions/${sessionId}`);
  },

  listSessions(): Promise<SessionView[]> {
    return request('/api/sessions');
  },

  getSessionByCode(classroomCode: string): Promise<SessionDetailView> {
    return request(`/api/sessions/by-code/${encodeURIComponent(classroomCode)}`);
  },

  getLiveState(sessionId: string, showRealNames = false): Promise<SessionLiveStateView> {
    const params = showRealNames ? '?showRealNames=true' : '';
    return request(`/api/sessions/${sessionId}/live-state${params}`);
  },

  getStats(sessionId: string, questionId: string): Promise<QuestionStatsView> {
    return request(`/api/sessions/${sessionId}/questions/${questionId}/stats`);
  },

  getParticipants(
    sessionId: string,
    questionId: string,
    showRealNames = false
  ): Promise<QuestionParticipantView[]> {
    const params = showRealNames ? '?showRealNames=true' : '';
    return request(`/api/sessions/${sessionId}/questions/${questionId}/participants${params}`);
  },

  getReport(sessionId: string): Promise<SessionReportView> {
    return request(`/api/sessions/${sessionId}/report`);
  },

  getBinding(sessionId: string): Promise<SessionBindingView> {
    return request(`/api/sessions/${sessionId}/binding`);
  },

  hideSession(sessionId: string): Promise<{ deleted: true }> {
    return request(`/api/sessions/${sessionId}`, { method: 'DELETE' });
  },

  createDisplayPairing(displayId: string): Promise<DisplayPairingView> {
    return request('/api/displays/pairings', {
      method: 'POST',
      body: JSON.stringify({ displayId })
    });
  },

  getDisplayPairing(pairCode: string): Promise<DisplayPairingView> {
    return request(`/api/displays/pairings/${encodeURIComponent(pairCode)}`);
  },

  unbindDisplay(displayId: string): Promise<DisplayPairingView> {
    return request(`/api/displays/${encodeURIComponent(displayId)}/unbind`, { method: 'POST' });
  }
};

function formatError(data: unknown): string {
  if (typeof data !== 'object' || !data || !('message' in data)) {
    return '请求失败，请稍后重试';
  }
  const message = (data as { message: unknown }).message;
  if (Array.isArray(message)) {
    return Array.from(new Set(message.map((item) => translateMessage(String(item))))).join('；');
  }
  return translateMessage(String(message));
}

function translateMessage(message: string): string {
  const map: Record<string, string> = {
    'email must be an email': '请输入正确的邮箱地址',
    'password must be a string': '请输入密码',
    'password must be longer than or equal to 6 characters': '密码至少需要 6 位',
    'displayName must be a string': '请输入姓名',
    'property displayName should not exist': '登录只需要邮箱和密码',
    'property school should not exist': '登录只需要邮箱和密码',
    'property subject should not exist': '登录只需要邮箱和密码',
    'property phone should not exist': '登录只需要邮箱和密码',
    '邮箱或密码不正确': '邮箱或密码不正确',
    '邮箱已注册': '邮箱已注册',
    '请先登录': '请先登录'
  };
  return map[message] ?? message;
}
