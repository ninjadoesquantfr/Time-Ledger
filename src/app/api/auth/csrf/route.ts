import { NextResponse } from 'next/server';
import { generateCsrfToken } from '@/lib/csrf';
import { isAppConfigured } from '@/lib/auth';

export async function GET() {
  const [token, configured] = await Promise.all([
    generateCsrfToken(),
    isAppConfigured(),
  ]);
  return NextResponse.json({ token, configured });
}

