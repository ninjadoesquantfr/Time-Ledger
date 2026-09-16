import { cookies } from 'next/headers';
import { createHmac, randomBytes } from 'crypto';

const CSRF_COOKIE = 'tl_csrf';
const SECRET = process.env.SESSION_SECRET || 'dev-session-secret-fallback-key-time-ledger';

function signToken(token: string): string {
  return createHmac('sha256', SECRET).update(token).digest('base64url');
}

export async function generateCsrfToken(): Promise<string> {
  const token = randomBytes(32).toString('base64url');
  const cookieStore = await cookies();
  cookieStore.set(CSRF_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    path: '/',
  });
  return `${token}.${signToken(token)}`;
}

export async function validateCsrfToken(headerToken: string | null): Promise<boolean> {
  if (!headerToken) return false;
  const [token, sig] = headerToken.split('.');
  if (!token || !sig) return false;
  const cookieStore = await cookies();
  const cookieToken = cookieStore.get(CSRF_COOKIE)?.value;
  if (!cookieToken || cookieToken !== token) return false;
  return signToken(token) === sig;
}
