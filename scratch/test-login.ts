import { prisma } from '../src/lib/prisma';
import bcrypt from 'bcryptjs';

async function testAccounts() {
  const accounts = [
    { email: 'admin@hospital.com', pass: 'Admin@12345', role: 'ADMIN' },
    { email: 'dr.malhotra@hospital.com', pass: 'Doctor@12345', role: 'DOCTOR' },
    { email: 'dr.patel@hospital.com', pass: 'Doctor@12345', role: 'DOCTOR' },
    { email: 'patient.aarav@example.com', pass: 'Patient@12345', role: 'PATIENT' },
    { email: 'reception@hospital.com', pass: 'Staff@12345', role: 'RECEPTIONIST' },
  ];


  console.log('Testing seeded account passwords...\n');
  for (const acc of accounts) {
    const user = await prisma.user.findUnique({ where: { email: acc.email } });
    if (!user) {
      console.error(`❌ User not found in DB: ${acc.email}`);
      continue;
    }
    const match = await bcrypt.compare(acc.pass, user.passwordHash);
    if (match) {
      console.log(`✅ ${acc.role.padEnd(12)} ${acc.email.padEnd(28)} Password matches! Role: ${user.role}`);
    } else {
      console.error(`❌ Password mismatch for: ${acc.email}`);
    }
  }
}

testAccounts()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
