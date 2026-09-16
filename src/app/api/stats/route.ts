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
  const period = searchParams.get('period') || '7d';
  const today = getTodayString();

  // Determine date range
  let startDate = today;
  const todayDate = new Date(today);

  if (period === '7d') {
    const d = new Date(todayDate);
    d.setDate(d.getDate() - 6);
    startDate = d.toISOString().split('T')[0];
  } else if (period === '30d') {
    const d = new Date(todayDate);
    d.setDate(d.getDate() - 29);
    startDate = d.toISOString().split('T')[0];
  } else if (period === '90d') {
    const d = new Date(todayDate);
    d.setDate(d.getDate() - 89);
    startDate = d.toISOString().split('T')[0];
  } else if (period === 'year') {
    const d = new Date(todayDate);
    d.setFullYear(d.getFullYear() - 1);
    startDate = d.toISOString().split('T')[0];
  } else if (period === 'all') {
    const firstEntry = await prisma.timeEntry.findFirst({
      where: { userId },
      orderBy: { date: 'asc' },
    });
    startDate = firstEntry?.date || today;
  }

  // Fetch all entries in range
  const entries = await prisma.timeEntry.findMany({
    where: {
      userId,
      date: { gte: startDate, lte: today },
    },
    include: {
      category: true,
      subcategory: true,
    },
    orderBy: { startMinute: 'asc' },
  });

  // Calculate days in period
  const startD = new Date(startDate);
  const endD = new Date(today);
  const totalDays = Math.max(1, Math.round((endD.getTime() - startD.getTime()) / (1000 * 60 * 60 * 24)) + 1);
  const totalPossibleMinutes = totalDays * 1440;

  let totalLoggedMinutes = 0;
  let totalUnaccountedMinutes = 0;

  // Category map: categoryId -> { name, color, totalMinutes, subs: { subId: { name, minutes } } }
  const categoryMap = new Map<string, {
    categoryId: string;
    categoryName: string;
    categoryColor: string;
    totalMinutes: number;
    subMap: Map<string, { name: string; minutes: number }>;
  }>();

  // Daily map: date -> { loggedMinutes, unaccountedMinutes, categories: Map<string, number> }
  const dailyMap = new Map<string, { loggedMinutes: number; unaccountedMinutes: number; catMins: Map<string, number> }>();

  // Hour-of-day map: 0..23 -> total minutes logged in that hour across period
  const hourOfDayMinutes = Array(24).fill(0);

  for (const e of entries) {
    if (e.isUnaccounted) {
      totalUnaccountedMinutes += e.durationMinutes;
    } else {
      totalLoggedMinutes += e.durationMinutes;
    }

    // Hour distribution
    const hour = Math.floor(e.startMinute / 60);
    if (hour >= 0 && hour < 24) {
      hourOfDayMinutes[hour] += e.durationMinutes;
    }

    // Category aggregation
    if (!categoryMap.has(e.categoryId)) {
      categoryMap.set(e.categoryId, {
        categoryId: e.categoryId,
        categoryName: e.category.name,
        categoryColor: e.category.color,
        totalMinutes: 0,
        subMap: new Map(),
      });
    }
    const catItem = categoryMap.get(e.categoryId)!;
    catItem.totalMinutes += e.durationMinutes;

    if (e.subcategoryId && e.subcategory) {
      if (!catItem.subMap.has(e.subcategoryId)) {
        catItem.subMap.set(e.subcategoryId, { name: e.subcategory.name, minutes: 0 });
      }
      catItem.subMap.get(e.subcategoryId)!.minutes += e.durationMinutes;
    }

    // Daily aggregation
    if (!dailyMap.has(e.date)) {
      dailyMap.set(e.date, { loggedMinutes: 0, unaccountedMinutes: 0, catMins: new Map() });
    }
    const dayItem = dailyMap.get(e.date)!;
    if (e.isUnaccounted) {
      dayItem.unaccountedMinutes += e.durationMinutes;
    } else {
      dayItem.loggedMinutes += e.durationMinutes;
    }
    dayItem.catMins.set(e.category.name, (dayItem.catMins.get(e.category.name) ?? 0) + e.durationMinutes);
  }

  const unloggedMinutes = Math.max(0, totalPossibleMinutes - totalLoggedMinutes - totalUnaccountedMinutes);

  // Format category totals
  const categoryTotals = [...categoryMap.values()]
    .map((c) => ({
      categoryId: c.categoryId,
      categoryName: c.categoryName,
      categoryColor: c.categoryColor,
      totalMinutes: c.totalMinutes,
      percentage: totalLoggedMinutes > 0 ? Math.round((c.totalMinutes / totalLoggedMinutes) * 1000) / 10 : 0,
      subcategoryTotals: [...c.subMap.entries()].map(([subId, sub]) => ({
        subcategoryId: subId,
        subcategoryName: sub.name,
        totalMinutes: sub.minutes,
        percentage: c.totalMinutes > 0 ? Math.round((sub.minutes / c.totalMinutes) * 1000) / 10 : 0,
      })).sort((a, b) => b.totalMinutes - a.totalMinutes),
    }))
    .sort((a, b) => b.totalMinutes - a.totalMinutes);

  // Generate daily summaries for every date in range
  const dailySummaries = [];
  const curr = new Date(startD);
  while (curr <= endD) {
    const y = curr.getFullYear();
    const m = String(curr.getMonth() + 1).padStart(2, '0');
    const d = String(curr.getDate()).padStart(2, '0');
    const dateStr = `${y}-${m}-${d}`;

    const data = dailyMap.get(dateStr) || { loggedMinutes: 0, unaccountedMinutes: 0 };
    const dayUnlogged = Math.max(0, 1440 - data.loggedMinutes - data.unaccountedMinutes);
    dailySummaries.push({
      date: dateStr,
      loggedMinutes: data.loggedMinutes,
      unaccountedMinutes: data.unaccountedMinutes,
      unloggedMinutes: dayUnlogged,
      loggedPercentage: Math.round((data.loggedMinutes / 1440) * 1000) / 10,
    });
    curr.setDate(curr.getDate() + 1);
  }

  // Consecutive streak
  let currentStreak = 0;
  let maxStreak = 0;
  let tempStreak = 0;
  for (const day of dailySummaries) {
    if (day.loggedMinutes > 0) {
      tempStreak++;
      if (tempStreak > maxStreak) maxStreak = tempStreak;
    } else {
      tempStreak = 0;
    }
  }
  // Current streak looking backward from today
  for (let i = dailySummaries.length - 1; i >= 0; i--) {
    if (dailySummaries[i].loggedMinutes > 0) {
      currentStreak++;
    } else {
      break;
    }
  }

  const daysLoggedCount = dailySummaries.filter((d) => d.loggedMinutes > 0).length;

  return NextResponse.json({
    period: {
      start: startDate,
      end: today,
      label: period,
    },
    totals: {
      loggedMinutes: totalLoggedMinutes,
      unaccountedMinutes: totalUnaccountedMinutes,
      unloggedMinutes,
      totalPossibleMinutes,
    },
    daysLogged: daysLoggedCount,
    totalDays,
    categoryTotals,
    dailySummaries,
    hourOfDayMinutes,
    streak: {
      current: currentStreak,
      max: maxStreak,
    },
  });
}
