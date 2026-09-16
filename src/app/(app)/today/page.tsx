import type { Metadata } from 'next';
import { headers } from 'next/headers';
import { prisma } from '@/lib/db';
import TodayClient from './TodayClient';
import { getTodayString, buildDayTimeline, getOnThisDayDates } from '@/lib/time-utils';
import { TimeEntryData, CategoryWithSubs, OnThisDayEntry } from '@/types';

export const metadata: Metadata = { title: 'Today' };

export const dynamic = 'force-dynamic';

async function getUserId(): Promise<string> {
  const headersList = await headers();
  return headersList.get('x-user-id') ?? '';
}

export default async function TodayPage() {
  const userId = await getUserId();
  const today = getTodayString();

  // Load today's entries
  const rawEntries = await prisma.timeEntry.findMany({
    where: { userId, date: today },
    include: {
      category: true,
      subcategory: true,
    },
    orderBy: { startMinute: 'asc' },
  });

  const entries: TimeEntryData[] = rawEntries.map((e) => ({
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

  // Load categories
  const rawCats = await prisma.category.findMany({
    where: { userId, archived: false },
    include: { subcategories: { where: { archived: false }, orderBy: { order: 'asc' } } },
    orderBy: { order: 'asc' },
  });

  const categories: CategoryWithSubs[] = rawCats.map((c) => ({
    id: c.id,
    name: c.name,
    color: c.color,
    order: c.order,
    isSystem: c.isSystem,
    archived: c.archived,
    subcategories: c.subcategories.map((s) => ({
      id: s.id,
      name: s.name,
      order: s.order,
      archived: s.archived,
      categoryId: s.categoryId,
    })),
  }));

  // On This Day: find historical entries for comparison dates
  const comparisonDates = getOnThisDayDates(today);
  const onThisDay: OnThisDayEntry[] = [];

  for (const { label, date } of comparisonDates) {
    const histEntries = await prisma.timeEntry.findMany({
      where: { userId, date },
      include: { category: true, subcategory: true },
      orderBy: { startMinute: 'asc' },
    });

    if (histEntries.length === 0) continue;

    // Build summary (e.g. "Sleep 8h, Study 3h")
    const catMinutes = new Map<string, number>();
    for (const e of histEntries) {
      catMinutes.set(e.category.name, (catMinutes.get(e.category.name) ?? 0) + e.durationMinutes);
    }
    const summaryParts = [...catMinutes.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 4)
      .map(([name, mins]) => {
        const h = Math.round(mins / 60 * 10) / 10;
        return `${name} ${h}h`;
      });

    onThisDay.push({
      label,
      date,
      entries: histEntries.map((e) => ({
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
      })),
      summary: summaryParts.join(', '),
    });
  }

  const timeline = buildDayTimeline(entries);

  return (
    <TodayClient
      initialTimeline={timeline}
      initialEntries={entries}
      categories={categories}
      today={today}
      onThisDay={onThisDay}
    />
  );
}
