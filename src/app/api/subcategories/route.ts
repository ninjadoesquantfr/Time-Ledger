import { NextRequest, NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { prisma } from '@/lib/db';
import { getSessionUserId } from '@/lib/auth';
import { validateCsrfToken } from '@/lib/csrf';

async function getUserId(): Promise<string | null> {
  const headersList = await headers();
  return headersList.get('x-user-id') || (await getSessionUserId());
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

  const { categoryId, name } = body;
  if (!categoryId || !name || typeof name !== 'string' || !name.trim()) {
    return NextResponse.json({ error: 'categoryId and name are required' }, { status: 400 });
  }

  const category = await prisma.category.findUnique({
    where: { id: categoryId },
  });

  if (!category || category.userId !== userId) {
    return NextResponse.json({ error: 'Category not found' }, { status: 404 });
  }

  const lastSub = await prisma.subcategory.findFirst({
    where: { categoryId },
    orderBy: { order: 'desc' },
  });
  const order = (lastSub?.order ?? -1) + 1;

  const subcategory = await prisma.subcategory.create({
    data: {
      categoryId,
      name: name.trim(),
      order,
      archived: false,
    },
  });

  return NextResponse.json({ subcategory });
}

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

  const { id, name, archived } = body;
  if (!id) {
    return NextResponse.json({ error: 'Subcategory id is required' }, { status: 400 });
  }

  const existing = await prisma.subcategory.findUnique({
    where: { id },
    include: { category: true },
  });

  if (!existing || existing.category.userId !== userId) {
    return NextResponse.json({ error: 'Subcategory not found' }, { status: 404 });
  }

  const updated = await prisma.subcategory.update({
    where: { id },
    data: {
      name: name && typeof name === 'string' ? name.trim() : existing.name,
      archived: archived !== undefined ? Boolean(archived) : existing.archived,
    },
  });

  return NextResponse.json({ subcategory: updated });
}

export async function DELETE(request: NextRequest) {
  const userId = await getUserId();
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const csrfToken = request.headers.get('X-CSRF-Token');
  const csrfValid = await validateCsrfToken(csrfToken);
  if (!csrfValid) {
    return NextResponse.json({ error: 'Invalid CSRF token.' }, { status: 403 });
  }

  const id = request.nextUrl.searchParams.get('id');
  if (!id) {
    return NextResponse.json({ error: 'Subcategory id is required' }, { status: 400 });
  }

  const existing = await prisma.subcategory.findUnique({
    where: { id },
    include: { category: true },
  });

  if (!existing || existing.category.userId !== userId) {
    return NextResponse.json({ error: 'Subcategory not found' }, { status: 404 });
  }

  // Soft-delete archive
  await prisma.subcategory.update({
    where: { id },
    data: { archived: true },
  });

  return NextResponse.json({ success: true, archived: true });
}
