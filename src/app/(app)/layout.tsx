import { redirect } from 'next/navigation';
import { getSessionUserId } from '@/lib/auth';
import AppShell from '@/components/layout/AppShell';

export default async function AuthenticatedLayout({ children }: { children: React.ReactNode }) {
  const userId = await getSessionUserId();
  if (!userId) {
    redirect('/login');
  }

  return <AppShell>{children}</AppShell>;
}
