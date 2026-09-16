import { NextRequest, NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { prisma } from '@/lib/db';
import { getSessionUserId } from '@/lib/auth';

async function getUserId(): Promise<string | null> {
  const headersList = await headers();
  return headersList.get('x-user-id') || (await getSessionUserId());
}

export async function GET(request: NextRequest) {
  const userId = await getUserId();
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const q = request.nextUrl.searchParams.get('q')?.trim() || '';
  if (!q) {
    return NextResponse.json({ entries: [] });
  }

  const entries = await prisma.timeEntry.findMany({
    where: {
      userId,
      OR: [
        { note: { contains: q, mode: 'insensitive' } },
        { category: { name: { contains: q, mode: 'insensitive' } } },
        { subcategory: { name: { contains: q, mode: 'insensitive' } } },
        { date: { contains: q } },
      ],
    },
    include: {
      category: true,
      subcategory: true,
    },
    orderBy: [{ date: 'desc' }, { startMinute: 'asc' }],
    take: 100,
  });

  const formatted = entries.map((e) => ({
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

  return NextResponse.json({ entries: formatted });
}
