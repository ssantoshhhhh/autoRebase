const { prisma } = require('./src/utils/prisma');

async function main() {
  try {
    const policeUsers = await prisma.policeUser.findMany({
      select: { email: true, role: true, name: true }
    });
    console.log(JSON.stringify(policeUsers, null, 2));
  } catch (e) {
    console.error(e);
  }
  process.exit(0);
}

main();
