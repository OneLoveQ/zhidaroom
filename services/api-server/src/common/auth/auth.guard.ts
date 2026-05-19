import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { AuthService } from '../../modules/auth/auth.service.js';
import { AuthenticatedRequest, readAuthToken } from './auth-request.js';
import { verifyMobileBindToken } from './mobile-bind-token.js';
import { SqliteService } from '../sqlite/sqlite.service.js';

interface SessionAuthRow {
  id: string;
  workspace_id: string | null;
  teacher_user_id: string | null;
  teacher_id: string;
}

interface PairingAuthRow {
  pair_code: string;
  workspace_id: string | null;
  teacher_user_id: string | null;
  status: string;
  expires_at: string;
}

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(
    private readonly authService: AuthService,
    private readonly sqlite: SqliteService
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest & { method?: string; url?: string }>();
    const url = request.url ?? '';
    if (url.startsWith('/api/auth') || url.startsWith('/api/health') || url === '/api') {
      return true;
    }
    const token = readAuthToken(request);
    if (token) {
      request.auth = await this.authService.resolveToken(token);
      return true;
    }
    if (this.resolveMobileBinding(request, url, request.method ?? 'GET')) {
      return true;
    }
    if (this.resolveDisplayPairing(request, url, request.method ?? 'GET')) {
      return true;
    }
    throw new UnauthorizedException('请先登录');
  }

  private resolveMobileBinding(request: AuthenticatedRequest, url: string, method: string): boolean {
    const bindToken = readHeader(request, 'x-zhida-mobile-bind-token');
    if (!bindToken) return false;
    const sessionId = readHeader(request, 'x-zhida-mobile-session-id') ?? readSessionIdFromPath(url);
    if (!sessionId || !isMobileAllowedPath(url, sessionId, method)) {
      throw new UnauthorizedException('手机端课堂绑定无效');
    }
    if (!verifyMobileBindToken(sessionId, bindToken)) {
      throw new UnauthorizedException('手机端课堂绑定已失效');
    }
    const row = this.sqlite.db
      .prepare('SELECT id, workspace_id, teacher_user_id, teacher_id FROM sessions WHERE id = ?')
      .get(sessionId) as unknown as SessionAuthRow | undefined;
    if (!row) throw new UnauthorizedException('课堂不存在');
    request.auth = {
      userId: row.teacher_user_id ?? row.teacher_id,
      workspaceId: row.workspace_id ?? 'demo_workspace',
      email: 'mobile-scanner@local',
      displayName: '教师扫码端'
    };
    return true;
  }

  private resolveDisplayPairing(request: AuthenticatedRequest, url: string, method: string): boolean {
    const pairCode = readHeader(request, 'x-zhida-display-pair-code');
    if (!pairCode) return false;
    if (!isPairingAllowedPath(url, method)) {
      throw new UnauthorizedException('大屏配对权限不足');
    }
    const row = this.sqlite.db
      .prepare('SELECT pair_code, workspace_id, teacher_user_id, status, expires_at FROM display_pairings WHERE pair_code = ?')
      .get(pairCode) as unknown as PairingAuthRow | undefined;
    if (!row || row.status === 'expired' || isExpiredWaitingPairing(row)) {
      throw new UnauthorizedException('大屏配对码已失效');
    }
    request.auth = {
      userId: row.teacher_user_id ?? 'teacher_demo',
      workspaceId: row.workspace_id ?? 'demo_workspace',
      email: 'mobile-pairing@local',
      displayName: '教师扫码端'
    };
    return true;
  }
}

function isExpiredWaitingPairing(row: PairingAuthRow): boolean {
  return row.status === 'waiting' && new Date(row.expires_at).getTime() <= Date.now();
}

function readHeader(request: AuthenticatedRequest, name: string): string | undefined {
  const value = request.headers[name];
  return Array.isArray(value) ? value[0] : value;
}

function readSessionIdFromPath(url: string): string | undefined {
  return url.match(/^\/api\/sessions\/([^/?]+)/)?.[1];
}

function isMobileAllowedPath(url: string, sessionId: string, method: string): boolean {
  return (
    url.startsWith(`/api/sessions/${sessionId}`) ||
    (method === 'GET' && url.startsWith('/api/classes')) ||
    url.startsWith('/api/questions') ||
    url.startsWith('/api/ai/questions')
  );
}

function isPairingAllowedPath(url: string, method: string): boolean {
  return (
    (method === 'GET' && url.startsWith('/api/classes')) ||
    url.startsWith('/api/questions') ||
    url.startsWith('/api/ai/questions') ||
    url.startsWith('/api/sessions') ||
    url.startsWith('/api/displays/pairings/')
  );
}
