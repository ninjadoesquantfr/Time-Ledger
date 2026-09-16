import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { hashPassword, setSessionCookie, isAppConfigured } from '@/lib/auth';
import { validateCsrfToken } from '@/lib/csrf';

const DEFAULT_CATEGORIES = [
  { name: 'Study',       color: '#6366F1', order: 0,  isSystem: true, subcategories: ['DSA', 'Core Concepts', 'College Coursework', 'Competitive Programming', 'Quant', 'Projects', 'Reading', 'Other'] },
  { name: 'Work',        color: '#10B981', order: 1,  isSystem: true, subcategories: ['Coding', 'Meetings', 'Research', 'Admin', 'Other'] },
  { name: 'Sleep',       color: '#8B5CF6', order: 2,  isSystem: true, subcategories: [] },
  { name: 'Food',        color: '#F59E0B', order: 3,  isSystem: true, subcategories: ['Breakfast', 'Lunch', 'Dinner', 'Snacks', 'Other'] },
  { name: 'Exercise',    color: '#EF4444', order: 4,  isSystem: true, subcategories: ['Gym', 'Running', 'Walking', 'Sports', 'Other'] },
  { name: 'Travel',      color: '#3B82F6', order: 5,  isSystem: true, subcategories: ['College', 'Home', 'Work', 'General', 'Other'] },
  { name: 'Social',      color: '#EC4899', order: 6,  isSystem: true, subcategories: ['Friends', 'Family', 'Partner', 'Events', 'Other'] },
  { name: 'Timepass',    color: '#94A3B8', order: 7,  isSystem: true, subcategories: ['YouTube', 'Instagram', 'Gaming', 'Reddit', 'Netflix', 'Browsing', 'Just Chilling', 'Other'] },
  { name: 'Chores',      color: '#14B8A6', order: 8,  isSystem: true, subcategories: ['Cleaning', 'Laundry', 'Shopping', 'Cooking', 'Other'] },
  { name: 'Personal',    color: '#F97316', order: 9,  isSystem: true, subcategories: ['Getting Ready', 'Personal Care', 'Errands', 'Other'] },
  { name: 'Unaccounted', color: '#CBD5E1', order: 10, isSystem: true, subcategories: [] },
  { name: 'Other',       color: '#64748B', order: 11, isSystem: true, subcategories: [] },
];

export async function POST(request: NextRequest) {
  // CSRF
  const csrfToken = request.headers.get('X-CSRF-Token');
  const csrfValid = await validateCsrfToken(csrfToken);
  if (!csrfValid) {
    return NextResponse.json({ error: 'Invalid request.' }, { status: 403 });
  }

  // Only allow setup if not yet configured
  const configured = await isAppConfigured();
  if (configured) {
    return NextResponse.json({ error: 'Already configured.' }, { status: 400 });
  }

  let password: string;
  try {
    const body = await request.json();
    password = body.password;
  } catch {
    return NextResponse.json({ error: 'Invalid request.' }, { status: 400 });
  }

  if (!password || typeof password !== 'string' || password.length < 8) {
    return NextResponse.json({ error: 'Password must be at least 8 characters.' }, { status: 400 });
  }

  const passwordHash = await hashPassword(password);

  // Create user + seed default categories in one transaction
  const user = await prisma.$transaction(async (tx) => {
    const newUser = await tx.user.create({ data: { passwordHash } });

    for (const cat of DEFAULT_CATEGORIES) {
      const category = await tx.category.create({
        data: {
          userId: newUser.id,
          name: cat.name,
          color: cat.color,
          order: cat.order,
          isSystem: cat.isSystem,
        },
      });

      for (let i = 0; i < cat.subcategories.length; i++) {
        await tx.subcategory.create({
          data: {
            categoryId: category.id,
            name: cat.subcategories[i],
            order: i,
          },
        });
      }
    }

    return newUser;
  });

  await setSessionCookie(user.id);

  return NextResponse.json({ ok: true });
}
