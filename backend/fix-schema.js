const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  try {
    console.log('--- Manual Schema Update (SQL) ---');

    // Use raw SQL to alter the enum and table directly
    console.log('Adding GLOBAL_ADMIN to UserRole enum...');
    try {
      await prisma.$executeRawUnsafe(
        `ALTER TYPE "UserRole" ADD VALUE IF NOT EXISTS 'GLOBAL_ADMIN';`
      );
      console.log('Added GLOBAL_ADMIN (or already exists).');
    } catch (e) {
      console.log('Enum update failed (maybe it already exists?):', e.message);
    }

    console.log('Altering police_users.station_id to NOT NULL = FALSE...');
    try {
      await prisma.$executeRawUnsafe(
        `ALTER TABLE "police_users" ALTER COLUMN "station_id" DROP NOT NULL;`
      );
      console.log('Altered station_id column.');
    } catch (e) {
      console.log('Alter failed:', e.message);
    }

    console.log('Verifying columns...');
    const res =
      await prisma.$queryRaw`SELECT column_name, is_nullable FROM information_schema.columns WHERE table_name = 'police_users' AND column_name = 'station_id'`;
    console.log(res);

    console.log('Verifying enums...');
    const enums =
      await prisma.$queryRaw`SELECT enumlabel FROM pg_enum JOIN pg_type ON pg_enum.enumtypid = pg_type.oid WHERE pg_type.typname = 'UserRole'`;
    console.log(enums);
  } catch (err) {
    console.error('Manual update script failed:', err);
  } finally {
    await prisma.$disconnect();
  }
}

main();
