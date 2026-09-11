import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Nirogaverse seed start');

  const existing = await prisma.appUser.findUnique({
    where: { email: 'admin@nirogaverse.local' },
  });

  if (!existing) {
    console.log('Admin seed skipped (email/password auth only, create via register).');
  }

  console.log('Seed complete');
}

main()
  .catch((e) => {
    console.error('Seeding error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
