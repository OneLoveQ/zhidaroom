import { createHmac, timingSafeEqual } from 'node:crypto';

const FALLBACK_SECRET = 'zhida-local-mobile-bind-secret';

export function createMobileBindToken(sessionId: string): string {
  return createHmac('sha256', secret()).update(sessionId).digest('base64url');
}

export function verifyMobileBindToken(sessionId: string, token: string): boolean {
  const expected = Buffer.from(createMobileBindToken(sessionId));
  const actual = Buffer.from(token);
  return expected.length === actual.length && timingSafeEqual(expected, actual);
}

function secret(): string {
  return process.env.MOBILE_BIND_SECRET ?? process.env.AUTH_SECRET ?? FALLBACK_SECRET;
}
