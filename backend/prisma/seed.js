/**
 * Seed script for Supabase — creates initial police stations and a Station Admin.
 * Run AFTER migrations: node prisma/seed.js
 */
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');

const prisma = new PrismaClient();

const STATIONS = [
  { name: 'Bengaluru Central', district: 'Bengaluru Urban', state: 'Karnataka', lat: 12.9716, lng: 77.5946, radius: 8, contact: '080-22943222' },
  { name: 'Chennai Commissioner', district: 'Chennai', state: 'Tamil Nadu', lat: 13.0827, lng: 80.2707, radius: 10, contact: '044-23452345' },
  { name: 'Delhi Police HQ', district: 'New Delhi', state: 'Delhi', lat: 28.6139, lng: 77.2090, radius: 12, contact: '011-23490000' },
  { name: 'Mumbai Commissioner', district: 'Mumbai', state: 'Maharashtra', lat: 19.0760, lng: 72.8777, radius: 10, contact: '022-22620111' },
  { name: 'Hyderabad Commissioner', district: 'Hyderabad', state: 'Telangana', lat: 17.3850, lng: 78.4867, radius: 10, contact: '040-27852345' },
];

async function main() {
  console.log('🌱 Seeding REVA AI database...\n');

  // Create stations
  console.log('📍 Creating police stations...');
  const createdStations = [];
  for (const s of STATIONS) {
    const station = await prisma.policeStation.upsert({
      where: { id: uuidv4() },
      create: {
        id: uuidv4(),
        stationName: s.name,
        district: s.district,
        state: s.state,
        latitude: s.lat,
        longitude: s.lng,
        radiusKm: s.radius,
        contactNumber: s.contact,
        status: true,
      },
      update: {},
    });
    createdStations.push(station);
    console.log(`  ✅ ${s.name} (${s.district})`);
  }

  // Create Super Admin (pick first station)
  const stationId = createdStations[0].id;
  const adminEmail = 'admin@reva.gov.in';
  const adminPassword = 'Admin@123';
  const hashedPwd = await bcrypt.hash(adminPassword, 12);

  const existingAdmin = await prisma.policeUser.findUnique({ where: { email: adminEmail } });
  if (!existingAdmin) {
    await prisma.policeUser.create({
      data: {
        id: uuidv4(),
        stationId,
        name: 'Super Administrator',
        email: adminEmail,
        passwordHash: hashedPwd,
        role: 'SUPER_ADMIN',
        isActive: true,
      },
    });
    console.log(`\n👮 Created Super Admin:`);
    console.log(`   Email:    ${adminEmail}`);
    console.log(`   Password: ${adminPassword}`);
    console.log(`   Station:  ${createdStations[0].stationName}`);
  } else {
    console.log(`\nℹ️  Admin ${adminEmail} already exists`);
  }

  // Create a Station Admin for each station
  for (let i = 0; i < Math.min(createdStations.length, 3); i++) {
    const st = createdStations[i];
    const email = `station${i + 1}@reva.gov.in`;
    const exists = await prisma.policeUser.findUnique({ where: { email } });
    if (!exists) {
      await prisma.policeUser.create({
        data: {
          id: uuidv4(),
          stationId: st.id,
          name: `${st.stationName} Admin`,
          email,
          passwordHash: hashedPwd,
          role: 'STATION_ADMIN',
          isActive: true,
        },
      });
      console.log(`   Station Admin: ${email} → ${st.stationName}`);
    }
  }

  console.log('\n✅ Seed complete!');
  console.log('\n🔑 Police Portal Login Credentials:');
  console.log('   Super Admin:   admin@reva.gov.in / Admin@123');
  console.log('   Station 1:     station1@reva.gov.in / Admin@123');
  console.log('   Station 2:     station2@reva.gov.in / Admin@123');
}

main()
  .catch(err => { console.error('❌ Seed failed:', err.message); process.exit(1); })
  .finally(() => prisma.$disconnect());
