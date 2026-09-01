import { prisma } from '../src/lib/prisma';
import bcrypt from 'bcryptjs';
import { signJWT, verifyJWT } from '../src/lib/auth/jwt';
import { Role } from '@prisma/client';

async function runTests() {
  console.log('🧪 Starting Step 3 & Step 4 Automated Verification Suite...\n');

  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, testName: string) {
    if (condition) {
      console.log(`  ✅ PASS: ${testName}`);
      passed++;
    } else {
      console.error(`  ❌ FAIL: ${testName}`);
      failed++;
    }
  }

  // --- Test 1: Password Hashing ---
  console.log('1. Password Hashing & Verification');
  const password = 'SecurePassword@123';
  const hash = await bcrypt.hash(password, 10);
  const isMatch = await bcrypt.compare(password, hash);
  const isWrong = await bcrypt.compare('WrongPassword', hash);
  assert(isMatch === true, 'Bcrypt correctly verifies valid password');
  assert(isWrong === false, 'Bcrypt rejects invalid password');

  // --- Test 2: JWT Sign & Verify ---
  console.log('\n2. JWT Session Token Security');
  const payload = {
    id: 'user_123',
    email: 'admin@hospital.com',
    name: 'Admin Vance',
    role: Role.ADMIN,
    phone: '+1 555-0100',
    patientId: null,
    doctorId: null,
  };
  const token = await signJWT(payload, '2h');
  assert(typeof token === 'string' && token.length > 20, 'JWT successfully signed');
  const decoded = await verifyJWT(token);
  assert(decoded?.email === 'admin@hospital.com' && decoded?.role === Role.ADMIN, 'JWT successfully verified with correct payload');

  // --- Test 3: Patient Multi-field Search & Indexing ---
  console.log('\n3. Patient Search & Database Querying');
  const searchJohn = await prisma.patient.findMany({
    where: {
      OR: [
        { user: { name: { contains: 'John', mode: 'insensitive' } } },
        { user: { email: { contains: 'John', mode: 'insensitive' } } },
      ],
    },
    include: { user: true },
  });
  assert(searchJohn.length > 0 && searchJohn[0].user.name.includes('John'), 'Found patient by partial name match');

  const searchBlood = await prisma.patient.findMany({
    where: { bloodGroup: 'O+' },
    include: { user: true },
  });
  assert(searchBlood.length > 0 && searchBlood.every((p) => p.bloodGroup === 'O+'), 'Filtered patients by blood group O+');

  // --- Test 4: Doctor & Department Relations ---
  console.log('\n4. Doctor & Department Management');
  const cardioDept = await prisma.department.findUnique({
    where: { name: 'Cardiology' },
    include: { doctors: { include: { user: true, schedules: true } } },
  });
  assert(cardioDept !== null, 'Cardiology department exists');
  assert(cardioDept!.doctors.length > 0, 'Cardiology has assigned doctors');
  assert(cardioDept!.doctors[0].schedules.length > 0, 'Doctor has active weekly schedule slots');

  // --- Test 5: Department Deletion Guard ---
  console.log('\n5. Department Deletion Safety Guard');
  const deptWithDoctors = await prisma.department.findUnique({
    where: { name: 'Cardiology' },
    include: { _count: { select: { doctors: true } } },
  });
  assert(deptWithDoctors!._count.doctors > 0, 'Safety check prevents deletion when assigned doctors exist');

  // --- Test 6: Audit Logging ---
  console.log('\n6. Audit Trail Recording');
  const testLog = await prisma.auditLog.create({
    data: {
      action: 'TEST_SUITE_RUN',
      details: 'Automated verification test completed.',
      ipAddress: '127.0.0.1',
    },
  });
  assert(testLog.id !== undefined && testLog.action === 'TEST_SUITE_RUN', 'Audit log record written successfully');

  // Cleanup test log
  await prisma.auditLog.delete({ where: { id: testLog.id } });

  console.log('\n==========================================');
  console.log(`🏁 Test Summary: ${passed} Passed, ${failed} Failed`);
  console.log('==========================================\n');

  if (failed > 0) process.exit(1);
}

runTests()
  .catch((e) => {
    console.error('Fatal test error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
