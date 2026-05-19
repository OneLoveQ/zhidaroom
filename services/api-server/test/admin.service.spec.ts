import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { describe, expect, it } from 'vitest';
import { AdminService } from '../src/modules/admin/admin.service.js';
import type { AuthContext } from '../src/modules/auth/models/auth.models.js';

const adminAuth: AuthContext = {
  userId: 'admin_1',
  workspaceId: 'workspace_1',
  email: 'admin@example.com',
  displayName: '平台管理员',
  role: 'platform_admin'
};

function createService(targetRole: 'teacher' | 'platform_admin' = 'teacher') {
  const calls: Array<{ status: string; userId: string }> = [];
  const sqlite = {
    db: {
      prepare(sql: string) {
        if (sql.startsWith('SELECT id, role FROM users')) {
          return { get: (userId: string) => ({ id: userId, role: targetRole }) };
        }
        if (sql.startsWith('UPDATE users SET status')) {
          return { run: (status: string, userId: string) => calls.push({ status, userId }) };
        }
        return { all: () => [] };
      }
    }
  };
  return { service: new AdminService(sqlite as never), calls };
}

describe('AdminService', () => {
  it('拒绝非总管理员访问', () => {
    const { service } = createService();

    expect(() => service.assertAdmin({ ...adminAuth, role: 'teacher' })).toThrow(ForbiddenException);
  });

  it('允许总管理员停用普通教师账号', () => {
    const { service, calls } = createService();

    expect(service.updateUserStatus(adminAuth, 'teacher_1', 'disabled')).toEqual({ ok: true });
    expect(calls).toEqual([{ status: 'disabled', userId: 'teacher_1' }]);
  });

  it('拒绝非法用户状态', () => {
    const { service } = createService();

    expect(() => service.updateUserStatus(adminAuth, 'teacher_1', 'locked' as never)).toThrow(BadRequestException);
  });

  it('拒绝停用总管理员账号', () => {
    const { service } = createService('platform_admin');

    expect(() => service.updateUserStatus(adminAuth, 'admin_2', 'disabled')).toThrow(BadRequestException);
  });
});
