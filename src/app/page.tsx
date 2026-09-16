import { redirect } from 'next/navigation';
import { isAppConfigured, getSessionUserId } from '@/lib/auth';

export default async function Home() {
  const configured = await isAppConfigured();
  if (!configured) {
    redirect('/setup');
  }

  const userId = await getSessionUserId();
  if (!userId) {
    redirect('/login');
  }

  redirect('/today');
}
