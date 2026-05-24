import { describe, expect, it } from 'vitest';
import type { ExecutionContext } from '@nestjs/common';
import { AuthGuard } from '../src/common/auth/auth.guard.js';
import type { AuthService } from '../src/modules/auth/auth.service.js';
import type { SqliteService } from '../src/common/sqlite/sqlite.service.js';

describe('AuthGuard', () => {
  it('大屏配对 header 优先于同域登录 cookie', async () => {
    const request = {
      method: 'GET',
      url: '/api/classes',
      headers: {
        cookie: 'zhida_token=old-session',
        'x-zhida-display-pair-code': 'D-TEST'
      }
    };
    const guard = new AuthGuard(
      {
        resolveToken: async () => ({
          userId: 'cookie_user',
          workspaceId: 'cookie_workspace',
          email: 'cookie@example.com',
          displayName: 'Cookie 用户',
          role: 'teacher'
        })
      } as unknown as AuthService,
      {
        db: {
          prepare: () => ({
            get: () => ({
              pair_code: 'D-TEST',
              workspace_id: 'pair_workspace',
              teacher_user_id: 'pair_teacher',
              status: 'waiting',
              expires_at: new Date(Date.now() + 60_000).toISOString()
            })
          })
        }
      } as unknown as SqliteService
    );

    await expect(guard.canActivate(createContext(request))).resolves.toBe(true);
    expect(request.auth).toMatchObject({
      userId: 'pair_teacher',
      workspaceId: 'pair_workspace',
      email: 'mobile-pairing@local'
    });
  });
});

function createContext(request: object): ExecutionContext {
  return {
    switchToHttp: () => ({
      getRequest: () => request
    })
  } as unknown as ExecutionContext;
}
