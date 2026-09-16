import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const DEFAULT_CATEGORIES = [
  {
    name: 'Study',
    color: '#6366F1',
    order: 0,
    isSystem: true,
    subcategories: ['DSA', 'Core Concepts', 'College Coursework', 'Competitive Programming', 'Quant', 'Projects', 'Reading', 'Other'],
  },
  {
    name: 'Work',
    color: '#10B981',
    order: 1,
    isSystem: true,
    subcategories: ['Coding', 'Meetings', 'Research', 'Admin', 'Other'],
  },
  {
    name: 'Sleep',
    color: '#8B5CF6',
    order: 2,
    isSystem: true,
    subcategories: [],
  },
  {
    name: 'Food',
    color: '#F59E0B',
    order: 3,
    isSystem: true,
    subcategories: ['Breakfast', 'Lunch', 'Dinner', 'Snacks', 'Other'],
  },
  {
    name: 'Exercise',
    color: '#EF4444',
    order: 4,
    isSystem: true,
    subcategories: ['Gym', 'Running', 'Walking', 'Sports', 'Other'],
  },
  {
    name: 'Travel',
    color: '#3B82F6',
    order: 5,
    isSystem: true,
    subcategories: ['College', 'Home', 'Work', 'General', 'Other'],
  },
  {
    name: 'Social',
    color: '#EC4899',
    order: 6,
    isSystem: true,
    subcategories: ['Friends', 'Family', 'Partner', 'Events', 'Other'],
  },
  {
    name: 'Timepass',
    color: '#94A3B8',
    order: 7,
    isSystem: true,
    subcategories: ['YouTube', 'Instagram', 'Gaming', 'Reddit', 'Netflix', 'Browsing', 'Just Chilling', 'Other'],
  },
  {
    name: 'Chores',
    color: '#14B8A6',
    order: 8,
    isSystem: true,
    subcategories: ['Cleaning', 'Laundry', 'Shopping', 'Cooking', 'Other'],
  },
  {
    name: 'Personal',
    color: '#F97316',
    order: 9,
    isSystem: true,
    subcategories: ['Getting Ready', 'Personal Care', 'Errands', 'Other'],
  },
  {
    name: 'Unaccounted',
    color: '#CBD5E1',
    order: 10,
    isSystem: true,
    subcategories: [],
  },
  {
    name: 'Other',
    color: '#64748B',
    order: 11,
    isSystem: true,
    subcategories: [],
  },
];

async function main() {
  console.log('Seeding default categories for all users...');

  // Get all users
  const users = await prisma.user.findMany();

  for (const user of users) {
    // Check if this user already has categories
    const existingCount = await prisma.category.count({ where: { userId: user.id } });
    if (existingCount > 0) {
      console.log(`User ${user.id} already has categories, skipping.`);
      continue;
    }

    for (const cat of DEFAULT_CATEGORIES) {
      const category = await prisma.category.create({
        data: {
          userId: user.id,
          name: cat.name,
          color: cat.color,
          order: cat.order,
          isSystem: cat.isSystem,
        },
      });

      for (let i = 0; i < cat.subcategories.length; i++) {
        await prisma.subcategory.create({
          data: {
            categoryId: category.id,
            name: cat.subcategories[i],
            order: i,
          },
        });
      }
    }
    console.log(`Created default categories for user ${user.id}`);
  }

  console.log('Seed complete.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
