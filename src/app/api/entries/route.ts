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

  const searchParams = request.nextUrl.searchParams;
  const date = searchParams.get('date');
  const startDate = searchParams.get('startDate');
  const endDate = searchParams.get('endDate');

  let whereClause: any = { userId };

  if (date) {
    whereClause.date = date;
  } else if (startDate && endDate) {
    whereClause.date = { gte: startDate, lte: endDate };
  }

  const rawEntries = await prisma.timeEntry.findMany({
    where: whereClause,
    include: {
      category: true,
      subcategory: true,
    },
    orderBy: [{ date: 'asc' }, { startMinute: 'asc' }],
  });

  const entries = rawEntries.map((e) => ({
    id: e.id,
    date: e.date,
    startMinute: e.startMinute,
    durationMinutes: e.durationMinutes,
    categoryId: e.categoryId,
    categoryName: e.category.name,
    categoryColor: e.category.color,
    subcategoryId: e.subcategoryId,
    subcategoryName: e.subcategory?.name ?? null,
    note: e.note,
    isUnaccounted: e.isUnaccounted,
    createdAt: e.createdAt.toISOString(),
    updatedAt: e.updatedAt.toISOString(),
  }));

  return NextResponse.json({ entries });
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

  const { date, startMinute, durationMinutes, categoryId, subcategoryId, note, isUnaccounted } = body;

  if (!date || typeof startMinute !== 'number' || typeof durationMinutes !== 'number' || !categoryId) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
  }

  if (durationMinutes <= 0 || durationMinutes > 60) {
    return NextResponse.json({ error: 'Duration must be between 1 and 60 minutes' }, { status: 400 });
  }

  // Check hour constraints: calculate sum of existing entries in this hour bucket
  const hour = Math.floor(startMinute / 60);
  const hourStart = hour * 60;
  const hourEnd = hourStart + 60;

  const existingInHour = await prisma.timeEntry.findMany({
    where: {
      userId,
      date,
      startMinute: { gte: hourStart, lt: hourEnd },
    },
  });

  const totalUsed = existingInHour.reduce((sum, e) => sum + e.durationMinutes, 0);
  const maxAvailable = 60 - totalUsed;

  if (durationMinutes > maxAvailable) {
    return NextResponse.json(
      {
        error: `Hour cannot exceed 60 minutes. Only ${maxAvailable} minutes remaining.`,
        maxMinutes: maxAvailable,
      },
      { status: 409 }
    );
  }

  const newEntry = await prisma.timeEntry.create({
    data: {
      userId,
      date,
      startMinute,
      durationMinutes,
      categoryId,
      subcategoryId: subcategoryId || null,
      note: note ? String(note).trim() : null,
      isUnaccounted: Boolean(isUnaccounted),
    },
    include: {
      category: true,
      subcategory: true,
    },
  });

  return NextResponse.json({
    entry: {
      id: newEntry.id,
      date: newEntry.date,
      startMinute: newEntry.startMinute,
      durationMinutes: newEntry.durationMinutes,
      categoryId: newEntry.categoryId,
      categoryName: newEntry.category.name,
      categoryColor: newEntry.category.color,
      subcategoryId: newEntry.subcategoryId,
      subcategoryName: newEntry.subcategory?.name ?? null,
      note: newEntry.note,
      isUnaccounted: newEntry.isUnaccounted,
      createdAt: newEntry.createdAt.toISOString(),
      updatedAt: newEntry.updatedAt.toISOString(),
    },
  });
}
