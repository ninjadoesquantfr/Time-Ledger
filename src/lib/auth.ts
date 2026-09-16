import bcrypt from 'bcryptjs';
import { cookies } from 'next/headers';
import { prisma } from './db';

const SESSION_COOKIE = 'tl_session';
const SESSION_SECRET = process.env.SESSION_SECRET!;
const BCRYPT_ROUNDS = 12;

// ---------- Password ----------

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, BCRYPT_ROUNDS);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

// ---------- Session token (HMAC-signed) ----------

function base64url(str: string): string {
  if (typeof Buffer !== 'undefined') {
    return Buffer.from(str).toString('base64url');
  }
  return btoa(unescape(encodeURIComponent(str)))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

function fromBase64url(str: string): string {
  if (typeof Buffer !== 'undefined') {
    return Buffer.from(str, 'base64url').toString('utf8');
  }
  let base64 = str.replace(/-/g, '+').replace(/_/g, '/');
  while (base64.length % 4) base64 += '=';
  return decodeURIComponent(escape(atob(base64)));
}

async function sign(payload: string): Promise<string> {
  const secret = SESSION_SECRET || 'dev-session-secret-fallback-key-time-ledger';
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const signature = await crypto.subtle.sign('HMAC', key, encoder.encode(payload));
  const bytes = new Uint8Array(signature);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

export async function createSessionToken(userId: string): Promise<string> {
  const payload = base64url(JSON.stringify({ userId, iat: Date.now() }));
  const sig = await sign(payload);
  return `${payload}.${sig}`;
}

export async function verifySessionToken(token: string): Promise<string | null> {
  try {
    const [payload, sig] = token.split('.');
    if (!payload || !sig) return null;
    const expected = await sign(payload);
    if (expected !== sig) return null;
    const data = JSON.parse(fromBase64url(payload));
    // Session valid for 365 days (single-user app; refreshes on activity)
    if (Date.now() - data.iat > 365 * 24 * 60 * 60 * 1000) return null;
    return data.userId as string;
  } catch {
    return null;
  }
}

// ---------- Cookie helpers ----------

export async function setSessionCookie(userId: string) {
  const token = await createSessionToken(userId);
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    path: '/',
    maxAge: 365 * 24 * 60 * 60,
  });
}

export async function clearSessionCookie() {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE);
}

export async function getSessionUserId(): Promise<string | null> {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get(SESSION_COOKIE)?.value;
    if (!token) return null;
    return verifySessionToken(token);
  } catch {
    return null;
  }
}

// ---------- Auth state ----------

export async function isAppConfigured(): Promise<boolean> {
  // App is configured if there's at least one user (password has been set)
  try {
    const count = await prisma.user.count();
    return count > 0;
  } catch {
    return false;
  }
}

export async function getUser(userId: string) {
  return prisma.user.findUnique({ where: { id: userId } });
}
