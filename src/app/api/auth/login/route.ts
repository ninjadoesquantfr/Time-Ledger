import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { verifyPassword, setSessionCookie, isAppConfigured } from '@/lib/auth';
import { validateCsrfToken } from '@/lib/csrf';
import { checkRateLimit, recordFailedAttempt, clearAttempts } from '@/lib/rate-limit';

export async function POST(request: NextRequest) {
  // Rate limiting by IP
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
              request.headers.get('x-real-ip') ||
              'unknown';

  const rateCheck = checkRateLimit(ip);
  if (!rateCheck.allowed) {
    return NextResponse.json(
      { error: 'Too many attempts. Please wait before trying again.' },
      { status: 429 },
    );
  }

  // CSRF check
  const csrfToken = request.headers.get('X-CSRF-Token');
  const csrfValid = await validateCsrfToken(csrfToken);
  if (!csrfValid) {
    return NextResponse.json({ error: 'Invalid request.' }, { status: 403 });
  }

  // Must be configured first
  const configured = await isAppConfigured();
  if (!configured) {
    return NextResponse.json({ error: 'App not yet configured.' }, { status: 400 });
  }

  let password: string;
  try {
    const body = await request.json();
    password = body.password;
  } catch {
    return NextResponse.json({ error: 'Invalid request.' }, { status: 400 });
  }

  if (!password || typeof password !== 'string') {
    return NextResponse.json({ error: 'Invalid credentials.' }, { status: 401 });
  }

  // Get the single user
  const user = await prisma.user.findFirst();
  if (!user) {
    recordFailedAttempt(ip);
    return NextResponse.json({ error: 'Invalid credentials.' }, { status: 401 });
  }

  const valid = await verifyPassword(password, user.passwordHash);
  if (!valid) {
    recordFailedAttempt(ip);
    // Generic message — never reveal why it failed
    return NextResponse.json({ error: 'Invalid credentials.' }, { status: 401 });
  }

  clearAttempts(ip);
  await setSessionCookie(user.id);

  return NextResponse.json({ ok: true });
}
