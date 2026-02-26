const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  try {
    console.log('--- Database Diagnostics ---');

    console.log('PoliceUser station_id:');
    const cols =
      await prisma.$queryRaw`SELECT column_name, is_nullable FROM information_schema.columns WHERE table_name = 'police_users' AND column_name = 'station_id'`;
    console.log(cols);

    console.log('UserRole enum labels:');
    const enums =
      await prisma.$queryRaw`SELECT enumlabel FROM pg_enum JOIN pg_type ON pg_enum.enumtypid = pg_type.oid WHERE pg_type.typname = 'UserRole'`;
    console.log(enums);
  } catch (err) {
    console.error('Diagnostic failed:', err);
  } finally {
    await prisma.$disconnect();
  }
}

main();
