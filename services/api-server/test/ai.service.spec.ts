import { describe, expect, it } from 'vitest';
import { ServiceUnavailableException } from '@nestjs/common';
import { AiService } from '../src/modules/ai/ai.service.js';
import { MimoClient } from '../src/modules/ai/clients/mimo.client.js';
import {
  ClassLearningAnalysisView,
  SessionReportView,
  StudentLearningDetailView
} from '../src/modules/reports/models/report.models.js';

const generatedQuestion = {
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
  difficulty: '基础',
  commonMistakes: ['混淆正数和负数对不等号方向的影响']
};

class FakeMimoClient extends MimoClient {
  override complete(): Promise<string> {
    return Promise.resolve(
      JSON.stringify({
        items: [generatedQuestion]
      })
    );
  }
}

class StringKnowledgeMimoClient extends MimoClient {
  override complete(): Promise<string> {
    return Promise.resolve(
      JSON.stringify({
        items: [
          {
            ...generatedQuestion,
            knowledgePoints: '不等式性质',
            commonMistakes: '混淆正数和负数对不等号方向的影响'
          }
        ]
      })
    );
  }
}

class UnavailableMimoClient extends MimoClient {
  override complete(): Promise<string> {
    return Promise.reject(new ServiceUnavailableException('大模型服务尚未配置'));
  }
}

class LearningMimoClient extends MimoClient {
  override complete(): Promise<string> {
    return Promise.resolve(JSON.stringify({
      diagnosis: ['班级在诗句理解上错误集中。'],
      recommendations: ['下节课先讲评高频错题。']
    }));
  }
}

class FakeSqlite {
  readonly rows: unknown[][] = [];
  readonly db = {
    prepare: (sql: string) => ({
      run: (...values: unknown[]) => {
        this.rows.push(values);
      },
      all: () => this.rows.map((values) => ({
        id: values[0],
        scope: values[1],
        target_id: values[2],
        class_id: values[3],
        student_id: values[4],
        source: values[5],
        status: values[6],
        range_from: values[7],
        range_to: values[8],
        diagnosis_json: values[9],
        recommendations_json: values[10],
        created_at: values[11]
      }))
    })
  };
}

function createReport(): SessionReportView {
  return {
    sessionId: 'session_001',
    title: '出口检测',
    mode: 'exit_ticket',
    status: 'active',
    questionCount: 1,
    averageCorrectRate: 0.5,
    generatedAt: '2026-05-14T10:21:00+08:00',
    aiNotice: 'AI 生成内容需教师审核后使用。',
    questions: [
      {
        questionId: 'question_001',
        stem: '测试题',
        answer: 'C',
        knowledgePoints: ['不等式性质'],
        difficulty: '基础',
        stats: {
          total: 60,
          answered: 60,
          unanswered: 0,
          optionStats: { A: 30, B: 0, C: 30, D: 0 },
          correctRate: 0.5
        },
        misconception: '学生理解存在分化，可能混淆题目中的限制条件。',
        evidence: '已答 60/60，正确率 50%，未答 0。',
        teachingSuggestion: '存在明显分化，建议针对集中错误选项进行讲评。',
        followUpAction: '用 2 道变式题区分相近概念。'
      }
    ]
  };
}

function createClassAnalysis(): ClassLearningAnalysisView {
  return {
    classId: 'class_001',
    className: '三年级1班',
    generatedAt: '2026-05-25T10:00:00+08:00',
    summary: {
      sessionCount: 2,
      questionCount: 4,
      studentCount: 2,
      answeredCount: 6,
      totalAnswerSlots: 8,
      averageCorrectRate: 0.5,
      participationRate: 0.75,
      weakKnowledgeCount: 1,
      attentionStudentCount: 1
    },
    knowledgePoints: [
      {
        name: '诗句理解',
        questionCount: 2,
        answeredCount: 4,
        correctCount: 1,
        correctRate: 0.25,
        status: '重点讲评'
      }
    ],
    students: [
      {
        studentId: 'student_001',
        studentNo: '1001',
        displayName: '张三',
        answeredCount: 2,
        correctCount: 0,
        totalQuestionCount: 4,
        missedCount: 2,
        correctRate: 0,
        status: '参与不足',
        weakKnowledgePoints: ['诗句理解']
      }
    ],
    recentSessions: [],
    aiDiagnosis: ['班级累计正确率为 50%。']
  };
}

