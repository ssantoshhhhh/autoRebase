const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  try {
    console.log('Connecting to database...');
    await prisma.$connect();
    console.log('Connected!');

    console.log('Adding mobile_number column...');
    await prisma.$executeRawUnsafe(
      `ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "mobile_number" TEXT;`
    );
    console.log('Column added (or already exists).');

    console.log('Adding UNIQUE constraint...');
    try {
      await prisma.$executeRawUnsafe(
        `CREATE UNIQUE INDEX IF NOT EXISTS "users_mobile_number_key" ON "users"("mobile_number");`
      );
      console.log('Unique index added.');
    } catch (e) {
      console.log('Unique index could not be added (maybe already exists)');
    }
  } catch (e) {
    console.error('Operation failed:', e);
  } finally {
    await prisma.$disconnect();
  }
}

main();
