import 'reflect-metadata';
import { describe, expect, it } from 'vitest';
import { HealthController } from '../src/modules/health/health.controller.js';
import { HealthService } from '../src/modules/health/health.service.js';

describe('HealthController', () => {
  it('返回 API 健康状态', () => {
    const controller = new HealthController(new HealthService());
    const result = controller.check();

    expect(result.status).toBe('ok');
    expect(result.service).toBe('api-server');
    expect(result.timestamp).toEqual(expect.any(String));
  });
});
