import { PrismaClient } from '@prisma/client';
import fs from 'fs';
import path from 'path';

const prisma = new PrismaClient();

async function main() {
  console.log('=====================================================');
  console.log('♻️ HOSPITAL MANAGEMENT SYSTEM - DATABASE RESTORE TOOL');
  console.log('=====================================================\n');

  const args = process.argv.slice(2);
  const backupsDir = path.join(process.cwd(), 'backups');

  let targetFile = args[0];

  if (!targetFile) {
    // Find most recent backup in backupsDir
    if (!fs.existsSync(backupsDir)) {
      console.error('❌ No backups directory found at:', backupsDir);
      process.exit(1);
    }

    const files = fs
      .readdirSync(backupsDir)
      .filter((f) => f.startsWith('backup-') && f.endsWith('.json'))
      .sort()
      .reverse();

    if (files.length === 0) {
      console.error('❌ No backup snapshot files found in:', backupsDir);
      process.exit(1);
    }

    targetFile = path.join(backupsDir, files[0]);
    console.log(`ℹ️ No file specified. Auto-selected latest backup: ${files[0]}`);
  } else if (!path.isAbsolute(targetFile)) {
    targetFile = path.join(process.cwd(), targetFile);
  }

  if (!fs.existsSync(targetFile)) {
    console.error('❌ Backup file not found at:', targetFile);
    process.exit(1);
  }

  console.log(`Reading backup file: ${targetFile}...`);
  const rawData = fs.readFileSync(targetFile, 'utf8');
  const backupData = JSON.parse(rawData);

  if (!backupData.tables) {
    console.error('❌ Invalid backup file format: missing "tables" payload.');
    process.exit(1);
  }

  console.log(`Verifying backup timestamp: ${backupData.metadata?.timestamp || 'Unknown'}`);
  console.log(`Snapshot contains:`);
  Object.entries(backupData.metadata?.recordCounts || {}).forEach(([table, count]) => {
    console.log(`   - ${table}: ${count}`);
  });

  console.log('\nRestoring data safely into database...');

  // Upsert records to prevent primary key conflicts
  const { tables } = backupData;

  // 0. System Settings
  if (tables.systemSettings) {
    for (const s of tables.systemSettings) {
      await prisma.systemSetting.upsert({
        where: { key: s.key },
        update: { value: s.value, description: s.description },
        create: s,
      });
    }
  }

  // 1. Departments
  if (tables.departments) {
    for (const d of tables.departments) {
      await prisma.department.upsert({
        where: { id: d.id },
        update: { name: d.name, description: d.description },
        create: d,
      });
    }
  }

  // 2. Users
  if (tables.users) {
    for (const u of tables.users) {
      await prisma.user.upsert({
        where: { id: u.id },
        update: { name: u.name, phone: u.phone, role: u.role },
        create: u,
      });
    }
  }

  // 3. Doctors
  if (tables.doctors) {
    for (const doc of tables.doctors) {
      await prisma.doctor.upsert({
        where: { id: doc.id },
        update: {
          specialization: doc.specialization,
          qualification: doc.qualification,
          consultationFee: doc.consultationFee,
        },
        create: doc,
      });
    }
  }

  // 4. Doctor Schedules
  if (tables.doctorSchedules) {
    for (const s of tables.doctorSchedules) {
      await prisma.doctorSchedule.upsert({
        where: { id: s.id },
        update: { startTime: s.startTime, endTime: s.endTime, slotDuration: s.slotDuration, isActive: s.isActive },
        create: s,
      });
    }
  }

  // 5. Patients
  if (tables.patients) {
    for (const p of tables.patients) {
      await prisma.patient.upsert({
        where: { id: p.id },
        update: {
          bloodGroup: p.bloodGroup,
          address: p.address,
          emergencyContact: p.emergencyContact,
          medicalHistorySummary: p.medicalHistorySummary,
        },
        create: {
          ...p,
          dateOfBirth: new Date(p.dateOfBirth),
        },
      });
    }
  }

  // 6. Appointments
  if (tables.appointments) {
    for (const a of tables.appointments) {
      await prisma.appointment.upsert({
        where: { id: a.id },
        update: { status: a.status, timeSlot: a.timeSlot, reason: a.reason },
        create: {
          ...a,
          appointmentDate: new Date(a.appointmentDate),
        },
      });
    }
  }

  // 7. Prescriptions
  if (tables.prescriptions) {
    for (const rx of tables.prescriptions) {
      await prisma.prescription.upsert({
        where: { id: rx.id },
        update: { diagnosis: rx.diagnosis, notes: rx.notes, medications: rx.medications },
        create: rx,
      });
    }
  }

  // 8. Medical Reports
  if (tables.medicalReports) {
    for (const rep of tables.medicalReports) {
      await prisma.medicalReport.upsert({
        where: { id: rep.id },
        update: { title: rep.title, reportType: rep.reportType, fileUrl: rep.fileUrl, notes: rep.notes },
        create: rep,
      });
    }
  }

  // 9. Bills
  if (tables.bills) {
    for (const b of tables.bills) {
      await prisma.bill.upsert({
        where: { id: b.id },
        update: { totalAmount: b.totalAmount, paidAmount: b.paidAmount, status: b.status, items: b.items },
        create: b,
      });
    }
  }

  // 10. Payments
  if (tables.payments) {
    for (const pay of tables.payments) {
      await prisma.payment.upsert({
        where: { id: pay.id },
        update: { amount: pay.amount, method: pay.method, transactionRef: pay.transactionRef },
        create: {
          ...pay,
          receivedAt: new Date(pay.receivedAt),
        },
      });
    }
  }

  console.log('\n✅ Database restore completed successfully!');
  console.log('=====================================================\n');
}

main()
  .catch((err) => {
    console.error('❌ Restore failed:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
