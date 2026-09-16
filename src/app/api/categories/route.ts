import { NextRequest, NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { prisma } from '@/lib/db';
import { getSessionUserId } from '@/lib/auth';
import { validateCsrfToken } from '@/lib/csrf';

async function getUserId(): Promise<string | null> {
  const headersList = await headers();
  return headersList.get('x-user-id') || (await getSessionUserId());
}

export async function GET(request: NextRequest) {
  const userId = await getUserId();
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const includeArchived = request.nextUrl.searchParams.get('archived') === 'true';

  const categories = await prisma.category.findMany({
    where: {
      userId,
      ...(includeArchived ? {} : { archived: false }),
    },
    include: {
      subcategories: {
        where: includeArchived ? {} : { archived: false },
        orderBy: { order: 'asc' },
      },
    },
    orderBy: { order: 'asc' },
  });

  return NextResponse.json({ categories });
}

export async function POST(request: NextRequest) {
  const userId = await getUserId();
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const csrfToken = request.headers.get('X-CSRF-Token');
  const csrfValid = await validateCsrfToken(csrfToken);
  if (!csrfValid) {
    return NextResponse.json({ error: 'Invalid CSRF token.' }, { status: 403 });
  }

  let body: any;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON payload' }, { status: 400 });
  }

  const { name, color } = body;
  if (!name || typeof name !== 'string' || !name.trim()) {
    return NextResponse.json({ error: 'Category name is required' }, { status: 400 });
  }

  // Find max order
  const lastCat = await prisma.category.findFirst({
    where: { userId },
    orderBy: { order: 'desc' },
  });
  const order = (lastCat?.order ?? -1) + 1;

  const category = await prisma.category.create({
    data: {
      userId,
      name: name.trim(),
      color: color && typeof color === 'string' ? color.trim() : '#64748B',
      order,
      isSystem: false,
      archived: false,
    },
    include: {
      subcategories: true,
    },
  });

  return NextResponse.json({ category });
}

// Reorder categories
export async function PUT(request: NextRequest) {
  const userId = await getUserId();
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const csrfToken = request.headers.get('X-CSRF-Token');
  const csrfValid = await validateCsrfToken(csrfToken);
  if (!csrfValid) {
    return NextResponse.json({ error: 'Invalid CSRF token.' }, { status: 403 });
  }

  let body: any;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON payload' }, { status: 400 });
  }

  const { orderList } = body; // Array of { id: string, order: number }
  if (!Array.isArray(orderList)) {
    return NextResponse.json({ error: 'orderList array is required' }, { status: 400 });
  }

  await prisma.$transaction(
    orderList.map((item) =>
      prisma.category.updateMany({
        where: { id: item.id, userId },
        data: { order: item.order },
      })
    )
  );

  return NextResponse.json({ success: true });
}
