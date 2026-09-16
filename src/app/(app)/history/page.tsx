import type { Metadata } from 'next';
import { headers } from 'next/headers';
import { prisma } from '@/lib/db';
import { getTodayString } from '@/lib/time-utils';
import { CategoryWithSubs } from '@/types';
import HistoryClient from './HistoryClient';

export const metadata: Metadata = { title: 'History — Time Ledger' };
export const dynamic = 'force-dynamic';

async function getUserId(): Promise<string> {
  const headersList = await headers();
  return headersList.get('x-user-id') ?? '';
}

export default async function HistoryPage() {
  const userId = await getUserId();
  const today = getTodayString();
  const currentMonth = today.slice(0, 7);

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

  return (
    <HistoryClient
      categories={categories}
      today={today}
      initialMonth={currentMonth}
    />
  );
}
