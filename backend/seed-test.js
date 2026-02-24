const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const prisma = new PrismaClient();

async function main() {
  console.log('--- Starting Seed Script ---');
  
  try {
    // 1. Seed Police Station
    const stationCount = await prisma.policeStation.count();
    let station;
    
    if (stationCount === 0) {
      station = await prisma.policeStation.create({
        data: {
          stationName: 'HQ Police Station',
          district: 'Bengaluru Central',
          state: 'Karnataka',
          latitude: 12.9716,
          longitude: 77.5946,
          radiusKm: 100,
          contactNumber: '080-12345678',
        }
      });
      console.log('✅ Created HQ Police Station');
    } else {
      station = await prisma.policeStation.findFirst();
      console.log('ℹ️ Police Station already exists');
    }

    // 2. Seed Police User
    const policeCount = await prisma.policeUser.count();
    if (policeCount === 0) {
      const hashedPassword = await bcrypt.hash('password123', 10);
      await prisma.policeUser.create({
        data: {
          name: 'Inspector Raj',
          email: 'raj@police.gov.in',
          password: hashedPassword,
          role: 'STATION_ADMIN',
          stationId: station.id,
          isActive: true
        }
      });
      console.log('✅ Created Police Admin: raj@police.gov.in / password123');
    } else {
      console.log('ℹ️ Police Users already exist');
    }

    console.log('--- Seed Script Finished ---');
  } catch (err) {
    console.error('❌ Seed failed:', err);
  } finally {
    await prisma.$disconnect();
  }
}

main();
