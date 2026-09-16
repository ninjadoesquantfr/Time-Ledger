import type { Metadata } from 'next';
import StatisticsClient from './StatisticsClient';

export const metadata: Metadata = { title: 'Statistics — Time Ledger' };
export const dynamic = 'force-dynamic';

export default function StatisticsPage() {
  return <StatisticsClient />;
}
