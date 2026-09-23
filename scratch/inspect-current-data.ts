import { prisma } from '../src/lib/prisma';

async function main() {
  const users = await prisma.user.findMany({
    select: { id: true, name: true, email: true, role: true, phone: true },
    orderBy: { createdAt: 'asc' },
  });
  console.log('--- ALL USERS IN DB ---');
  users.forEach((u) => console.log(`${u.role.padEnd(12)} | ${u.name.padEnd(35)} | ${u.email}`));

  const doctors = await prisma.doctor.findMany({
    include: { user: true, department: true },
  });
  console.log('\n--- DOCTORS ---');
  doctors.forEach((d) => console.log(`${d.user.name} | Fee: ${d.consultationFee} | Dept: ${d.department.name}`));

  const bills = await prisma.bill.findMany({
    take: 5,
    orderBy: { createdAt: 'desc' },
  });
  console.log('\n--- SAMPLE BILLS ---');
  bills.forEach((b) => console.log(`Bill ${b.id} | Total: ${b.totalAmount} | Paid: ${b.paidAmount} | Status: ${b.status}`));
}

main().finally(() => prisma.$disconnect());
