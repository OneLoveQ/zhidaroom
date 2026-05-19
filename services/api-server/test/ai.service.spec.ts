import { describe, expect, it } from 'vitest';
import { ServiceUnavailableException } from '@nestjs/common';
import { AiService } from '../src/modules/ai/ai.service.js';
import { MimoClient } from '../src/modules/ai/clients/mimo.client.js';
import { SessionReportView } from '../src/modules/reports/models/report.models.js';

class FakeMimoClient extends MimoClient {
  override complete(): Promise<string> {
    return Promise.resolve(
      JSON.stringify({
        items: [
          {
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
});
