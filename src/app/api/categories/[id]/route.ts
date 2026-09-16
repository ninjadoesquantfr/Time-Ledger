import { NextRequest, NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { prisma } from '@/lib/db';
import { getSessionUserId } from '@/lib/auth';
import { validateCsrfToken } from '@/lib/csrf';

async function getUserId(): Promise<string | null> {
  const headersList = await headers();
  return headersList.get('x-user-id') || (await getSessionUserId());
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const userId = await getUserId();
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const csrfToken = request.headers.get('X-CSRF-Token');
  const csrfValid = await validateCsrfToken(csrfToken);
  if (!csrfValid) {
    return NextResponse.json({ error: 'Invalid CSRF token.' }, { status: 403 });
  }

  const { id } = await params;
  const existing = await prisma.category.findUnique({
    where: { id },
  });

  if (!existing || existing.userId !== userId) {
    return NextResponse.json({ error: 'Category not found' }, { status: 404 });
  }

  let body: any;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON payload' }, { status: 400 });
  }

  const { name, color, archived, order } = body;

  const updated = await prisma.category.update({
    where: { id },
    data: {
      name: name && typeof name === 'string' ? name.trim() : existing.name,
      color: color && typeof color === 'string' ? color.trim() : existing.color,
      archived: archived !== undefined ? Boolean(archived) : existing.archived,
      order: typeof order === 'number' ? order : existing.order,
    },
    include: {
      subcategories: true,
    },
  });

  return NextResponse.json({ category: updated });
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const userId = await getUserId();
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const csrfToken = request.headers.get('X-CSRF-Token');
  const csrfValid = await validateCsrfToken(csrfToken);
  if (!csrfValid) {
    return NextResponse.json({ error: 'Invalid CSRF token.' }, { status: 403 });
  }

  const { id } = await params;
  const existing = await prisma.category.findUnique({
    where: { id },
  });

  if (!existing || existing.userId !== userId) {
    return NextResponse.json({ error: 'Category not found' }, { status: 404 });
  }

  // Philosophy: archive never hard deletes so history is preserved
  await prisma.category.update({
    where: { id },
    data: { archived: true },
  });

  return NextResponse.json({ success: true, archived: true });
}
