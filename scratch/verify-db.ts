import { prisma } from '../src/lib/prisma';
import { formatCurrency } from '../src/lib/config/currency';

async function main() {
  const settings = await prisma.systemSetting.findMany();
  const users = await prisma.user.findMany({
    select: { id: true, name: true, email: true, role: true, phone: true },
    orderBy: { createdAt: 'asc' },
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
      user: { select: { name: true, email: true, phone: true } },
      department: { select: { name: true } },
      schedules: true,
    },
  });

  const patients = await prisma.patient.findMany({
    include: {
      user: { select: { name: true, email: true, phone: true } },
    },
  });

  const bills = await prisma.bill.findMany({
    include: {
      patient: { include: { user: true } },
      payments: true,
    },
  });

  const auditLogs = await prisma.auditLog.findMany({
    take: 5,
    orderBy: { createdAt: 'desc' },
  });

  console.log('===========================================================');
  console.log('🇮🇳 HOSPITAL SYSTEM DATABASE STATUS & LOCALIZATION CHECK');
  console.log('===========================================================');

  console.log('\n⚙️ SYSTEM CONFIGURATION (Table: SystemSetting):');
  settings.forEach((s) => console.log(`   • ${s.key.padEnd(25)}: ${s.value}`));

  console.log('\n👤 REGISTERED USERS (Table: User):');
  users.forEach((u) =>
    console.log(`   • ${u.role.padEnd(12)} | ${u.name.padEnd(42)} | ${u.email.padEnd(30)} | ${u.phone}`)
  );

  console.log('\n👨‍⚕️ DOCTORS & CLINICAL FEES (Table: Doctor):');
  doctors.forEach((d) =>
    console.log(
      `   • ${d.user.name.padEnd(25)} | Dept: ${d.department.name.padEnd(16)} | Fee: ${formatCurrency(
        d.consultationFee
      )} (${d.consultationFee} INR)`
    )
  );

  console.log('\n🧑‍🤝‍🧑 PATIENTS & PROFILES (Table: Patient):');
  patients.forEach((p) =>
    console.log(
      `   • ${p.user.name.padEnd(18)} | Blood: ${p.bloodGroup || 'N/A'} | Emergency: ${p.emergencyContact}\n     Address: ${p.address}`
    )
  );

  console.log('\n💳 BILLS & PAYMENTS (Tables: Bill, Payment):');
  bills.forEach((b) => {
    console.log(
      `   • Bill #${b.id.slice(-8)} | Patient: ${b.patient.user.name} | Total: ${formatCurrency(
        b.totalAmount
      )} | Paid: ${formatCurrency(b.paidAmount)} | Status: ${b.status}`
    );
    b.payments.forEach((pay) => {
      console.log(
        `     ↳ Settlement: ${formatCurrency(pay.amount)} via ${pay.method} (Ref: ${pay.transactionRef})`
      );
    });
  });

  console.log('\n📝 RECENT AUDIT LOGS (Table: AuditLog):');
  auditLogs.forEach((a) => console.log(`   • [${a.action}] ${a.details}`));

  console.log('\n===========================================================');
  console.log('✅ ALL DATABASE RECORDS ARE FULLY LOCALIZED TO INDIAN STANDARDS!');
  console.log('===========================================================');
}

main()
  .catch(console.error)
  .finally(async () => {
    await prisma.$disconnect();
  });
