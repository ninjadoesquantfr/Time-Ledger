import type { Metadata } from 'next';
import { headers } from 'next/headers';
import { prisma } from '@/lib/db';
import { CategoryWithSubs } from '@/types';
import SettingsClient from './SettingsClient';

export const metadata: Metadata = { title: 'Settings — Time Ledger' };
export const dynamic = 'force-dynamic';

async function getUserId(): Promise<string> {
  const headersList = await headers();
  return headersList.get('x-user-id') ?? '';
}

export default async function SettingsPage() {
  const userId = await getUserId();

  const rawCats = await prisma.category.findMany({
    where: { userId },
    include: { subcategories: { orderBy: { order: 'asc' } } },
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

  const prefs = await prisma.notificationPreferences.findUnique({
    where: { userId },
  });

  return (
    <SettingsClient
      initialCategories={categories}
      initialNotificationPrefs={
        prefs
          ? { enabled: prefs.enabled, frequency: prefs.frequency }
          : { enabled: false, frequency: 'none' }
      }
    />
  );
}
