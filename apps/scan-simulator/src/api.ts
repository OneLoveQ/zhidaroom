import type {
  BatchResultView,
  ClassView,
  OptionKey,
  QuestionStatsView,
  QuestionView,
  SessionDetailView
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
    throw new Error(JSON.stringify(data));
  }
  return data;
}

export const api = {
  createClass(): Promise<ClassView> {
    return request('/api/classes', {
      method: 'POST',
      body: JSON.stringify({ grade: '七年级', name: `模拟${Date.now()}班` })
    });
  },

  importStudents(classId: string, count: number): Promise<unknown> {
    const students = Array.from({ length: count }, (_, index) => {
      const no = String(index + 1).padStart(3, '0');
      return { studentNo: `2026${no}`, name: `学生${no}`, cardCode: `C${no}` };
    });
    return request(`/api/classes/${classId}/students/import`, {
      method: 'POST',
      body: JSON.stringify({ students })
    });
  },

  createQuestion(): Promise<QuestionView> {
    return request('/api/questions', {
      method: 'POST',
      body: JSON.stringify({
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

  async createActiveSession(classId: string, questionId: string): Promise<SessionDetailView> {
    const session = await request<SessionDetailView>('/api/sessions', {
      method: 'POST',
      body: JSON.stringify({
        classId,
        title: '60 人扫码模拟出口检测',
        mode: 'exit_ticket',
        questionIds: [questionId]
      })
    });
    return request(`/api/sessions/${session.id}/start`, { method: 'POST' });
  },

  submitAnswers(
    sessionId: string,
    questionId: string,
    count: number,
    offset = 0
  ): Promise<BatchResultView> {
    const options: OptionKey[] = ['A', 'B', 'C', 'D'];
    const answers = Array.from({ length: count }, (_, index) => {
      const cardIndex = index + 1;
      const no = String(cardIndex).padStart(3, '0');
      const selectedOption = options[(index + offset) % options.length];
      return {
        cardCode: `C${no}`,
        selectedOption,
        recognitionScore: Number((0.86 + ((index % 14) / 100)).toFixed(2)),
        recognizedAt: new Date(Date.now() + index * 300).toISOString()
      };
    });
    return request(`/api/sessions/${sessionId}/answers/batch`, {
      method: 'POST',
      body: JSON.stringify({ questionId, deviceId: 'scan_simulator_web', answers })
    });
  },

  getStats(sessionId: string, questionId: string): Promise<QuestionStatsView> {
    return request(`/api/sessions/${sessionId}/questions/${questionId}/stats`);
  }
};
