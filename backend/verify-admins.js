const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const admins = await prisma.policeUser.findMany({
    where: { role: 'GLOBAL_ADMIN' }
  });
  console.log('--- Global Admins in police_users table ---');
  console.log(admins);
}

main().finally(() => prisma.$disconnect());
