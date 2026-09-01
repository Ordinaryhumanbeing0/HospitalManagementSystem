import { PrismaClient, Role, AppointmentStatus, PaymentStatus, PaymentMethod } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL,
    },
  },
});

async function main() {
  console.log('🚀 Starting comprehensive database seed (populating all tables)...');

  // 1. Clear existing data in reverse order of foreign key dependencies
  console.log('🧹 Cleaning up old records...');
  await prisma.auditLog.deleteMany();
  await prisma.notification.deleteMany();
  await prisma.payment.deleteMany();
  await prisma.bill.deleteMany();
  await prisma.medicalReport.deleteMany();
  await prisma.prescription.deleteMany();
  await prisma.appointment.deleteMany();
  await prisma.doctorSchedule.deleteMany();
  await prisma.patient.deleteMany();
  await prisma.doctor.deleteMany();
  await prisma.department.deleteMany();
  await prisma.user.deleteMany();

  // 2. Hash standard passwords
  const adminPasswordHash = await bcrypt.hash('Admin@12345', 10);
  const doctorPasswordHash = await bcrypt.hash('Doctor@12345', 10);
  const staffPasswordHash = await bcrypt.hash('Staff@12345', 10);
  const patientPasswordHash = await bcrypt.hash('Patient@12345', 10);

  // ----------------------------------------------------
  // 3. Seed Departments (Table: Department)
  // ----------------------------------------------------
  console.log('🏢 Seeding Departments...');
  const departmentsData = [
    {
      name: 'Cardiology',
      description: 'Cardiovascular diagnostics, ECG, echocardiograms, and preventative heart wellness.',
    },
    {
      name: 'Neurology',
      description: 'Comprehensive neurological evaluation and clinical care for brain and nerve disorders.',
    },
    {
      name: 'Orthopedics',
      description: 'Musculoskeletal medicine, joint therapies, sports trauma, and rehabilitation.',
    },
    {
      name: 'Pediatrics',
      description: 'Primary pediatric healthcare, neonatal surveillance, and adolescent wellness.',
    },
    {
      name: 'General Medicine',
      description: 'Outpatient primary care, chronic disease management, and preventative health checks.',
    },
  ];

  const createdDepartments: Record<string, string> = {};
  for (const dept of departmentsData) {
    const created = await prisma.department.create({
      data: dept,
    });
    createdDepartments[dept.name] = created.id;
  }

  // ----------------------------------------------------
  // 4. Seed Staff Users (Table: User)
  // ----------------------------------------------------
  console.log('👤 Seeding Admin & Receptionist Users...');
  const adminUser = await prisma.user.create({
    data: {
      email: 'admin@hospital.com',
      name: 'Dr. Arthur Vance (Chief Medical Officer)',
      phone: '+1 (555) 010-0001',
      passwordHash: adminPasswordHash,
      role: Role.ADMIN,
    },
  });

  const receptionistUser = await prisma.user.create({
    data: {
      email: 'reception@hospital.com',
      name: 'Sarah Jenkins',
      phone: '+1 (555) 010-0002',
      passwordHash: staffPasswordHash,
      role: Role.RECEPTIONIST,
    },
  });

  // ----------------------------------------------------
  // 5. Seed Doctors & Schedules (Tables: User, Doctor, DoctorSchedule)
  // ----------------------------------------------------
  console.log('👨‍⚕️ Seeding Doctors and Weekly Schedules...');
  const doctorsData = [
    {
      name: 'Dr. Robert Chen',
      email: 'dr.chen@hospital.com',
      phone: '+1 (555) 201-1001',
      department: 'Cardiology',
      specialization: 'Interventional Cardiology & Electrophysiology',
      qualification: 'MD (Cardiology), FACC',
      consultationFee: 150.0,
      schedules: [
        { dayOfWeek: 1, startTime: '09:00', endTime: '16:00', slotDuration: 30 },
        { dayOfWeek: 3, startTime: '09:00', endTime: '16:00', slotDuration: 30 },
        { dayOfWeek: 5, startTime: '09:00', endTime: '13:00', slotDuration: 30 },
      ],
    },
    {
      name: 'Dr. Aisha Patel',
      email: 'dr.patel@hospital.com',
      phone: '+1 (555) 201-1002',
      department: 'Neurology',
      specialization: 'Neurological Disorders & Stroke Care',
      qualification: 'MD, DM (Neurology)',
      consultationFee: 160.0,
      schedules: [
        { dayOfWeek: 2, startTime: '10:00', endTime: '17:00', slotDuration: 30 },
        { dayOfWeek: 4, startTime: '10:00', endTime: '17:00', slotDuration: 30 },
      ],
    },
    {
      name: 'Dr. David Kim',
      email: 'dr.kim@hospital.com',
      phone: '+1 (555) 201-1005',
      department: 'General Medicine',
      specialization: 'Internal Medicine & Preventative Care',
      qualification: 'MBBS, MD (Internal Medicine)',
      consultationFee: 100.0,
      schedules: [
        { dayOfWeek: 1, startTime: '08:00', endTime: '16:00', slotDuration: 30 },
        { dayOfWeek: 2, startTime: '08:00', endTime: '16:00', slotDuration: 30 },
        { dayOfWeek: 3, startTime: '08:00', endTime: '16:00', slotDuration: 30 },
        { dayOfWeek: 4, startTime: '08:00', endTime: '16:00', slotDuration: 30 },
        { dayOfWeek: 5, startTime: '08:00', endTime: '14:00', slotDuration: 30 },
      ],
    },
  ];

  const createdDoctors: any[] = [];
  for (const doc of doctorsData) {
    const docUser = await prisma.user.create({
      data: {
        email: doc.email,
        name: doc.name,
        phone: doc.phone,
        passwordHash: doctorPasswordHash,
        role: Role.DOCTOR,
      },
    });

    const doctorRecord = await prisma.doctor.create({
      data: {
        userId: docUser.id,
        departmentId: createdDepartments[doc.department],
        specialization: doc.specialization,
        qualification: doc.qualification,
        consultationFee: doc.consultationFee,
        schedules: {
          create: doc.schedules,
        },
      },
      include: {
        user: true,
        department: true,
      },
    });

    createdDoctors.push(doctorRecord);
  }

  // ----------------------------------------------------
  // 6. Seed Patients (Tables: User, Patient)
  // ----------------------------------------------------
  console.log('🧑‍🤝‍🧑 Seeding Patients...');
  const patientsData = [
    {
      name: 'Johnathan Doe',
      email: 'patient.john@example.com',
      phone: '+1 (555) 301-2001',
      dateOfBirth: new Date('1988-04-12'),
      gender: 'Male',
      bloodGroup: 'O+',
      address: '742 Evergreen Terrace, Springfield, IL 62704',
      emergencyContact: '+1 (555) 301-9001 (Jane Doe - Spouse)',
      medicalHistorySummary: 'Hypertension managed on ACE inhibitors. Mild seasonal pollen allergy.',
    },
    {
      name: 'Maria Elena Rodriguez',
      email: 'patient.maria@example.com',
      phone: '+1 (555) 301-2002',
      dateOfBirth: new Date('1994-08-25'),
      gender: 'Female',
      bloodGroup: 'A+',
      address: '120 Elm Street, Suite 4B, Boston, MA 02115',
      emergencyContact: '+1 (555) 301-9002 (Carlos Rodriguez - Brother)',
      medicalHistorySummary: 'No chronic illnesses. Prior appendectomy in 2018 with no complications.',
    },
    {
      name: 'Liam Alexander Johnson',
      email: 'patient.liam@example.com',
      phone: '+1 (555) 301-2003',
      dateOfBirth: new Date('2002-11-03'),
      gender: 'Male',
      bloodGroup: 'B-',
      address: '45 Baker Street, Apt 12, New York, NY 10001',
      emergencyContact: '+1 (555) 301-9003 (Clara Johnson - Mother)',
      medicalHistorySummary: 'Mild persistent asthma managed with Albuterol PRN. Penicillin allergy.',
    },
  ];

  const createdPatients: any[] = [];
  for (const patient of patientsData) {
    const patientUser = await prisma.user.create({
      data: {
        email: patient.email,
        name: patient.name,
        phone: patient.phone,
        passwordHash: patientPasswordHash,
        role: Role.PATIENT,
      },
    });

    const patientRecord = await prisma.patient.create({
      data: {
        userId: patientUser.id,
        dateOfBirth: patient.dateOfBirth,
        gender: patient.gender,
        bloodGroup: patient.bloodGroup,
        address: patient.address,
        emergencyContact: patient.emergencyContact,
        medicalHistorySummary: patient.medicalHistorySummary,
      },
      include: {
        user: true,
      },
    });

    createdPatients.push(patientRecord);
  }

  // ----------------------------------------------------
  // 7. Seed Appointments (Table: Appointment)
  // ----------------------------------------------------
  console.log('📅 Seeding Appointments...');
  const pastDate = new Date();
  pastDate.setDate(pastDate.getDate() - 3);

  const futureDate1 = new Date();
  futureDate1.setDate(futureDate1.getDate() + 2);

  const futureDate2 = new Date();
  futureDate2.setDate(futureDate2.getDate() + 4);

  // Appointment 1: Completed Consultation (John with Dr. Chen)
  const apptCompleted = await prisma.appointment.create({
    data: {
      patientId: createdPatients[0].id,
      doctorId: createdDoctors[0].id,
      appointmentDate: pastDate,
      timeSlot: '10:00',
      status: AppointmentStatus.COMPLETED,
      reason: 'Routine cardiovascular follow-up and blood pressure assessment.',
    },
  });

  // Appointment 2: Confirmed Upcoming (Maria with Dr. Patel)
  const apptConfirmed1 = await prisma.appointment.create({
    data: {
      patientId: createdPatients[1].id,
      doctorId: createdDoctors[1].id,
      appointmentDate: futureDate1,
      timeSlot: '11:30',
      status: AppointmentStatus.CONFIRMED,
      reason: 'Migraine evaluation and chronic headache review.',
    },
  });

  // Appointment 3: Confirmed Upcoming (Liam with Dr. Kim)
  const apptConfirmed2 = await prisma.appointment.create({
    data: {
      patientId: createdPatients[2].id,
      doctorId: createdDoctors[2].id,
      appointmentDate: futureDate2,
      timeSlot: '09:30',
      status: AppointmentStatus.CONFIRMED,
      reason: 'Seasonal asthma assessment and spirometry follow-up.',
    },
  });

  // Appointment 4: Cancelled Slot (John with Dr. Kim)
  const apptCancelled = await prisma.appointment.create({
    data: {
      patientId: createdPatients[0].id,
      doctorId: createdDoctors[2].id,
      appointmentDate: futureDate1,
      timeSlot: '14:00',
      status: AppointmentStatus.CANCELLED,
      reason: '[Cancelled]: Patient had a work scheduling conflict.',
    },
  });

  // ----------------------------------------------------
  // 8. Seed Prescriptions (Table: Prescription)
  // ----------------------------------------------------
  console.log('💊 Seeding Prescriptions...');
  const prescription1 = await prisma.prescription.create({
    data: {
      appointmentId: apptCompleted.id,
      patientId: createdPatients[0].id,
      doctorId: createdDoctors[0].id,
      diagnosis: 'Stage 1 Primary Hypertension & Mild Tachycardia',
      notes: 'Continue low sodium DASH diet. Exercise 30 minutes daily. Follow up in 3 months with a fresh lipid profile.',
      medications: [
        {
          name: 'Lisinopril 10mg',
          dosage: '1 Tablet',
          frequency: 'Once daily every morning',
          duration: '90 days',
          instructions: 'Take after breakfast with water.',
        },
        {
          name: 'Metoprolol Tartrate 25mg',
          dosage: '1 Tablet',
          frequency: 'Twice daily (morning & night)',
          duration: '30 days',
          instructions: 'Monitor resting pulse.',
        },
      ],
    },
  });

  // ----------------------------------------------------
  // 9. Seed Diagnostic Medical Reports (Table: MedicalReport)
  // ----------------------------------------------------
  console.log('🔬 Seeding Medical Reports...');
  await prisma.medicalReport.create({
    data: {
      patientId: createdPatients[0].id,
      doctorId: createdDoctors[0].id,
      title: 'Complete 12-Lead Electrocardiogram (ECG)',
      reportType: 'ECG / Cardiology',
      fileUrl: 'https://storage.hospitalcare.org/reports/ecg_scan_john_doe_2026.pdf',
      notes: 'Normal sinus rhythm at 72 bpm. Normal PR interval and QRS duration. No ST-segment abnormalities noted.',
    },
  });

  await prisma.medicalReport.create({
    data: {
      patientId: createdPatients[0].id,
      doctorId: createdDoctors[0].id,
      title: 'Lipid & Comprehensive Metabolic Panel (CMP)',
      reportType: 'Blood Test',
      fileUrl: 'https://storage.hospitalcare.org/reports/blood_panel_john_doe.pdf',
      notes: 'Total Cholesterol: 185 mg/dL (Desirable), Triglycerides: 140 mg/dL, Fasting Blood Glucose: 92 mg/dL.',
    },
  });

  await prisma.medicalReport.create({
    data: {
      patientId: createdPatients[1].id,
      doctorId: createdDoctors[1].id,
      title: 'Brain Magnetic Resonance Imaging (MRI without Contrast)',
      reportType: 'MRI Scan',
      fileUrl: 'https://storage.hospitalcare.org/reports/brain_mri_maria_rodriguez.pdf',
      notes: 'Normal brain parenchyma with no acute infarction, intracranial hemorrhage, or space-occupying lesion.',
    },
  });

  await prisma.medicalReport.create({
    data: {
      patientId: createdPatients[2].id,
      doctorId: createdDoctors[2].id,
      title: 'Digital Posteroanterior Chest X-Ray',
      reportType: 'X-Ray',
      fileUrl: 'https://storage.hospitalcare.org/reports/chest_xray_liam_johnson.pdf',
      notes: 'Clear bilateral lung fields. Cardiothoracic silhouette within normal physiological limits.',
    },
  });

  // ----------------------------------------------------
  // 10. Seed Bills (Table: Bill)
  // ----------------------------------------------------
  console.log('💳 Seeding Bills...');
  // Bill 1: Paid consultation & ECG bill for John
  const bill1 = await prisma.bill.create({
    data: {
      patientId: createdPatients[0].id,
      appointmentId: apptCompleted.id,
      totalAmount: 225.0,
      discount: 0.0,
      paidAmount: 225.0,
      status: PaymentStatus.PAID,
      items: [
        { title: 'Specialist Cardiology Consultation (Dr. Chen)', cost: 150.0, quantity: 1 },
        { title: '12-Lead Diagnostic ECG Examination', cost: 75.0, quantity: 1 },
      ],
    },
  });

  // Bill 2: Unpaid bill for upcoming visit
  const bill2 = await prisma.bill.create({
    data: {
      patientId: createdPatients[1].id,
      appointmentId: apptConfirmed1.id,
      totalAmount: 160.0,
      discount: 10.0,
      paidAmount: 0.0,
      status: PaymentStatus.UNPAID,
      items: [
        { title: 'Neurology Consultation (Dr. Patel)', cost: 160.0, quantity: 1 },
      ],
    },
  });

  // ----------------------------------------------------
  // 11. Seed Payments (Table: Payment)
  // ----------------------------------------------------
  console.log('💵 Seeding Payments...');
  await prisma.payment.create({
    data: {
      billId: bill1.id,
      amount: 225.0,
      method: PaymentMethod.CARD,
      transactionRef: 'TXN-CARD-9920148',
    },
  });

  // ----------------------------------------------------
  // 12. Seed Notifications (Table: Notification)
  // ----------------------------------------------------
  console.log('🔔 Seeding Notifications...');
  await prisma.notification.create({
    data: {
      userId: createdPatients[0].userId,
      title: 'Consultation Completed & Prescription Issued',
      message: 'Dr. Robert Chen has finalized your consultation and issued your digital prescription.',
      isRead: false,
    },
  });

  await prisma.notification.create({
    data: {
      userId: createdPatients[1].userId,
      title: 'Appointment Confirmed',
      message: `Your appointment with Dr. Aisha Patel is confirmed for ${futureDate1.toISOString().split('T')[0]} at 11:30 AM.`,
      isRead: true,
    },
  });

  await prisma.notification.create({
    data: {
      userId: createdPatients[2].userId,
      title: 'Lab Report Attached to Medical Profile',
      message: 'Your Chest X-Ray diagnostic summary has been uploaded to your EHR profile.',
      isRead: false,
    },
  });

  // ----------------------------------------------------
  // 13. Seed Audit Logs (Table: AuditLog)
  // ----------------------------------------------------
  console.log('📝 Seeding Audit Logs...');
  await prisma.auditLog.createMany({
    data: [
      {
        userId: adminUser.id,
        action: 'SYSTEM_INITIALIZED',
        details: 'HospitalCare Management System baseline schema and clinical divisions initialized.',
        ipAddress: '127.0.0.1',
      },
      {
        userId: receptionistUser.id,
        action: 'PATIENT_REGISTERED',
        details: 'New patient intake completed for Johnathan Doe.',
        ipAddress: '192.168.1.10',
      },
      {
        userId: createdPatients[0].userId,
        action: 'APPOINTMENT_BOOKED',
        details: 'Appointment booked with Dr. Robert Chen (Cardiology) for 10:00 AM.',
        ipAddress: '192.168.1.45',
      },
      {
        userId: createdDoctors[0].userId,
        action: 'PRESCRIPTION_ISSUED',
        details: 'Prescription recorded for Johnathan Doe (Diagnosis: Stage 1 Primary Hypertension).',
        ipAddress: '192.168.1.22',
      },
      {
        userId: receptionistUser.id,
        action: 'PAYMENT_RECEIVED',
        details: 'Payment of $225.00 settled via CARD for Bill #' + bill1.id,
        ipAddress: '192.168.1.10',
      },
    ],
  });

  console.log('\n===========================================================');
  console.log('✅ ALL DATABASE TABLES SUCCESSFULLY POPULATED WITH SAMPLE DATA!');
  console.log('===========================================================');
  console.log('📋 Summary of Populated Tables:');
  console.log('   • Users:          5 records (1 Admin, 1 Receptionist, 3 Doctors, 3 Patients)');
  console.log('   • Departments:    5 clinical divisions');
  console.log('   • Doctors:        3 specialist physicians');
  console.log('   • DoctorSchedule: 10 weekly working shift slots');
  console.log('   • Patients:       3 electronic medical profiles');
  console.log('   • Appointments:   4 appointments (Completed, Confirmed, Cancelled)');
  console.log('   • Prescriptions:  1 digital prescription with itemized medications');
  console.log('   • MedicalReports: 4 diagnostic lab reports (ECG, CMP, MRI, X-Ray)');
  console.log('   • Bills:          2 bills (Paid & Unpaid itemized billing)');
  console.log('   • Payments:       1 card transaction settlement record');
  console.log('   • Notifications:  3 user alerts');
  console.log('   • AuditLogs:      5 system event logs');
  console.log('===========================================================\n');
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
