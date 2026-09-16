import { NextRequest, NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { prisma } from '@/lib/db';
import { getSessionUserId } from '@/lib/auth';
import { validateCsrfToken } from '@/lib/csrf';

async function getUserId(): Promise<string | null> {
  const headersList = await headers();
  return headersList.get('x-user-id') || (await getSessionUserId());
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

  const { date, buckets, categoryId, subcategoryId, note, isUnaccounted } = body;

  if (!date || !Array.isArray(buckets) || buckets.length === 0 || !categoryId) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
  }

  // Save all buckets in a transaction
  try {
    const created = await prisma.$transaction(async (tx) => {
      const results = [];
      for (const b of buckets) {
        const entry = await tx.timeEntry.create({
          data: {
            userId,
            date,
            startMinute: b.startMinute,
            durationMinutes: b.durationMinutes,
            categoryId,
            subcategoryId: subcategoryId || null,
            note: note ? String(note).trim() : null,
            isUnaccounted: Boolean(isUnaccounted),
          },
        });
        results.push(entry);
      }
      return results;
    });

    return NextResponse.json({ success: true, count: created.length });
  } catch (err: any) {
    return NextResponse.json({ error: 'Failed to create range entries.' }, { status: 500 });
  }
}
