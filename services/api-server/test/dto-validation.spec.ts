import 'reflect-metadata';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { describe, expect, it } from 'vitest';
import { BatchAnswersDto } from '../src/modules/answers/dto/batch-answers.dto.js';
import { CreateRunDto } from '../src/modules/runs/dto/create-run.dto.js';
import { CreateSessionDto } from '../src/modules/sessions/dto/create-session.dto.js';

describe('DTO validation', () => {
  it('创建课堂允许业务 ID，不强制 UUID', async () => {
    const dto = plainToInstance(CreateSessionDto, {
      classId: 'class_001',
      title: '随堂检测',
      mode: 'exit_ticket',
      questionIds: ['question_001']
    });

    expect(await validate(dto)).toHaveLength(0);
  });

  it('创建评测允许业务题目 ID', async () => {
    const dto = plainToInstance(CreateRunDto, {
      title: '第一轮答题',
      type: 'exit_ticket',
      questionIds: ['question_001']
    });

    expect(await validate(dto)).toHaveLength(0);
  });

  it('批量提交答案允许业务题目 ID', async () => {
    const dto = plainToInstance(BatchAnswersDto, {
      questionId: 'question_001',
      deviceId: 'scanner_001',
      answers: [
        {
          cardCode: 'C001',
          selectedOption: 'A',
          recognitionScore: 0.98,
          recognizedAt: '2026-05-25T10:00:00+08:00'
        }
      ]
    });

    expect(await validate(dto)).toHaveLength(0);
  });
});
