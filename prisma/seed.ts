// Comprehensive Database Seeder for Hospital Operations Platform
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
  console.log('🚀 Starting comprehensive database seed (Connected Hospital Operations Platform)...');

  // 1. Clear existing data in reverse order of foreign key dependencies
  console.log('🧹 Cleaning up old records...');
  await prisma.systemSetting.deleteMany();
  await prisma.auditLog.deleteMany();
  await prisma.notification.deleteMany();
  await prisma.payment.deleteMany();
  await prisma.bill.deleteMany();
  await prisma.medicalReport.deleteMany();
  await prisma.prescription.deleteMany();
  await prisma.appointment.deleteMany();
  await prisma.doctorLeave.deleteMany();
  await prisma.doctorSchedule.deleteMany();
  await prisma.patient.deleteMany();
  await prisma.doctor.deleteMany();
  await prisma.department.deleteMany();
  await prisma.user.deleteMany();

  // 2. Seed System Settings (Table: SystemSetting)
  console.log('⚙️ Seeding System Settings (INR Currency & Healthcare Defaults)...');
  await prisma.systemSetting.createMany({
    data: [
      {
        key: 'CURRENCY_CODE',
        value: 'INR',
        description: 'ISO-4217 Currency Code for Indian Rupee',
      },
      {
        key: 'CURRENCY_SYMBOL',
        value: '₹',
        description: 'Unicode Currency Symbol for Indian Rupee',
      },
      {
        key: 'CURRENCY_LOCALE',
        value: 'en-IN',
        description: 'Standard Indian number and currency formatting locale',
      },
      {
        key: 'DEFAULT_CONSULTATION_FEE',
        value: '800',
        description: 'Baseline outpatient general consultation fee in INR',
      },
      {
        key: 'DEFAULT_MEDICATION_PRICE',
        value: '250',
        description: 'Standard pharmacy medication unit price in INR',
      },
      {
        key: 'DEFAULT_LAB_SCAN_PRICE',
        value: '750',
        description: 'Baseline diagnostic pathology/scan unit price in INR',
      },
    ],
  });

  // 3. Hash standard passwords
  const adminPasswordHash = await bcrypt.hash('Admin@12345', 10);
  const doctorPasswordHash = await bcrypt.hash('Doctor@12345', 10);
  const staffPasswordHash = await bcrypt.hash('Staff@12345', 10);
  const patientPasswordHash = await bcrypt.hash('Patient@12345', 10);

  // 4. Seed Departments
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

  // 5. Seed Staff Users
  console.log('👤 Seeding Admin & Receptionist Users...');
  const adminUser = await prisma.user.create({
    data: {
      email: 'admin@hospital.com',
      name: 'Dr. Rajesh Sharma (Chief Medical Officer)',
      phone: '+91 98201 00001',
      passwordHash: adminPasswordHash,
      role: Role.ADMIN,
    },
  });

  const receptionistUser = await prisma.user.create({
    data: {
      email: 'reception@hospital.com',
      name: 'Priya Sharma (Front Desk Executive)',
      phone: '+91 98201 00002',
      passwordHash: staffPasswordHash,
      role: Role.RECEPTIONIST,
    },
  });

  // 6. Seed Doctors & Schedules & Leaves
  console.log('👨‍⚕️ Seeding Doctors, Schedules with Break Times, and Leaves...');
  const doctorsData = [
    {
      name: 'Dr. Vikram Malhotra',
      email: 'dr.malhotra@hospital.com',
      phone: '+91 98201 10001',
      department: 'Cardiology',
      specialization: 'Interventional Cardiology & Electrophysiology',
      qualification: 'MBBS, MD, DM (Cardiology), FACC',
      consultationFee: 1200.0,
      schedules: [
        { dayOfWeek: 0, startTime: '09:00', endTime: '16:00', breakStartTime: '13:00', breakEndTime: '14:00', slotDuration: 30 },
        { dayOfWeek: 1, startTime: '09:00', endTime: '16:00', breakStartTime: '13:00', breakEndTime: '14:00', slotDuration: 30 },
        { dayOfWeek: 2, startTime: '09:00', endTime: '16:00', breakStartTime: '13:00', breakEndTime: '14:00', slotDuration: 30 },
        { dayOfWeek: 3, startTime: '09:00', endTime: '16:00', breakStartTime: '13:00', breakEndTime: '14:00', slotDuration: 30 },
        { dayOfWeek: 4, startTime: '09:00', endTime: '16:00', breakStartTime: '13:00', breakEndTime: '14:00', slotDuration: 30 },
        { dayOfWeek: 5, startTime: '09:00', endTime: '14:00', breakStartTime: '12:00', breakEndTime: '12:30', slotDuration: 30 },
        { dayOfWeek: 6, startTime: '09:00', endTime: '13:00', slotDuration: 30 },
      ],
    },
    {
      name: 'Dr. Aisha Patel',
      email: 'dr.patel@hospital.com',
      phone: '+91 98201 10002',
      department: 'Neurology',
      specialization: 'Neurological Disorders & Stroke Care',
      qualification: 'MBBS, MD, DM (Neurology)',
      consultationFee: 1500.0,
      schedules: [
        { dayOfWeek: 1, startTime: '10:00', endTime: '17:00', breakStartTime: '13:00', breakEndTime: '14:00', slotDuration: 30 },
        { dayOfWeek: 2, startTime: '10:00', endTime: '17:00', breakStartTime: '13:00', breakEndTime: '14:00', slotDuration: 30 },
        { dayOfWeek: 3, startTime: '10:00', endTime: '17:00', breakStartTime: '13:00', breakEndTime: '14:00', slotDuration: 30 },
        { dayOfWeek: 4, startTime: '10:00', endTime: '17:00', breakStartTime: '13:00', breakEndTime: '14:00', slotDuration: 30 },
        { dayOfWeek: 5, startTime: '10:00', endTime: '15:00', slotDuration: 30 },
      ],
    },
    {
      name: 'Dr. Suresh Iyer',
      email: 'dr.iyer@hospital.com',
      phone: '+91 98201 10003',
      department: 'General Medicine',
      specialization: 'Internal Medicine & Preventative Care',
      qualification: 'MBBS, MD (General Medicine)',
      consultationFee: 800.0,
      schedules: [
        { dayOfWeek: 0, startTime: '08:00', endTime: '16:00', breakStartTime: '12:30', breakEndTime: '13:30', slotDuration: 30 },
        { dayOfWeek: 1, startTime: '08:00', endTime: '16:00', breakStartTime: '12:30', breakEndTime: '13:30', slotDuration: 30 },
        { dayOfWeek: 2, startTime: '08:00', endTime: '16:00', breakStartTime: '12:30', breakEndTime: '13:30', slotDuration: 30 },
        { dayOfWeek: 3, startTime: '08:00', endTime: '16:00', breakStartTime: '12:30', breakEndTime: '13:30', slotDuration: 30 },
        { dayOfWeek: 4, startTime: '08:00', endTime: '16:00', breakStartTime: '12:30', breakEndTime: '13:30', slotDuration: 30 },
        { dayOfWeek: 5, startTime: '08:00', endTime: '16:00', breakStartTime: '12:30', breakEndTime: '13:30', slotDuration: 30 },
        { dayOfWeek: 6, startTime: '08:00', endTime: '13:00', slotDuration: 30 },
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
        isActive: true,
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

  // Seed a Doctor Leave for Dr. Aisha Patel on a date 3 days from now
  const leaveStart = new Date();
  leaveStart.setDate(leaveStart.getDate() + 3);
  const leaveEnd = new Date(leaveStart);
  leaveEnd.setDate(leaveEnd.getDate() + 2);

  await prisma.doctorLeave.create({
    data: {
      doctorId: createdDoctors[1].id, // Dr. Aisha Patel
      startDate: leaveStart,
      endDate: leaveEnd,
      reason: 'Attending National Neurology Conference in Bengaluru',
    },
  });

  // 7. Seed Patients
  console.log('🧑‍🤝‍🧑 Seeding Indian Patients & Demographics...');
  const patientsData = [
    {
      name: 'Aarav Mehta',
      email: 'patient.aarav@example.com',
      phone: '+91 98201 20001',
      dateOfBirth: new Date('1988-04-12'),
      gender: 'Male',
      bloodGroup: 'O+',
      address: 'Flat 402, Shanti Niketan, Bandra West, Mumbai, MH 400050',
      emergencyContact: '+91 98201 90001 (Sunita Mehta - Spouse)',
      medicalHistorySummary: 'Hypertension managed on ACE inhibitors. Mild seasonal dust and pollen allergy.',
    },
    {
      name: 'Priyanka Verma',
      email: 'patient.priyanka@example.com',
      phone: '+91 98201 20002',
      dateOfBirth: new Date('1994-08-25'),
      gender: 'Female',
      bloodGroup: 'A+',
      address: '12/A, Koramangala 4th Block, Bengaluru, KA 560034',
      emergencyContact: '+91 98201 90002 (Rahul Verma - Brother)',
      medicalHistorySummary: 'No chronic illnesses. Prior appendectomy in 2018 with no complications.',
    },
    {
      name: 'Rohan Kapoor',
      email: 'patient.rohan@example.com',
      phone: '+91 98201 20003',
      dateOfBirth: new Date('2002-11-03'),
      gender: 'Male',
      bloodGroup: 'B-',
      address: 'B-104, Green Park Extension, New Delhi, DL 110016',
      emergencyContact: '+91 98201 90003 (Kavita Kapoor - Mother)',
      medicalHistorySummary: 'Mild persistent asthma managed with Salbutamol inhaler PRN. Penicillin allergy.',
    },
    {
      name: 'Ananya Sharma',
      email: 'patient.ananya@example.com',
      phone: '+91 98201 20004',
      dateOfBirth: new Date('1981-06-18'),
      gender: 'Female',
      bloodGroup: 'AB+',
      address: 'Plot 45, Jubilee Hills, Hyderabad, TS 500033',
      emergencyContact: '+91 98201 90004 (Deepak Sharma - Husband)',
      medicalHistorySummary: 'Type 2 Diabetes Mellitus under diet and Metformin control. Regular HbA1c monitoring.',
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

  // 8. Seed Appointments Across Every Lifecycle State
  console.log('📅 Seeding Connected Appointments...');
  const now = new Date();
  const today = new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0));

  const pastDate1 = new Date(today);
  pastDate1.setDate(pastDate1.getDate() - 3);

  const pastDate2 = new Date(today);
  pastDate2.setDate(pastDate2.getDate() - 1);

  const futureDate1 = new Date(today);
  futureDate1.setDate(futureDate1.getDate() + 1);

  // Appt 1: TODAY - CHECKED_IN (Waiting Room) - Aarav Mehta with Dr. Vikram Malhotra
  const apptCheckedIn = await prisma.appointment.create({
    data: {
      patientId: createdPatients[0].id,
      doctorId: createdDoctors[0].id,
      appointmentDate: today,
      timeSlot: '10:00',
      status: AppointmentStatus.CHECKED_IN,
      reason: 'Routine cardiovascular follow-up & resting pulse check.',
    },
  });

  // Appt 2: TODAY - IN_PROGRESS (Consultation Room) - Rohan Kapoor with Dr. Suresh Iyer
  const apptInProgress = await prisma.appointment.create({
    data: {
      patientId: createdPatients[2].id,
      doctorId: createdDoctors[2].id,
      appointmentDate: today,
      timeSlot: '11:00',
      status: AppointmentStatus.IN_PROGRESS,
      reason: 'Acute seasonal asthma flare-up and spirometry review.',
    },
  });

  // Appt 3: PAST (3 days ago) - COMPLETED with Prescription & Paid Bill - Aarav with Dr. Vikram
  const apptCompleted1 = await prisma.appointment.create({
    data: {
      patientId: createdPatients[0].id,
      doctorId: createdDoctors[0].id,
      appointmentDate: pastDate1,
      timeSlot: '10:00',
      status: AppointmentStatus.COMPLETED,
      reason: 'Hypertension evaluation and ECG reading.',
    },
  });

  // Appt 4: PAST (1 day ago) - COMPLETED with Prescription & Unpaid Bill - Priyanka with Dr. Suresh
  const apptCompleted2 = await prisma.appointment.create({
    data: {
      patientId: createdPatients[1].id,
      doctorId: createdDoctors[2].id,
      appointmentDate: pastDate2,
      timeSlot: '14:30',
      status: AppointmentStatus.COMPLETED,
      reason: 'Mild throat infection, cough, and fever evaluation.',
    },
  });

  // Appt 5: FUTURE (Tomorrow) - CONFIRMED Upcoming - Priyanka with Dr. Vikram
  const apptUpcoming = await prisma.appointment.create({
    data: {
      patientId: createdPatients[1].id,
      doctorId: createdDoctors[0].id,
      appointmentDate: futureDate1,
      timeSlot: '11:30',
      status: AppointmentStatus.CONFIRMED,
      reason: 'Preventative cardiac wellness screening.',
    },
  });

  // Appt 6: CONFLICTED APPOINTMENT (Falls on Dr. Aisha Patel's leave date!)
  const apptConflicted = await prisma.appointment.create({
    data: {
      patientId: createdPatients[2].id,
      doctorId: createdDoctors[1].id, // Dr. Aisha Patel
      appointmentDate: leaveStart,
      timeSlot: '11:00',
      status: AppointmentStatus.CONFIRMED,
      reason: 'Chronic migraine and headache reassessment (Scheduled during doctor leave).',
    },
  });

  // Appt 7: PAST - CANCELLED
  await prisma.appointment.create({
    data: {
      patientId: createdPatients[3].id,
      doctorId: createdDoctors[2].id,
      appointmentDate: pastDate2,
      timeSlot: '15:00',
      status: AppointmentStatus.CANCELLED,
      reason: '[Cancelled by Patient]: Urgent personal travel.',
    },
  });

  // Appt 8: PAST - NO_SHOW
  await prisma.appointment.create({
    data: {
      patientId: createdPatients[2].id,
      doctorId: createdDoctors[0].id,
      appointmentDate: pastDate1,
      timeSlot: '14:00',
      status: AppointmentStatus.NO_SHOW,
      reason: 'Patient failed to arrive at scheduled slot.',
    },
  });

  // 9. Seed Prescriptions tied to Completed Consultations
  console.log('💊 Seeding Digital Prescriptions with Symptoms & Follow-ups...');
  const followUp1 = new Date(pastDate1);
  followUp1.setMonth(followUp1.getMonth() + 3);

  await prisma.prescription.create({
    data: {
      appointmentId: apptCompleted1.id,
      patientId: createdPatients[0].id,
      doctorId: createdDoctors[0].id,
      diagnosis: 'Stage 1 Primary Hypertension & Mild Tachycardia',
      symptoms: 'Morning headaches, occasional dizziness, resting BP 142/90 mmHg',
      notes: 'Continue low sodium DASH diet. Exercise 30 minutes daily. Monitor blood pressure twice weekly.',
      followUpDate: followUp1,
      medications: [
        {
          name: 'Telmisartan 40mg',
          dosage: '1 Tablet',
          frequency: 'Once daily after breakfast',
          duration: '90 days',
          instructions: 'Take in the morning with plenty of water.',
        },
        {
          name: 'Metoprolol Succinate 25mg',
          dosage: '1 Tablet',
          frequency: 'Twice daily after meals',
          duration: '30 days',
          instructions: 'Check pulse regularly; do not abruptly stop.',
        },
      ],
    },
  });

  const followUp2 = new Date(pastDate2);
  followUp2.setDate(followUp2.getDate() + 7);

  await prisma.prescription.create({
    data: {
      appointmentId: apptCompleted2.id,
      patientId: createdPatients[1].id,
      doctorId: createdDoctors[2].id,
      diagnosis: 'Acute Upper Respiratory Tract Infection (URTI)',
      symptoms: 'Sore throat, dry cough, low-grade fever (99.8°F), nasal congestion',
      notes: 'Salt water gargling 3 times daily. Steam inhalation. Drink warm fluids.',
      followUpDate: followUp2,
      medications: [
        {
          name: 'Amoxicillin-Clavulanate 625mg',
          dosage: '1 Tablet',
          frequency: 'Twice daily after meals',
          duration: '5 days',
          instructions: 'Complete full course.',
        },
        {
          name: 'Paracetamol 650mg',
          dosage: '1 Tablet',
          frequency: 'SOS for fever or body ache',
          duration: '3 days',
          instructions: 'Max 3 tablets in 24 hours.',
        },
      ],
    },
  });

  // 10. Seed Medical Reports
  console.log('🔬 Seeding Diagnostic Lab & Imaging Reports...');
  await prisma.medicalReport.create({
    data: {
      patientId: createdPatients[0].id,
      doctorId: createdDoctors[0].id,
      title: 'Complete 12-Lead Electrocardiogram (ECG)',
      reportType: 'ECG / Cardiology',
      fileUrl: 'https://storage.hospitalcare.org/reports/ecg_scan_aarav_mehta_2026.pdf',
      notes: 'Normal sinus rhythm at 72 bpm. Normal PR interval and QRS duration. No acute ST changes.',
    },
  });

  await prisma.medicalReport.create({
    data: {
      patientId: createdPatients[0].id,
      doctorId: createdDoctors[0].id,
      title: 'Comprehensive Lipid & Metabolic Profile',
      reportType: 'Blood Test',
      fileUrl: 'https://storage.hospitalcare.org/reports/lipid_profile_aarav_mehta.pdf',
      notes: 'Total Cholesterol: 185 mg/dL, Triglycerides: 140 mg/dL, Fasting Blood Glucose: 92 mg/dL.',
    },
  });

  await prisma.medicalReport.create({
    data: {
      patientId: createdPatients[1].id,
      doctorId: createdDoctors[1].id,
      title: 'Brain Magnetic Resonance Imaging (MRI)',
      reportType: 'MRI Scan',
      fileUrl: 'https://storage.hospitalcare.org/reports/brain_mri_priyanka_verma.pdf',
      notes: 'Normal brain parenchyma with no acute infarction or lesion.',
    },
  });

  await prisma.medicalReport.create({
    data: {
      patientId: createdPatients[2].id,
      doctorId: createdDoctors[2].id,
      title: 'Digital Posteroanterior Chest X-Ray',
      reportType: 'X-Ray',
      fileUrl: 'https://storage.hospitalcare.org/reports/chest_xray_rohan_kapoor.pdf',
      notes: 'Clear bilateral lung fields. No focal consolidation or pleural effusion.',
    },
  });

  // 11. Seed Bills tied strictly to completed consultations
  console.log('💳 Seeding Connected Bills & Payments in INR...');
  // Bill 1: PAID bill for completed appointment 3 (Aarav Mehta - ₹2,000)
  const bill1 = await prisma.bill.create({
    data: {
      patientId: createdPatients[0].id,
      appointmentId: apptCompleted1.id,
      totalAmount: 2000.0,
      discount: 0.0,
      paidAmount: 2000.0,
      status: PaymentStatus.PAID,
      items: {
        items: [
          { title: 'Specialist Cardiology Consultation - Dr. Vikram Malhotra', category: 'CONSULTATION', cost: 1200.0, quantity: 1, total: 1200.0 },
          { title: '12-Lead Diagnostic ECG Examination', category: 'LAB_TEST', cost: 800.0, quantity: 1, total: 800.0 },
        ],
        subtotal: 2000.0,
        discount: 0,
        discountRate: 0,
        tax: 0,
        taxRate: 0,
        total: 2000.0,
      },
    },
  });

  await prisma.payment.create({
    data: {
      billId: bill1.id,
      amount: 2000.0,
      method: PaymentMethod.UPI,
      transactionRef: 'UPI-SETTLE-992014872',
      receivedAt: pastDate1,
    },
  });

  // Bill 2: UNPAID bill for completed appointment 4 (Priyanka Verma - ₹1,365)
  // Ready for patient to demonstrate live Pay Now!
  await prisma.bill.create({
    data: {
      patientId: createdPatients[1].id,
      appointmentId: apptCompleted2.id,
      totalAmount: 1365.0,
      discount: 0.0,
      paidAmount: 0.0,
      status: PaymentStatus.UNPAID,
      items: {
        items: [
          { title: 'General Medicine Consultation - Dr. Suresh Iyer', category: 'CONSULTATION', cost: 800.0, quantity: 1, total: 800.0 },
          { title: 'Pharmacy Rx: Amoxicillin-Clavulanate 625mg', category: 'MEDICATION', cost: 250.0, quantity: 1, total: 250.0 },
          { title: 'Pharmacy Rx: Paracetamol 650mg', category: 'MEDICATION', cost: 250.0, quantity: 1, total: 250.0 },
        ],
        subtotal: 1300.0,
        discount: 0,
        discountRate: 0,
        tax: 65.0,
        taxRate: 5,
        total: 1365.0,
      },
    },
  });

  // 12. Seed Notifications
  console.log('🔔 Seeding Notifications...');
  await prisma.notification.create({
    data: {
      userId: createdPatients[0].userId,
      title: 'Appointment Ready (Checked-In)',
      message: 'You are checked in for today\'s 10:00 AM consultation with Dr. Vikram Malhotra.',
      isRead: false,
    },
  });

  await prisma.notification.create({
    data: {
      userId: createdPatients[1].userId,
      title: 'Invoice Ready for Settlement',
      message: 'An invoice of ₹1,365.00 has been generated for your recent consultation with Dr. Suresh Iyer.',
      isRead: false,
    },
  });

  await prisma.notification.create({
    data: {
      userId: createdDoctors[1].userId,
      title: 'Doctor Leave Approved & Flagged',
      message: 'Your leave has been scheduled. 1 appointment conflicts with this period and requires reassignment.',
      isRead: false,
    },
  });

  await prisma.notification.create({
    data: {
      userId: adminUser.id,
      title: 'Schedule Conflict Detected',
      message: 'Dr. Aisha Patel is on leave on upcoming dates with 1 conflicting patient booking requiring reassignment.',
      isRead: false,
    },
  });

  // 13. Seed Audit Logs
  console.log('📝 Seeding Audit Logs...');
  await prisma.auditLog.createMany({
    data: [
      {
        userId: adminUser.id,
        action: 'SYSTEM_INITIALIZED',
        details: 'Connected Hospital Management Platform baseline initialized with Indian localization and INR currency.',
        ipAddress: '127.0.0.1',
      },
      {
        userId: createdPatients[0].userId,
        action: 'PATIENT_CHECKED_IN',
        details: 'Patient Aarav Mehta checked in for consultation with Dr. Vikram Malhotra.',
        ipAddress: '192.168.1.45',
      },
      {
        userId: createdDoctors[2].userId,
        action: 'CONSULTATION_STARTED',
        details: 'Dr. Suresh Iyer called patient Rohan Kapoor into consultation room.',
        ipAddress: '192.168.1.22',
      },
      {
        userId: createdDoctors[0].userId,
        action: 'CONSULTATION_COMPLETED',
        details: 'Consultation completed for Aarav Mehta by Dr. Vikram Malhotra. Bill #1 generated.',
        ipAddress: '192.168.1.21',
      },
      {
        userId: createdPatients[0].userId,
        action: 'PAYMENT_RECEIVED',
        details: 'Payment of ₹2,000.00 settled via UPI for Bill #' + bill1.id,
        ipAddress: '192.168.1.45',
      },
      {
        userId: adminUser.id,
        action: 'DOCTOR_LEAVE_SCHEDULED',
        details: 'Leave scheduled for Dr. Aisha Patel. 1 appointment flagged for reassignment.',
        ipAddress: '192.168.1.10',
      },
    ],
  });

  console.log('\n===========================================================');
  console.log('✅ DATABASE SUCCESSFULLY SEEDED WITH CONNECTED REALISTIC DATA!');
  console.log('===========================================================');
  console.log('📋 Seed Highlights:');
  console.log('   • Patients:       4 registered patients (Mumbai, Bengaluru, Delhi, Hyderabad)');
  console.log('   • Doctors:        3 specialists (Cardiology, Neurology, General Medicine)');
  console.log('   • Doctor Leave:   1 active leave for Dr. Aisha Patel with conflict detection');
  console.log('   • Appointments:   8 appointments across ALL statuses (Checked-In, In-Progress, Completed, Confirmed, Cancelled, No-Show)');
  console.log('   • Prescriptions:  2 digital EHR prescriptions with symptoms & follow-up dates');
  console.log('   • Bills & Pay:    1 Paid bill (₹2,000 via UPI) + 1 Unpaid bill (₹1,365 ready to test Pay Now)');
  console.log('   • Notifications:  4 real-time alerts across patient, doctor, and admin');
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
