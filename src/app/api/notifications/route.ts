import { NextRequest, NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { prisma } from '@/lib/db';
import { getSessionUserId } from '@/lib/auth';
import { validateCsrfToken } from '@/lib/csrf';

async function getUserId(): Promise<string | null> {
  const headersList = await headers();
  return headersList.get('x-user-id') || (await getSessionUserId());
}

export async function GET(request: NextRequest) {
  const userId = await getUserId();
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const prefs = await prisma.notificationPreferences.findUnique({
    where: { userId },
  });

  return NextResponse.json({
    preferences: prefs || {
      enabled: false,
      frequency: 'none',
      pushSubscription: null,
    },
  });
}

export async function POST(request: NextRequest) {
  const userId = await getUserId();
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const csrfToken = request.headers.get('X-CSRF-Token');
  const csrfValid = await validateCsrfToken(csrfToken);
  if (!csrfValid) {
    return NextResponse.json({ error: 'Invalid CSRF token.' }, { status: 403 });
  }

  let body: any;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON payload' }, { status: 400 });
  }

  const { enabled, frequency, pushSubscription } = body;

  const updated = await prisma.notificationPreferences.upsert({
    where: { userId },
    create: {
      userId,
      enabled: Boolean(enabled),
      frequency: frequency || 'none',
      pushSubscription: pushSubscription ? JSON.stringify(pushSubscription) : null,
    },
    update: {
      enabled: enabled !== undefined ? Boolean(enabled) : undefined,
      frequency: frequency !== undefined ? frequency : undefined,
      pushSubscription: pushSubscription !== undefined ? JSON.stringify(pushSubscription) : undefined,
    },
  });

  return NextResponse.json({ preferences: updated });
}
