import { prisma } from '../src/lib/prisma';
import { AppointmentStatus, Role } from '@prisma/client';

async function runConcurrencyTestSuite() {
  console.log('🧪 =================================================================');
  console.log('🧪 Starting Team 2 Verification & Concurrency Stress Test Suite');
  console.log('🧪 =================================================================\n');

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

  // Ensure test doctor and department exist
  let testDept = await prisma.department.findFirst();
  if (!testDept) {
    testDept = await prisma.department.create({
      data: { name: 'Test Cardiology', description: 'Testing division' },
    });
  }

  let testDoctorUser = await prisma.user.findUnique({ where: { email: 'test.doc@hospital.com' } });
  if (!testDoctorUser) {
    testDoctorUser = await prisma.user.create({
      data: {
        name: 'Dr. Test Concurrency',
        email: 'test.doc@hospital.com',
        passwordHash: 'dummy_hash',
        role: Role.DOCTOR,
      },
    });
  }

  let testDoctor = await prisma.doctor.findUnique({ where: { userId: testDoctorUser.id } });
  if (!testDoctor) {
    testDoctor = await prisma.doctor.create({
      data: {
        userId: testDoctorUser.id,
        departmentId: testDept.id,
        specialization: 'Concurrency Testing',
        qualification: 'PhD in Concurrency',
        consultationFee: 150.0,
      },
    });
  }

  // Create 10 test patient records for concurrent simulation
  const testPatients: any[] = [];
  for (let i = 1; i <= 10; i++) {
    const email = `patient_concurrent_${i}@hospital.com`;
    let user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      user = await prisma.user.create({
        data: {
          name: `Concurrent Patient ${i}`,
          email,
          passwordHash: 'dummy_hash',
          role: Role.PATIENT,
        },
      });
    }

    let patient = await prisma.patient.findUnique({ where: { userId: user.id } });
    if (!patient) {
      patient = await prisma.patient.create({
        data: {
          userId: user.id,
          dateOfBirth: new Date('1990-01-01'),
          gender: 'Male',
          bloodGroup: 'O+',
        },
      });
    }
    testPatients.push(patient);
  }

  const targetDate = new Date(Date.UTC(2027, 5, 15, 0, 0, 0));
  const targetSlot = '10:30';

  // Clean any previous test appointments on targetDate
  await prisma.prescription.deleteMany({
    where: { appointment: { doctorId: testDoctor.id, appointmentDate: targetDate } },
  });
  await prisma.appointment.deleteMany({
    where: { doctorId: testDoctor.id, appointmentDate: targetDate },
  });

  // --- Test 1: Concurrency Race Condition Test (10 Simultaneous Requests) ---
  console.log('1. Concurrency Simulation: 10 Simultaneous Bookings for the SAME Slot');
  console.log(`   Doctor: ${testDoctor.id} | Date: 2027-06-15 | Slot: ${targetSlot}\n`);

  async function bookSlotConcurrently(patientId: string, clientId: number) {
    try {
      return await prisma.$transaction(async (tx) => {
        // Pessimistic conflict check
        const existing = await tx.appointment.findFirst({
          where: {
            doctorId: testDoctor!.id,
            appointmentDate: targetDate,
            timeSlot: targetSlot,
            status: { not: AppointmentStatus.CANCELLED },
          },
        });

        if (existing) {
          throw new Error('CONCURRENCY_CONFLICT: Slot already reserved');
        }

        const appt = await tx.appointment.create({
          data: {
            patientId,
            doctorId: testDoctor!.id,
            appointmentDate: targetDate,
            timeSlot: targetSlot,
            status: AppointmentStatus.CONFIRMED,
            reason: `Concurrent client #${clientId}`,
          },
        });

        return { success: true, appt, clientId };
      });
    } catch (err: any) {
      return { success: false, error: err.message, clientId };
    }
  }

  // Fire 10 simultaneous booking requests using Promise.all
  const concurrentResults = await Promise.all(
    testPatients.map((p, idx) => bookSlotConcurrently(p.id, idx + 1))
  );

  const successfulBookings = concurrentResults.filter((r) => r.success);
  const conflictRejections = concurrentResults.filter((r) => !r.success);

  console.log(`   - Successful bookings: ${successfulBookings.length}`);
  console.log(`   - Rejected conflicts: ${conflictRejections.length}`);

  assert(
    successfulBookings.length === 1,
    `Zero Double-Booking: Exactly 1 request succeeded out of 10 (Winner: Client #${successfulBookings[0]?.clientId})`
  );
  assert(
    conflictRejections.length === 9,
    `Race Condition Rejection: Exactly 9 simultaneous requests failed with conflict error`
  );

  // Verify database count for that slot
  const dbCount = await prisma.appointment.count({
    where: {
      doctorId: testDoctor.id,
      appointmentDate: targetDate,
      timeSlot: targetSlot,
      status: { not: AppointmentStatus.CANCELLED },
    },
  });
  assert(dbCount === 1, 'Database Integrity: Exactly 1 appointment row exists in DB for this slot');

  // --- Test 2: Atomic Rescheduling ---
  console.log('\n2. Atomic Rescheduling & Slot Release');
  const winnerAppt = (successfulBookings[0] as any).appt;
  const newDate = new Date(Date.UTC(2027, 5, 16, 0, 0, 0));
  const newSlot = '14:00';

  const rescheduled = await prisma.$transaction(async (tx) => {
    return await tx.appointment.update({
      where: { id: winnerAppt.id },
      data: {
        appointmentDate: newDate,
        timeSlot: newSlot,
      },
    });
  });

  assert(
    rescheduled.timeSlot === newSlot,
    'Appointment successfully moved to new slot (14:00 on 2027-06-16)'
  );

  // Verify old slot is freed
  const oldSlotCheck = await prisma.appointment.findFirst({
    where: {
      doctorId: testDoctor.id,
      appointmentDate: targetDate,
      timeSlot: targetSlot,
      status: { not: AppointmentStatus.CANCELLED },
    },
  });
  assert(oldSlotCheck === null, 'Original slot (10:30 on 2027-06-15) is now completely freed and available');

  // --- Test 3: Prescription Creation & Consultation Completion ---
  console.log('\n3. Digital Prescription & Clinical Notes');
  const prescription = await prisma.$transaction(async (tx) => {
    const rx = await tx.prescription.create({
      data: {
        appointmentId: rescheduled.id,
        patientId: rescheduled.patientId,
        doctorId: testDoctor!.id,
        diagnosis: 'Test Acute Bronchitis',
        notes: 'Take rest and increase fluid intake.',
        medications: [
          { name: 'Amoxicillin 500mg', dosage: '1 Tab', frequency: 'Twice daily', duration: '5 days' },
        ],
      },
    });

    await tx.appointment.update({
      where: { id: rescheduled.id },
      data: { status: AppointmentStatus.COMPLETED },
    });

    return rx;
  });

  assert(prescription.diagnosis === 'Test Acute Bronchitis', 'Prescription created with structured medication array');

  const completedAppt = await prisma.appointment.findUnique({ where: { id: rescheduled.id } });
  assert(completedAppt?.status === AppointmentStatus.COMPLETED, 'Consultation marked as COMPLETED');

  // --- Test 4: Medical Report Attachment & History Timeline ---
  console.log('\n4. Diagnostic Lab Report Attachment');
  const report = await prisma.medicalReport.create({
    data: {
      patientId: rescheduled.patientId,
      doctorId: testDoctor.id,
      title: 'Chest X-Ray Digital Scan',
      reportType: 'X-Ray',
      fileUrl: 'https://storage.hospitalcare.org/reports/test-scan.pdf',
      notes: 'Lungs clear, normal cardiothoracic ratio.',
    },
  });

  assert(report.reportType === 'X-Ray', 'Diagnostic report attached to patient profile');

  // Cleanup test data
  console.log('\n🧹 Cleaning up test artifacts...');
  await prisma.prescription.deleteMany({ where: { appointmentId: rescheduled.id } });
  await prisma.medicalReport.deleteMany({ where: { id: report.id } });
  await prisma.appointment.deleteMany({ where: { id: rescheduled.id } });

  console.log('\n=================================================================');
  console.log(`🏁 Test Suite Summary: ${passed} Passed, ${failed} Failed`);
  console.log('=================================================================\n');

  if (failed > 0) process.exit(1);
}

runConcurrencyTestSuite()
  .catch((e) => {
    console.error('Fatal test error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
