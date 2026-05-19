import { BadRequestException } from '@nestjs/common';
import { describe, expect, it } from 'vitest';
import { QuestionsService } from '../src/modules/questions/questions.service.js';
import { InMemoryQuestionsRepository } from '../src/modules/questions/repositories/in-memory-questions.repository.js';

function createService(): QuestionsService {
  return new QuestionsService(new InMemoryQuestionsRepository());
}

describe('QuestionsService', () => {
  it('创建单选题并查询题目列表', async () => {
    const service = createService();

    const question = await service.createQuestion({
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
    });

    expect(question.answer).toBe('C');
    expect(question.reviewStatus).toBe('approved');
    expect(await service.listQuestions()).toHaveLength(1);
  });

  it('拒绝没有对应选项的正确答案', async () => {
    const service = createService();

    await expect(
      service.createQuestion({
        subject: '数学',
        grade: '七年级',
        stem: '测试题',
        options: { A: '选项A', B: '选项B', C: '选项C', D: '' },
        answer: 'D',
        explanation: '解析',
        knowledgePoints: ['测试知识点'],
        difficulty: '基础'
      })
    ).rejects.toThrow(BadRequestException);
  });

  it('支持题目批量导入、修改和删除', async () => {
    const service = createService();
    const imported = await service.importQuestions({
      questions: [
        {
          subject: '数学',
          grade: '七年级',
          stem: '测试题1',
          options: { A: 'A1', B: 'B1', C: 'C1', D: 'D1' },
          answer: 'A',
          explanation: '解析1',
          knowledgePoints: ['知识点1'],
          difficulty: '基础'
        },
        {
          subject: '数学',
          grade: '七年级',
          stem: '测试题2',
          options: { A: 'A2', B: 'B2', C: 'C2', D: 'D2' },
          answer: 'B',
          explanation: '解析2',
          knowledgePoints: ['知识点2'],
          difficulty: '巩固'
        }
      ]
    });
    const firstId = imported.items[0]?.id ?? '';

    expect(imported.importedCount).toBe(2);
    expect(await service.updateQuestion(firstId, {
      subject: '数学',
      grade: '八年级',
      stem: '更新后的题目',
      options: { A: '新A', B: '新B', C: '新C', D: '新D' },
      answer: 'D',
      explanation: '新解析',
      knowledgePoints: ['新知识点'],
      difficulty: '提升'
    })).toMatchObject({ stem: '更新后的题目', answer: 'D' });
    expect(await service.deleteQuestion(firstId)).toEqual({ deleted: true });
    expect(await service.listQuestions()).toHaveLength(1);
  });
});
