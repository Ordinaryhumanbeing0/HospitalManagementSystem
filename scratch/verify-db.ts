import { prisma } from '../src/lib/prisma';

async function main() {
  const users = await prisma.user.findMany({
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      phone: true,
    },
  });

  const departments = await prisma.department.findMany({
    select: {
      id: true,
      name: true,
      _count: { select: { doctors: true } },
    },
  });

  const doctors = await prisma.doctor.findMany({
    include: {
      user: { select: { name: true, email: true } },
      department: { select: { name: true } },
      schedules: true,
    },
  });

  const patients = await prisma.patient.findMany({
    include: {
      user: { select: { name: true, email: true } },
    },
  });

  const auditLogs = await prisma.auditLog.findMany();

  console.log('-----------------------------------------------------------');
  console.log('✅ DATABASE STATUS:');
  console.log(`- Total Users:        ${users.length}`);
  console.log(`- Total Departments:  ${departments.length}`);
  console.log(`- Total Doctors:      ${doctors.length}`);
  console.log(`- Total Patients:     ${patients.length}`);
  console.log(`- Total Audit Logs:   ${auditLogs.length}`);
  console.log('-----------------------------------------------------------');
  console.log('🏢 Departments and Doctor Counts:');
  departments.forEach((d) => console.log(`  • ${d.name.padEnd(20)}: ${d._count.doctors} doctor(s)`));
  console.log('-----------------------------------------------------------');
}

main()
  .catch(console.error)
  .finally(async () => {
    await prisma.$disconnect();
  });
