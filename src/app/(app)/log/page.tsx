import type { Metadata } from 'next';
import { headers } from 'next/headers';
import { prisma } from '@/lib/db';
import { getTodayString, buildDayTimeline } from '@/lib/time-utils';
import { TimeEntryData, CategoryWithSubs } from '@/types';
import LogClient from './LogClient';

export const metadata: Metadata = { title: 'Log Today — Time Ledger' };
export const dynamic = 'force-dynamic';

async function getUserId(): Promise<string> {
  const headersList = await headers();
  return headersList.get('x-user-id') ?? '';
}

export default async function LogPage() {
  const userId = await getUserId();
  const today = getTodayString();

  const rawEntries = await prisma.timeEntry.findMany({
    where: { userId, date: today },
    include: { category: true, subcategory: true },
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

  const timeline = buildDayTimeline(entries);

  return (
    <LogClient
      initialTimeline={timeline}
      initialEntries={entries}
      categories={categories}
      today={today}
    />
  );
}
