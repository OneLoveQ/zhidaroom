import { BadRequestException, Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import { randomBytes, randomUUID, scryptSync, timingSafeEqual } from 'node:crypto';
import { LoginDto, RegisterDto } from './dto/auth.dto.js';
import {
  AuthContext,
  AuthRepository,
  AuthSessionEntity,
  AuthUserView,
  UserEntity,
  WorkspaceEntity
} from './models/auth.models.js';

const SESSION_DAYS = 14;

@Injectable()
export class AuthService {
  constructor(@Inject('AuthRepository') private readonly repository: AuthRepository) {}

  async register(dto: RegisterDto): Promise<{ token: string; user: AuthUserView }> {
    const email = dto.email.trim().toLowerCase();
    if (await this.repository.findUserByEmail(email)) throw new BadRequestException('邮箱已注册');
    const now = new Date();
    const user: UserEntity = {
      id: randomUUID(), email, passwordHash: hashPassword(dto.password), displayName: dto.displayName.trim(),
      phone: dto.phone, school: dto.school, subject: dto.subject, status: 'active', role: 'teacher', createdAt: now
    };
    const workspace: WorkspaceEntity = {
      id: randomUUID(), type: 'personal', name: `${user.displayName}的个人空间`,
      schoolName: dto.school, ownerUserId: user.id, createdAt: now
    };
    await this.repository.saveUser(user);
    await this.repository.saveWorkspace(workspace);
    await this.repository.saveMember({
      id: randomUUID(), workspaceId: workspace.id, userId: user.id,
      role: 'owner', status: 'active', createdAt: now
    });
    const token = await this.createSession(user.id, workspace.id);
    return { token, user: this.toUserView(user, workspace) };
  }

  async login(dto: LoginDto): Promise<{ token: string; user: AuthUserView }> {
    const user = await this.repository.findUserByEmail(dto.email.trim().toLowerCase());
    if (!user || !verifyPassword(dto.password, user.passwordHash)) {
      throw new UnauthorizedException('邮箱或密码不正确');
    }
    if (user.status === 'disabled') throw new UnauthorizedException('账号已停用');
    const workspace = await this.repository.findDefaultWorkspace(user.id);
    if (!workspace) throw new UnauthorizedException('用户空间不存在');
    const token = await this.createSession(user.id, workspace.id);
    return { token, user: this.toUserView(user, workspace) };
  }

  async me(token: string): Promise<AuthUserView> {
    const context = await this.resolveToken(token);
    const user = await this.repository.findUserById(context.userId);
    const workspace = await this.repository.findDefaultWorkspace(context.userId);
    if (!user || !workspace) throw new UnauthorizedException('登录已失效');
    return this.toUserView(user, workspace);
  }

  async resolveToken(token: string): Promise<AuthContext> {
    const session = await this.repository.findSession(token);
    if (!session || session.expiresAt.getTime() <= Date.now()) {
      throw new UnauthorizedException('请先登录');
    }
    const user = await this.repository.findUserById(session.userId);
    const workspace = await this.repository.findDefaultWorkspace(session.userId);
    if (!user || !workspace || workspace.id !== session.workspaceId) {
      throw new UnauthorizedException('登录已失效');
    }
    return { userId: user.id, workspaceId: workspace.id, email: user.email, displayName: user.displayName, role: user.role };
  }

  logout(token: string): Promise<void> {
    return this.repository.deleteSession(token);
  }

  private async createSession(userId: string, workspaceId: string): Promise<string> {
    const token = randomBytes(32).toString('hex');
    const now = new Date();
    const entity: AuthSessionEntity = {
      token, userId, workspaceId, createdAt: now,
      expiresAt: new Date(now.getTime() + SESSION_DAYS * 24 * 60 * 60 * 1000)
    };
    await this.repository.saveSession(entity);
    return token;
  }

  private toUserView(user: UserEntity, workspace: WorkspaceEntity): AuthUserView {
    return {
      id: user.id, email: user.email, displayName: user.displayName, phone: user.phone,
      school: user.school, subject: user.subject, role: user.role, workspaceId: workspace.id,
      workspaceName: workspace.name, workspaceType: workspace.type
    };
  }
}

function hashPassword(password: string): string {
  const salt = randomBytes(16).toString('hex');
  return `${salt}:${scryptSync(password, salt, 32).toString('hex')}`;
}

function verifyPassword(password: string, stored: string): boolean {
  const [salt, hash] = stored.split(':');
  if (!salt || !hash) return false;
  const actual = scryptSync(password, salt, 32);
  const expected = Buffer.from(hash, 'hex');
  return expected.length === actual.length && timingSafeEqual(actual, expected);
}
