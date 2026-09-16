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

  const { data, dryRun } = body;
  if (!data) {
    return NextResponse.json({ error: 'Data payload is required' }, { status: 400 });
  }

  // Parse if string
  let parsed: any;
  if (typeof data === 'string') {
    try {
      parsed = JSON.parse(data);
    } catch {
      return NextResponse.json({ error: 'Could not parse JSON data' }, { status: 400 });
    }
  } else {
    parsed = data;
  }

  if (!parsed.entries || !Array.isArray(parsed.entries)) {
    return NextResponse.json({ error: 'Invalid format: missing entries array' }, { status: 400 });
  }

  const entriesCount = parsed.entries.length;
  const categoriesCount = Array.isArray(parsed.categories) ? parsed.categories.length : 0;

  if (dryRun) {
    return NextResponse.json({
      valid: true,
      preview: {
        entriesCount,
        categoriesCount,
        firstEntry: parsed.entries[0] || null,
      },
    });
  }

  // Execute import in transaction
  try {
    const existingCategories = await prisma.category.findMany({
      where: { userId },
      include: { subcategories: true },
    });

    const categoryMap = new Map<string, { id: string; subMap: Map<string, string> }>();
    for (const c of existingCategories) {
      const subMap = new Map<string, string>();
      for (const s of c.subcategories) {
        subMap.set(s.name.toLowerCase(), s.id);
      }
      categoryMap.set(c.name.toLowerCase(), { id: c.id, subMap });
    }

    let importedEntriesCount = 0;

    await prisma.$transaction(async (tx) => {
      // 1. Create any missing categories
      if (Array.isArray(parsed.categories)) {
        for (const cat of parsed.categories) {
          if (!cat.name) continue;
          let catEntry = categoryMap.get(cat.name.toLowerCase());
          if (!catEntry) {
            const newCat = await tx.category.create({
              data: {
                userId,
                name: cat.name,
                color: cat.color || '#64748B',
                isSystem: Boolean(cat.isSystem),
                archived: Boolean(cat.archived),
              },
            });
            catEntry = { id: newCat.id, subMap: new Map() };
            categoryMap.set(cat.name.toLowerCase(), catEntry);
          }

          if (Array.isArray(cat.subcategories)) {
            for (const sub of cat.subcategories) {
              if (!sub.name) continue;
              if (!catEntry.subMap.has(sub.name.toLowerCase())) {
                const newSub = await tx.subcategory.create({
                  data: {
                    categoryId: catEntry.id,
                    name: sub.name,
                    archived: Boolean(sub.archived),
                  },
                });
                catEntry.subMap.set(sub.name.toLowerCase(), newSub.id);
              }
            }
          }
        }
      }

      // Default fallback category if category name doesn't match
      let fallbackCatId = existingCategories[0]?.id;
      if (!fallbackCatId) {
        const defaultCat = await tx.category.create({
          data: {
            userId,
            name: 'General',
            color: '#64748B',
          },
        });
        fallbackCatId = defaultCat.id;
      }

      // 2. Insert entries
      for (const e of parsed.entries) {
        if (!e.date || typeof e.startMinute !== 'number' || typeof e.durationMinutes !== 'number') {
          continue;
        }

        const catNameLower = (e.categoryName || '').toLowerCase();
        const catInfo = categoryMap.get(catNameLower);
        const categoryId = catInfo?.id || fallbackCatId;

        let subcategoryId: string | null = null;
        if (catInfo && e.subcategoryName) {
          subcategoryId = catInfo.subMap.get(e.subcategoryName.toLowerCase()) || null;
        }

        await tx.timeEntry.create({
          data: {
            userId,
            date: e.date,
            startMinute: e.startMinute,
            durationMinutes: Math.min(60, Math.max(1, e.durationMinutes)),
            categoryId,
            subcategoryId,
            note: e.note || null,
            isUnaccounted: Boolean(e.isUnaccounted),
          },
        });
        importedEntriesCount++;
      }
    });

    return NextResponse.json({
      success: true,
      importedEntriesCount,
    });
  } catch (err: any) {
    return NextResponse.json({ error: 'Import failed: ' + (err?.message || 'Unknown error') }, { status: 500 });
  }
}
