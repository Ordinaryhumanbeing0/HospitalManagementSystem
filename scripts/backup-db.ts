import { PrismaClient } from '@prisma/client';
import fs from 'fs';
import path from 'path';

const prisma = new PrismaClient();

async function main() {
  console.log('====================================================');
  console.log('📦 HOSPITAL MANAGEMENT SYSTEM - DATABASE BACKUP TOOL');
  console.log('====================================================\n');

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupsDir = path.join(process.cwd(), 'backups');

  if (!fs.existsSync(backupsDir)) {
    fs.mkdirSync(backupsDir, { recursive: true });
  }

  const backupFilename = `backup-${timestamp}.json`;
  const backupFilePath = path.join(backupsDir, backupFilename);

  console.log(`Connecting to database and snapshotting tables sequentially...`);

  const systemSettings = await prisma.systemSetting.findMany();
  const users = await prisma.user.findMany();
  const departments = await prisma.department.findMany();
  const doctors = await prisma.doctor.findMany();
  const doctorSchedules = await prisma.doctorSchedule.findMany();
  const patients = await prisma.patient.findMany();
  const appointments = await prisma.appointment.findMany();
  const prescriptions = await prisma.prescription.findMany();
  const medicalReports = await prisma.medicalReport.findMany();
  const bills = await prisma.bill.findMany();
  const payments = await prisma.payment.findMany();
  const notifications = await prisma.notification.findMany();
  const auditLogs = await prisma.auditLog.findMany();

  const backupData = {
    metadata: {
      version: '1.0.0',
      timestamp: new Date().toISOString(),
      generator: 'HMS-Backup-Utility',
      recordCounts: {
        systemSettings: systemSettings.length,
        users: users.length,
        departments: departments.length,
        doctors: doctors.length,
        doctorSchedules: doctorSchedules.length,
        patients: patients.length,
        appointments: appointments.length,
        prescriptions: prescriptions.length,
        medicalReports: medicalReports.length,
        bills: bills.length,
        payments: payments.length,
        notifications: notifications.length,
        auditLogs: auditLogs.length,
      },
    },
    tables: {
      systemSettings,
      users,
      departments,
      doctors,
      doctorSchedules,
      patients,
      appointments,
      prescriptions,
      medicalReports,
      bills,
      payments,
      notifications,
      auditLogs,
    },
  };


  fs.writeFileSync(backupFilePath, JSON.stringify(backupData, null, 2), 'utf8');

  console.log(`\n✅ Database backup created successfully!`);
  console.log(`📁 File: ${backupFilePath}`);
  console.log(`📊 Snapshot Summary:`);
  console.log(`   - Users: ${users.length}`);
  console.log(`   - Departments: ${departments.length}`);
  console.log(`   - Doctors: ${doctors.length}`);
  console.log(`   - Patients: ${patients.length}`);
  console.log(`   - Appointments: ${appointments.length}`);
  console.log(`   - Prescriptions: ${prescriptions.length}`);
  console.log(`   - Medical Reports: ${medicalReports.length}`);
  console.log(`   - Bills & Invoices: ${bills.length}`);
  console.log(`   - Payments: ${payments.length}`);
  console.log(`   - Notifications: ${notifications.length}`);
  console.log(`   - Audit Logs: ${auditLogs.length}`);
  console.log('====================================================\n');
}

main()
  .catch((err) => {
    console.error('❌ Backup failed:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
