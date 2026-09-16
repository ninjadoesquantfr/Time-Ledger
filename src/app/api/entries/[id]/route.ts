import { NextRequest, NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { prisma } from '@/lib/db';
import { getSessionUserId } from '@/lib/auth';
import { validateCsrfToken } from '@/lib/csrf';

async function getUserId(): Promise<string | null> {
  const headersList = await headers();
  return headersList.get('x-user-id') || (await getSessionUserId());
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const userId = await getUserId();
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const csrfToken = request.headers.get('X-CSRF-Token');
  const csrfValid = await validateCsrfToken(csrfToken);
  if (!csrfValid) {
    return NextResponse.json({ error: 'Invalid CSRF token.' }, { status: 403 });
  }

  const { id } = await params;
  const existing = await prisma.timeEntry.findUnique({
    where: { id },
  });

  if (!existing || existing.userId !== userId) {
    return NextResponse.json({ error: 'Entry not found' }, { status: 404 });
  }

  let body: any;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON payload' }, { status: 400 });
  }

  const { categoryId, subcategoryId, durationMinutes, note, isUnaccounted } = body;

  if (typeof durationMinutes === 'number') {
    if (durationMinutes <= 0 || durationMinutes > 60) {
      return NextResponse.json({ error: 'Duration must be between 1 and 60 minutes' }, { status: 400 });
    }

    // Verify hour cap
    const hour = Math.floor(existing.startMinute / 60);
    const hourStart = hour * 60;
    const hourEnd = hourStart + 60;

    const otherEntries = await prisma.timeEntry.findMany({
      where: {
        userId,
        date: existing.date,
        id: { not: existing.id },
        startMinute: { gte: hourStart, lt: hourEnd },
      },
    });

    const otherUsed = otherEntries.reduce((sum, e) => sum + e.durationMinutes, 0);
    const maxAvailable = 60 - otherUsed;

    if (durationMinutes > maxAvailable) {
      return NextResponse.json(
        {
          error: `Hour cannot exceed 60 minutes. Only ${maxAvailable} minutes remaining.`,
          maxMinutes: maxAvailable,
        },
        { status: 409 }
      );
    }
  }

  const updated = await prisma.timeEntry.update({
    where: { id },
    data: {
      categoryId: categoryId || existing.categoryId,
      subcategoryId: subcategoryId !== undefined ? (subcategoryId || null) : existing.subcategoryId,
      durationMinutes: durationMinutes ?? existing.durationMinutes,
      note: note !== undefined ? (note ? String(note).trim() : null) : existing.note,
      isUnaccounted: isUnaccounted !== undefined ? Boolean(isUnaccounted) : existing.isUnaccounted,
    },
    include: {
      category: true,
      subcategory: true,
    },
  });

  return NextResponse.json({
    entry: {
      id: updated.id,
      date: updated.date,
      startMinute: updated.startMinute,
      durationMinutes: updated.durationMinutes,
      categoryId: updated.categoryId,
      categoryName: updated.category.name,
      categoryColor: updated.category.color,
      subcategoryId: updated.subcategoryId,
      subcategoryName: updated.subcategory?.name ?? null,
      note: updated.note,
      isUnaccounted: updated.isUnaccounted,
      createdAt: updated.createdAt.toISOString(),
      updatedAt: updated.updatedAt.toISOString(),
    },
  });
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const userId = await getUserId();
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const csrfToken = request.headers.get('X-CSRF-Token');
  const csrfValid = await validateCsrfToken(csrfToken);
  if (!csrfValid) {
    return NextResponse.json({ error: 'Invalid CSRF token.' }, { status: 403 });
  }

  const { id } = await params;
  const existing = await prisma.timeEntry.findUnique({
    where: { id },
  });

  if (!existing || existing.userId !== userId) {
    return NextResponse.json({ error: 'Entry not found' }, { status: 404 });
  }

  await prisma.timeEntry.delete({
    where: { id },
  });

  return NextResponse.json({ success: true });
}
