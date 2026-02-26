const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');

const prisma = new PrismaClient();

async function main() {
  console.log('🚀 Starting comprehensive database seeding...');

  // 1. Cleanup existing data (optional, but good for a fresh start)
  // We do it in reverse order of relations
  console.log('🧹 Cleaning up old data...');
  await prisma.auditLog.deleteMany({});
  await prisma.notification.deleteMany({});
  await prisma.evidence.deleteMany({});
  await prisma.complaintUpdate.deleteMany({});
  await prisma.complaint.deleteMany({});
  await prisma.policeUser.deleteMany({});
  await prisma.user.deleteMany({});
  await prisma.policeStation.deleteMany({});

  const hashedPwd = await bcrypt.hash('Admin@123', 12);

  // 2. Create GLOBAL_ADMIN
  console.log('🌍 Creating Global Admin...');
  await prisma.policeUser.create({
    data: {
      id: uuidv4(),
      name: 'Global Administrator',
      email: 'global_admin@reva.gov.in',
      passwordHash: hashedPwd,
      role: 'GLOBAL_ADMIN',
      isActive: true,
      stationId: null,
    },
  });

  // 3. Create Police Stations
  console.log('📍 Creating Police Stations...');
  const stations = [
    {
      name: 'Koramangala Station',
      district: 'Bengaluru Urban',
      state: 'Karnataka',
      lat: 12.9352,
      lng: 77.6245,
      radius: 4,
    },
    {
      name: 'Indiranagar Station',
      district: 'Bengaluru Urban',
      state: 'Karnataka',
      lat: 12.9719,
      lng: 77.6412,
      radius: 3,
    },
    {
      name: 'HSR Layout Station',
      district: 'Bengaluru Urban',
      state: 'Karnataka',
      lat: 12.9121,
      lng: 77.6446,
      radius: 5,
    },
  ];

  const createdStations = [];
  for (const s of stations) {
    const station = await prisma.policeStation.create({
      data: {
        id: uuidv4(),
        stationName: s.name,
        district: s.district,
        state: s.state,
        latitude: s.lat,
        longitude: s.lng,
        radiusKm: s.radius,
        contactNumber: '080-1234' + Math.floor(Math.random() * 9000 + 1000),
      },
    });
    createdStations.push(station);
  }

  // 4. Create Station Admins and Officers
  console.log('👮 Creating Police Personnel...');
  const officers = [];
  for (const station of createdStations) {
    // Create one Station Admin per station
    const admin = await prisma.policeUser.create({
      data: {
        id: uuidv4(),
        stationId: station.id,
        name: `${station.stationName} Admin`,
        email: `admin.${station.stationName.toLowerCase().replace(/ /g, '')}@police.gov.in`,
        passwordHash: hashedPwd,
        role: 'STATION_ADMIN',
        isActive: true,
      },
    });

    // Create 3 officers per station
    for (let i = 1; i <= 3; i++) {
      const officer = await prisma.policeUser.create({
        data: {
          id: uuidv4(),
          stationId: station.id,
          name: `Officer ${i} (${station.stationName})`,
          email: `officer${i}.${station.stationName.toLowerCase().replace(/ /g, '')}@police.gov.in`,
          passwordHash: hashedPwd,
          role: 'OFFICER',
        },
      });
      officers.push(officer);
    }
  }

  // 5. Create Users (Citizens)
  console.log('👥 Creating Citizen Users...');
  const citizens = [];
  const citizenData = [
    { name: 'Rahul Sharma', mobile: '9876543210', aadhaar: 'XXXX-XXXX-1234', verified: true },
    { name: 'Priya Verma', mobile: '9888877777', aadhaar: 'XXXX-XXXX-5678', verified: true },
    { name: 'Anonymous Reporter', mobile: null, aadhaar: null, verified: true, anonymous: true },
  ];

  for (const c of citizenData) {
    const user = await prisma.user.create({
      data: {
        id: uuidv4(),
        name: c.name,
        mobileNumber: c.mobile,
        aadhaarMasked: c.aadhaar,
        internalRef: uuidv4(),
        isVerified: c.verified,
        isAnonymous: c.anonymous || false,
        language: 'en',
      },
    });
    citizens.push(user);
  }

  // 6. Create Complaints
  console.log('📋 Creating Sample Complaints...');
  const complaintTypes = [
    'Theft',
    'Public Nuisance',
    'Traffic Violation',
    'Missing Person',
    'Cyber Crime',
  ];
  const statuses = ['FILED', 'UNDER_REVIEW', 'ASSIGNED', 'IN_PROGRESS', 'RESOLVED'];

  for (let i = 1; i <= 10; i++) {
    const station = createdStations[Math.floor(Math.random() * createdStations.length)];
    const user = citizens[Math.floor(Math.random() * citizens.length)];
    const status = statuses[Math.floor(Math.random() * statuses.length)];
    const type = complaintTypes[Math.floor(Math.random() * complaintTypes.length)];

    let assignedOfficerId = null;
    if (status === 'ASSIGNED' || status === 'IN_PROGRESS' || status === 'RESOLVED') {
      const stationOfficers = officers.filter((o) => o.stationId === station.id);
      assignedOfficerId = stationOfficers[Math.floor(Math.random() * stationOfficers.length)].id;
    }

    const complaint = await prisma.complaint.create({
      data: {
        id: uuidv4(),
        trackingId: `REV-${2024}-${1000 + i}`,
        userId: user.id,
        stationId: station.id,
        assignedOfficerId: assignedOfficerId,
        status: status,
        priorityLevel: i % 3 === 0 ? 'HIGH' : 'MODERATE',
        incidentType: type,
        summaryText: `This is a sample report for ${type}. Incident occurred near ${station.stationName}.`,
        locationLat: station.latitude + (Math.random() - 0.5) * 0.01,
        locationLng: station.longitude + (Math.random() - 0.5) * 0.01,
        isEmergency: i % 5 === 0,
        legalConfirmed: true,
      },
    });

    // 7. Create Updates and Notifications for some complaints
    if (i % 2 === 0) {
      await prisma.complaintUpdate.create({
        data: {
          complaintId: complaint.id,
          updatedBy: 'SYSTEM',
          updateType: 'STATUS_CHANGE',
          content: `Complaint status moved to ${status}`,
        },
      });

      await prisma.notification.create({
        data: {
          userId: user.id,
          complaintId: complaint.id,
          type: 'STATUS_UPDATE',
          message: `Your complaint state has been updated to ${status}.`,
        },
      });
    }
  }

  console.log('\n✅ Seeding complete!');
  console.log('--------------------------------------------------');
  console.log('GLOBAL ADMIN: global_admin@reva.gov.in / Admin@123');
  console.log('STATION ADMIN: admin.koramangalastation@police.gov.in / Admin@123');
  console.log('CITIZEN: Login via Aadhaar or Mobile (Rahul Sharma: 9876543210)');
  console.log('--------------------------------------------------');
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
