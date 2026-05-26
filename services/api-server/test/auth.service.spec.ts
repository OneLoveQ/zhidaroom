import { BadRequestException } from '@nestjs/common';
import { describe, expect, it } from 'vitest';
import { AuthService } from '../src/modules/auth/auth.service.js';
import type {
  AuthRepository,
  AuthSessionEntity,
  UserEntity,
  WorkspaceEntity,
  WorkspaceMemberEntity
} from '../src/modules/auth/models/auth.models.js';

class MemoryAuthRepository implements AuthRepository {
  readonly users = new Map<string, UserEntity>();
  readonly workspaces = new Map<string, WorkspaceEntity>();
  readonly sessions = new Map<string, AuthSessionEntity>();

  async saveUser(entity: UserEntity): Promise<void> {
    this.users.set(entity.id, entity);
  }

  async updateUser(entity: UserEntity): Promise<void> {
    this.users.set(entity.id, entity);
  }

  async findUserByEmail(email: string): Promise<UserEntity | undefined> {
    return Array.from(this.users.values()).find((user) => user.email === email);
  }

  async findUserById(userId: string): Promise<UserEntity | undefined> {
    return this.users.get(userId);
  }

  async saveWorkspace(entity: WorkspaceEntity): Promise<void> {
    this.workspaces.set(entity.id, entity);
  }

  async saveMember(_entity: WorkspaceMemberEntity): Promise<void> {}

  async findDefaultWorkspace(userId: string): Promise<WorkspaceEntity | undefined> {
    return Array.from(this.workspaces.values()).find((workspace) => workspace.ownerUserId === userId);
  }

  async saveSession(entity: AuthSessionEntity): Promise<void> {
    this.sessions.set(entity.token, entity);
  }

  async findSession(token: string): Promise<AuthSessionEntity | undefined> {
    return this.sessions.get(token);
  }

  async deleteSession(token: string): Promise<void> {
    this.sessions.delete(token);
  }
}

describe('AuthService', () => {
  it('支持教师修改个人资料', async () => {
    const service = new AuthService(new MemoryAuthRepository());
    const registered = await service.register({
      email: 'teacher@example.com',
      password: 'oldpass1',
      displayName: '张老师',
      school: '第一小学',
      subject: '语文',
      phone: '13000000000'
    });

    const user = await service.updateProfile(registered.token, {
      displayName: '李老师',
      school: '第二小学',
      subject: '数学',
      phone: '13900000000'
    });

    expect(user).toMatchObject({
      displayName: '李老师',
      school: '第二小学',
      subject: '数学',
      phone: '13900000000',
      workspaceName: '李老师的个人空间'
    });
  });

  it('支持教师修改密码并校验旧密码', async () => {
    const service = new AuthService(new MemoryAuthRepository());
    const registered = await service.register({
      email: 'teacher@example.com',
      password: 'oldpass1',
      displayName: '张老师'
    });

    await expect(service.changePassword(registered.token, {
      currentPassword: 'wrongpass',
      newPassword: 'newpass1'
    })).rejects.toThrow(BadRequestException);

    await expect(service.changePassword(registered.token, {
      currentPassword: 'oldpass1',
      newPassword: 'newpass1'
    })).resolves.toEqual({ ok: true });
    await expect(service.login({ email: 'teacher@example.com', password: 'oldpass1' })).rejects.toThrow();
    await expect(service.login({ email: 'teacher@example.com', password: 'newpass1' })).resolves.toBeTruthy();
  });
});
