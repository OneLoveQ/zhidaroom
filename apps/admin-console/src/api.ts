import type {
  AdminClassView,
  AdminQuestionView,
  AdminSessionView,
  AdminStudentView,
  AdminUserView,
  AdminWorkspaceView,
  AuthUserView,
  UserStatus
} from './types';

async function request<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, {
    ...init,
    headers: { 'Content-Type': 'application/json', ...init?.headers }
  });
  const data = (await response.json()) as T;
  if (!response.ok) throw new Error(formatError(data));
  return data;
}

export const api = {
  login(email: string, password: string): Promise<{ user: AuthUserView }> {
    return request('/api/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) });
  },
  me(): Promise<{ user: AuthUserView }> {
    return request('/api/auth/me');
  },
  logout(): Promise<{ ok: true }> {
    return request('/api/auth/logout', { method: 'POST' });
  },
  users(): Promise<AdminUserView[]> {
    return request('/api/admin/users');
  },
  updateUserStatus(userId: string, status: UserStatus): Promise<{ ok: true }> {
    return request(`/api/admin/users/${userId}/status`, { method: 'PATCH', body: JSON.stringify({ status }) });
  },
  workspaces(): Promise<AdminWorkspaceView[]> {
    return request('/api/admin/workspaces');
  },
  classes(): Promise<AdminClassView[]> {
    return request('/api/admin/classes');
  },
  students(classId: string): Promise<AdminStudentView[]> {
    return request(`/api/admin/classes/${classId}/students`);
  },
  questions(): Promise<AdminQuestionView[]> {
    return request('/api/admin/questions');
  },
  sessions(): Promise<AdminSessionView[]> {
    return request('/api/admin/sessions');
  }
};

function formatError(data: unknown): string {
  if (typeof data !== 'object' || !data || !('message' in data)) return '请求失败，请稍后重试';
  const message = (data as { message: unknown }).message;
  return Array.isArray(message) ? message.join('；') : String(message);
}
