import { NextRequest, NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { prisma } from '@/lib/db';
import { getSessionUserId } from '@/lib/auth';
import { getTodayString } from '@/lib/time-utils';

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
  const monthParam = searchParams.get('month'); // YYYY-MM
  const today = getTodayString();
  const currentMonth = monthParam || today.slice(0, 7);

  const startDate = `${currentMonth}-01`;
  // Last day of month
  const [y, m] = currentMonth.split('-').map(Number);
  const lastDay = new Date(y, m, 0).getDate();
  const endDate = `${currentMonth}-${String(lastDay).padStart(2, '0')}`;

  const entries = await prisma.timeEntry.findMany({
    where: {
      userId,
      date: { gte: startDate, lte: endDate },
    },
    select: {
      date: true,
      durationMinutes: true,
      isUnaccounted: true,
      categoryId: true,
    },
  });

  const dayAggregates: Record<string, { loggedMinutes: number; unaccountedMinutes: number; count: number }> = {};

  for (const e of entries) {
    if (!dayAggregates[e.date]) {
      dayAggregates[e.date] = { loggedMinutes: 0, unaccountedMinutes: 0, count: 0 };
    }
    if (e.isUnaccounted) {
      dayAggregates[e.date].unaccountedMinutes += e.durationMinutes;
    } else {
      dayAggregates[e.date].loggedMinutes += e.durationMinutes;
    }
    dayAggregates[e.date].count++;
  }

  const days = [];
  for (let d = 1; d <= lastDay; d++) {
    const dateStr = `${currentMonth}-${String(d).padStart(2, '0')}`;
    const data = dayAggregates[dateStr] || { loggedMinutes: 0, unaccountedMinutes: 0, count: 0 };
    days.push({
      date: dateStr,
      dayNumber: d,
      loggedMinutes: data.loggedMinutes,
      unaccountedMinutes: data.unaccountedMinutes,
      entryCount: data.count,
      loggedPercentage: Math.round((data.loggedMinutes / 1440) * 100),
      isFuture: dateStr > today,
    });
  }

  return NextResponse.json({
    month: currentMonth,
    days,
  });
}
