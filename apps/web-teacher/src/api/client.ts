import type {
  ClassView,
  AiLearningDiagnosisRecordView,
  ClassLearningAnalysisView,
  AiLearningDiagnosisResult,
  AiQuestionResult,
  AuthPayload,
  AuthUserView,
  CreateClassPayload,
  CreateQuestionPayload,
  GenerateQuestionsPayload,
  ImportStudentsResult,
  ImportQuestionsResult,
  QuestionView,
  RecognizeQuestionImagePayload,
  SessionReportView,
  StudentImportItem,
  StudentLearningDetailView,
  StudentView,
  LearningAnalysisRange,
  UpdateStudentPayload
} from '../types';

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
    throw new Error(`HTTP ${response.status}: ${formatError(data)}`);
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

  updateProfile(payload: {
    displayName: string;
    school?: string;
    subject?: string;
    phone?: string;
  }): Promise<{ user: AuthUserView }> {
    return request('/api/auth/me', {
      method: 'PUT',
      body: JSON.stringify(payload)
    });
  },

  changePassword(payload: {
    currentPassword: string;
    newPassword: string;
  }): Promise<{ ok: true }> {
    return request('/api/auth/password', {
      method: 'PUT',
      body: JSON.stringify(payload)
    });
  },

  createClass(payload: CreateClassPayload = { grade: '七年级', name: '1班' }): Promise<ClassView> {
    return request('/api/classes', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
  },

  listClasses(): Promise<ClassView[]> {
    return request('/api/classes');
  },

  getClassLearningAnalysis(
    classId: string,
    range?: LearningAnalysisRange
  ): Promise<ClassLearningAnalysisView> {
    return request(withRange(`/api/reports/classes/${classId}/learning`, range));
  },

  getStudentLearningAnalysis(
    classId: string,
    studentId: string,
    range?: LearningAnalysisRange
  ): Promise<StudentLearningDetailView> {
    return request(withRange(`/api/reports/classes/${classId}/students/${studentId}/learning`, range));
  },

  getSessionReport(sessionId: string): Promise<SessionReportView> {
    return request(`/api/sessions/${sessionId}/report`);
  },

  diagnoseClassLearning(
    classId: string,
    range?: LearningAnalysisRange
  ): Promise<AiLearningDiagnosisResult> {
    return request(withRange(`/api/ai/reports/classes/${classId}/diagnose`, range), { method: 'POST' });
  },

  diagnoseStudentLearning(
    classId: string,
    studentId: string,
    range?: LearningAnalysisRange
  ): Promise<AiLearningDiagnosisResult> {
    return request(withRange(`/api/ai/reports/classes/${classId}/students/${studentId}/diagnose`, range), { method: 'POST' });
  },

  listClassLearningHistory(classId: string): Promise<AiLearningDiagnosisRecordView[]> {
    return request(`/api/ai/reports/classes/${classId}/diagnoses`);
  },

  listStudentLearningHistory(
    classId: string,
    studentId: string
  ): Promise<AiLearningDiagnosisRecordView[]> {
    return request(`/api/ai/reports/classes/${classId}/students/${studentId}/diagnoses`);
  },

  updateClass(classId: string, payload: CreateClassPayload): Promise<ClassView> {
    return request(`/api/classes/${classId}`, {
      method: 'PUT',
      body: JSON.stringify(payload)
    });
  },

  deleteClass(classId: string): Promise<{ deleted: true }> {
    return request(`/api/classes/${classId}`, { method: 'DELETE' });
  },

  importStudents(
    classId: string,
    students: StudentImportItem[] = [
      { studentNo: '20260101', name: '张三', cardCode: 'C001' },
      { studentNo: '20260102', name: '李四', cardCode: 'C002' }
    ]
  ): Promise<ImportStudentsResult> {
    return request(`/api/classes/${classId}/students/import`, {
      method: 'POST',
      body: JSON.stringify({ students })
    });
  },

  listStudents(classId: string): Promise<StudentView[]> {
    return request(`/api/classes/${classId}/students?showRealNames=true`);
  },

  createStudent(classId: string, payload: UpdateStudentPayload): Promise<StudentView> {
    return request(`/api/classes/${classId}/students`, {
      method: 'POST',
      body: JSON.stringify(payload)
    });
  },

  updateStudent(
    classId: string,
    studentId: string,
    payload: UpdateStudentPayload
  ): Promise<StudentView> {
    return request(`/api/classes/${classId}/students/${studentId}`, {
      method: 'PUT',
      body: JSON.stringify(payload)
    });
  },

  deleteStudent(classId: string, studentId: string): Promise<{ deleted: true }> {
    return request(`/api/classes/${classId}/students/${studentId}`, { method: 'DELETE' });
  },

  createQuestion(payload?: CreateQuestionPayload): Promise<QuestionView> {
    return request('/api/questions', {
      method: 'POST',
      body: JSON.stringify(payload ?? {
        subject: '数学',
        grade: '七年级',
        stem: '下列不等式变形正确的是？',
        options: {
          A: '两边同乘负数，不等号方向不变',
          B: '两边同加同一个数，不等号方向改变',
          C: '两边同乘正数，不等号方向不变',
          D: '两边同除正数，不等号方向改变'
        },
        answer: 'C',
        explanation: '不等式两边同乘正数，不等号方向不变。',
        knowledgePoints: ['不等式性质'],
        difficulty: '基础'
      })
    });
  },

  listQuestions(): Promise<QuestionView[]> {
    return request('/api/questions');
  },

  importQuestions(questions: CreateQuestionPayload[]): Promise<ImportQuestionsResult> {
    return request('/api/questions/import', {
      method: 'POST',
      body: JSON.stringify({ questions })
    });
  },

  updateQuestion(questionId: string, payload: CreateQuestionPayload): Promise<QuestionView> {
    return request(`/api/questions/${questionId}`, {
      method: 'PUT',
      body: JSON.stringify(payload)
    });
  },

  deleteQuestion(questionId: string): Promise<{ deleted: true }> {
    return request(`/api/questions/${questionId}`, { method: 'DELETE' });
  },

  generateQuestions(payload: GenerateQuestionsPayload): Promise<AiQuestionResult> {
    return request('/api/ai/questions/generate', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
  },

  recognizeQuestionImage(payload: RecognizeQuestionImagePayload): Promise<AiQuestionResult> {
    return request('/api/ai/questions/recognize-image', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
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
    'The string did not match the expected pattern.': '链接格式不正确，请重新扫码或刷新页面',
    'Failed to fetch': '网络请求失败，请检查服务是否已启动',
    'Load failed': '网络请求失败，请检查网络连接',
    'email must be an email': '请输入正确的邮箱地址',
    'password must be a string': '请输入密码',
    'password must be longer than or equal to 6 characters': '密码至少需要 6 位',
    'newPassword must be longer than or equal to 6 characters': '新密码至少需要 6 位',
    'currentPassword must be a string': '请输入当前密码',
    'newPassword must be a string': '请输入新密码',
    'displayName must be a string': '请输入姓名',
    'displayName should not be empty': '请输入姓名',
    'property displayName should not exist': '登录只需要邮箱和密码',
    'property school should not exist': '登录只需要邮箱和密码',
    'property subject should not exist': '登录只需要邮箱和密码',
    'property phone should not exist': '登录只需要邮箱和密码',
    '邮箱或密码不正确': '邮箱或密码不正确',
    '邮箱已注册': '邮箱已注册',
    '当前密码不正确': '当前密码不正确',
    '请先登录': '请先登录'
  };
  return map[message] ?? message;
}

export function toChineseError(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error);
  if (message.startsWith('HTTP ')) return message;
  return translateMessage(message);
}

function withRange(url: string, range?: LearningAnalysisRange): string {
  const params = new URLSearchParams();
  if (range?.from) params.set('from', range.from);
  if (range?.to) params.set('to', range.to);
  if (range?.subject) params.set('subject', range.subject);
  if (range?.limit) params.set('limit', String(range.limit));
  if (range?.offset) params.set('offset', String(range.offset));
  const query = params.toString();
  return query ? `${url}?${query}` : url;
}