function createStudentDetail(): StudentLearningDetailView {
  return {
    classId: 'class_001',
    className: '三年级1班',
    studentId: 'student_001',
    studentNo: '1001',
    displayName: '张三',
    generatedAt: '2026-05-25T10:00:00+08:00',
    summary: {
      sessionCount: 2,
      totalQuestionCount: 4,
      answeredCount: 2,
      correctCount: 0,
      missedCount: 2,
      correctRate: 0,
      participationRate: 0.5
    },
    weakKnowledgePoints: [{ name: '诗句理解', totalCount: 2, wrongCount: 2, correctRate: 0 }],
    recentAnswers: [],
    aiDiagnosis: ['张三 累计参与 2/4 题。']
  };
}

describe('AiService', () => {
  it('生成待审核的 AI 题目', async () => {
    const service = new AiService(new FakeMimoClient());

    const result = await service.generateQuestions({
      subject: '数学',
      grade: '七年级',
      knowledgePoint: '不等式性质',
      count: 1,
      difficulty: '基础',
      questionType: 'single_choice',
      textbookVersion: '人教版'
    });

    expect(result.notice).toContain('教师审核');
    expect(result.record.type).toBe('question_generation');
    expect(result.record.status).toBe('success');
    expect(result.items[0]?.aiGenerated).toBe(true);
    expect(result.items[0]?.reviewStatus).toBe('pending');
  });

  it('兼容大模型把知识点返回成字符串', async () => {
    const service = new AiService(new StringKnowledgeMimoClient());

    const result = await service.generateQuestions({
      subject: '数学',
      grade: '七年级',
      knowledgePoint: '不等式性质',
      count: 1,
      difficulty: '基础',
      questionType: 'single_choice'
    });

    expect(result.items[0]?.knowledgePoints).toEqual(['不等式性质']);
    expect(result.items[0]?.commonMistakes).toEqual(['混淆正数和负数对不等号方向的影响']);
  });

  it('大模型未配置时使用匿名聚合数据生成规则兜底诊断', async () => {
    const service = new AiService(new UnavailableMimoClient());

    const result = await service.diagnoseSessionReport(createReport());

    expect(result.source).toBe('rule');
    expect(result.record.status).toBe('fallback');
    expect(result.items[0]).toMatchObject({
      questionId: 'question_001',
      riskLevel: 'medium',
      teachingSuggestion: '存在明显分化，建议针对集中错误选项进行讲评。'
    });
    expect(JSON.stringify(result)).not.toContain('张三');
    expect(service.listRecords()).toHaveLength(1);
  });

  it('为班级累计学情生成大模型诊断', async () => {
    const service = new AiService(new LearningMimoClient());

    const result = await service.diagnoseClassLearning(createClassAnalysis());

    expect(result.source).toBe('model');
    expect(result.record.type).toBe('class_learning_diagnosis');
    expect(result.diagnosis[0]).toContain('诗句理解');
    expect(result.recommendations[0]).toContain('讲评');
  });

  it('保存并读取学情 AI 诊断历史', async () => {
    const sqlite = new FakeSqlite();
    const service = new AiService(new LearningMimoClient(), sqlite as never);

    await service.diagnoseClassLearning(createClassAnalysis(), {
      from: '2026-05-01',
      to: '2026-05-25'
    });
    const records = service.listLearningDiagnosisRecords('class', 'class_001');

    expect(records[0]).toMatchObject({
      scope: 'class',
      targetId: 'class_001',
      rangeFrom: '2026-05-01',
      rangeTo: '2026-05-25',
      source: 'model'
    });
    expect(records[0]?.diagnosis[0]).toContain('诗句理解');
  });

  it('学生个人学情在大模型不可用时提供规则兜底建议', async () => {
    const service = new AiService(new UnavailableMimoClient());

    const result = await service.diagnoseStudentLearning(createStudentDetail());

    expect(result.source).toBe('rule');
    expect(result.record.type).toBe('student_learning_diagnosis');
    expect(result.diagnosis[0]).toContain('张三');
    expect(result.recommendations[0]).toContain('诗句理解');
  });
});
