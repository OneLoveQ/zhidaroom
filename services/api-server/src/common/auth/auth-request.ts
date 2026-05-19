import { AuthContext } from '../../modules/auth/models/auth.models.js';

export interface AuthenticatedRequest {
  headers: Record<string, string | string[] | undefined>;
  auth?: AuthContext;
}

export function readAuthToken(request: AuthenticatedRequest): string | undefined {
  const authorization = request.headers.authorization;
  const value = Array.isArray(authorization) ? authorization[0] : authorization;
  if (value?.startsWith('Bearer ')) return value.slice(7);
  const cookie = request.headers.cookie;
  const cookieValue = Array.isArray(cookie) ? cookie.join(';') : cookie;
  return cookieValue
    ?.split(';')
    .map((item) => item.trim())
    .find((item) => item.startsWith('zhida_token='))
    ?.slice('zhida_token='.length);
}
