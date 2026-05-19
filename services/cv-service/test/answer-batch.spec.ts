import { describe, expect, it } from 'vitest';
import { AnswerBatchCollector } from '../src/answer-batch.js';
import type { ConfirmedAnswer } from '../src/frame-confirmation.js';

describe('AnswerBatchCollector', () => {
  it('生成后端批量答题接口 payload', () => {
    const collector = new AnswerBatchCollector('question_001', 'phone_001');

    collector.accept(createAnswer('C001', 'A', '2026-05-16T10:00:00+08:00'));
    collector.accept(createAnswer('C002', 'D', '2026-05-16T10:00:01+08:00'));

    expect(collector.toPayload()).toEqual({
      questionId: 'question_001',
      deviceId: 'phone_001',
      answers: [
        createAnswer('C001', 'A', '2026-05-16T10:00:00+08:00'),
        createAnswer('C002', 'D', '2026-05-16T10:00:01+08:00')
      ]
    });
  });

  it('同一卡号重复确认时只保留最新答案', () => {
    const collector = new AnswerBatchCollector('question_001', 'phone_001');

    collector.accept(createAnswer('C009', 'A', '2026-05-16T10:00:00+08:00'));
    collector.accept(createAnswer('C009', 'C', '2026-05-16T10:00:02+08:00'));

    expect(collector.size()).toBe(1);
    expect(collector.toPayload().answers).toEqual([
      createAnswer('C009', 'C', '2026-05-16T10:00:02+08:00')
    ]);
  });

  it('drain 后清空已输出答案', () => {
    const collector = new AnswerBatchCollector('question_001', 'phone_001');

    collector.accept(createAnswer('C010', 'B', '2026-05-16T10:00:00+08:00'));

    expect(collector.drain().answers).toHaveLength(1);
    expect(collector.isReady()).toBe(false);
  });
});

function createAnswer(
  cardCode: string,
  selectedOption: ConfirmedAnswer['selectedOption'],
  recognizedAt: string
): ConfirmedAnswer {
  return { cardCode, selectedOption, recognitionScore: 1, recognizedAt };
}
