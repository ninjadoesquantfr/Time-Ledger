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

  const format = request.nextUrl.searchParams.get('format') || 'json';

  const categories = await prisma.category.findMany({
    where: { userId },
    include: { subcategories: true },
    orderBy: { order: 'asc' },
  });

  const entries = await prisma.timeEntry.findMany({
    where: { userId },
    include: { category: true, subcategory: true },
    orderBy: [{ date: 'asc' }, { startMinute: 'asc' }],
  });

  if (format === 'csv') {
    const rows = [
      ['Date', 'Start Hour', 'Start Minute', 'Duration (min)', 'Category', 'Subcategory', 'Is Unaccounted', 'Note'].join(','),
    ];

    for (const e of entries) {
      const hour = Math.floor(e.startMinute / 60);
      const min = e.startMinute % 60;
      const noteClean = e.note ? `"${e.note.replace(/"/g, '""')}"` : '""';
      rows.push(
        [
          e.date,
          hour,
          min,
          e.durationMinutes,
          `"${e.category.name.replace(/"/g, '""')}"`,
          e.subcategory ? `"${e.subcategory.name.replace(/"/g, '""')}"` : '""',
          e.isUnaccounted ? 'true' : 'false',
          noteClean,
        ].join(',')
      );
    }

    const csvContent = rows.join('\n');
    return new NextResponse(csvContent, {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="time-ledger-export-${new Date().toISOString().split('T')[0]}.csv"`,
      },
    });
  }

  // JSON export
  const exportData = {
    version: '1.0',
    exportedAt: new Date().toISOString(),
    categories: categories.map((c) => ({
      name: c.name,
      color: c.color,
      isSystem: c.isSystem,
      archived: c.archived,
      subcategories: c.subcategories.map((s) => ({
        name: s.name,
        archived: s.archived,
      })),
    })),
    entries: entries.map((e) => ({
      date: e.date,
      startMinute: e.startMinute,
      durationMinutes: e.durationMinutes,
      categoryName: e.category.name,
      subcategoryName: e.subcategory?.name ?? null,
      note: e.note,
      isUnaccounted: e.isUnaccounted,
    })),
  };

  return new NextResponse(JSON.stringify(exportData, null, 2), {
    headers: {
      'Content-Type': 'application/json',
      'Content-Disposition': `attachment; filename="time-ledger-export-${new Date().toISOString().split('T')[0]}.json"`,
    },
  });
}
