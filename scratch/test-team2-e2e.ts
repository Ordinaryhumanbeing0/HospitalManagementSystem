import { prisma } from '../src/lib/prisma';
import { AppointmentStatus, Role } from '@prisma/client';
import { AppointmentModel, PrescriptionModel, MedicalReportModel } from '../src/lib/domain/models';
import { appointmentQueue, FifoQueue } from '../src/lib/queue/appointment-queue';

async function runTeam2TestSuite() {
  console.log('================================================================');
  console.log('🧪 TEAM 2 COMPREHENSIVE END-TO-END VERIFICATION & STRESS SUITE');
  console.log('================================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, testName: string, detail?: string) {
    if (condition) {
      console.log(`  ✅ PASS: ${testName}`);
      if (detail) console.log(`     ↳ ${detail}`);
      passed++;
    } else {
      console.error(`  ❌ FAIL: ${testName}`);
      if (detail) console.error(`     ↳ Error: ${detail}`);
      failed++;
    }
  }

  // ===========================================================================
  // SECTION 1: OOP Domain Models & FIFO Queue Data Structure
  // ===========================================================================
  console.log('--- SECTION 1: Data Structures (FIFO Queue) & OOP Domain Models ---');

  // 1.1 FIFO Queue Unit Test
  const rawQueue = new FifoQueue<string>();
  rawQueue.enqueue('First');
  rawQueue.enqueue('Second');
  rawQueue.enqueue('Third');
  assert(rawQueue.size() === 3, 'FIFO Queue size correctly tracks enqueued items');
  assert(rawQueue.peek() === 'First', 'FIFO Queue peek correctly returns front element without removal');
  assert(rawQueue.dequeue() === 'First', 'FIFO Queue dequeues First element first (FIFO ordering)');
  assert(rawQueue.dequeue() === 'Second', 'FIFO Queue dequeues Second element second');
  assert(rawQueue.dequeue() === 'Third', 'FIFO Queue dequeues Third element third');
  assert(rawQueue.isEmpty() === true, 'FIFO Queue is empty after all elements dequeued');

  // 1.2 OOP Domain Models Test
  const mockAppt = new AppointmentModel({
    id: 'appt_test_1',
    patientId: 'pat_test_1',
    doctorId: 'doc_test_1',
    appointmentDate: '2027-08-20T00:00:00.000Z',
    timeSlot: '14:30',
    status: AppointmentStatus.CONFIRMED,
    reason: 'Routine cardiac evaluation',
  });
  assert(mockAppt.getFormattedTime() === '02:30 PM', 'AppointmentModel converts 24h slot to 12h format', mockAppt.getFormattedTime());
  assert(mockAppt.isCancellable() === true, 'AppointmentModel validates cancellability for CONFIRMED status');
  assert(mockAppt.isConsultable() === true, 'AppointmentModel validates consultability for doctor');

  const mockRx = new PrescriptionModel({
    id: 'rx_test_1',
    appointmentId: 'appt_test_1',
    patientId: 'pat_test_1',
    doctorId: 'doc_test_1',
    diagnosis: 'Hypertension Stage 2',
    notes: 'Reduce sodium intake',
    medications: [
      { name: 'Amlodipine', dosage: '5mg', frequency: 'Once daily', duration: '30 days' },
      { name: 'Lisinopril', dosage: '10mg', frequency: 'Once daily', duration: '30 days' },
    ],
    createdAt: new Date(),
  });
  assert(mockRx.getMedicationCount() === 2, 'PrescriptionModel accurately counts prescribed items');
  assert(mockRx.getFormattedMedicationList().length === 2, 'PrescriptionModel formats medication instructions');

  const mockReport = new MedicalReportModel({
    id: 'rep_test_1',
    patientId: 'pat_test_1',
    doctorId: 'doc_test_1',
    title: 'Echocardiogram Diagnostic Scan',
    reportType: 'MRI / Diagnostic Imaging',
    fileUrl: 'https://storage.hospitalcare.org/reports/echo-test.pdf',
    notes: 'Normal ejection fraction',
    createdAt: new Date(),
  });
  assert(mockReport.isImagingReport() === true, 'MedicalReportModel correctly identifies diagnostic scan');

  // ===========================================================================
  // SECTION 2: Database Setup & Doctor Schedule Configuration
  // ===========================================================================
  console.log('\n--- SECTION 2: Doctor Schedule Management & Slot Generation ---');

  // Ensure department
  let dept = await prisma.department.findFirst({ where: { name: 'Cardiology' } });
  if (!dept) {
    dept = await prisma.department.create({
      data: { name: 'Cardiology', description: 'Comprehensive heart & cardiovascular care' },
    });
  }

  // Create test doctor user
  const docEmail = 'e2e.dr.chen@hospital.com';
  let docUser = await prisma.user.findUnique({ where: { email: docEmail } });
  if (!docUser) {
    docUser = await prisma.user.create({
      data: {
        name: 'Dr. Robert Chen (E2E)',
        email: docEmail,
        passwordHash: 'dummy_hash',
        role: Role.DOCTOR,
        phone: '+1 555-0200',
      },
    });
  }

  let testDoc = await prisma.doctor.findUnique({ where: { userId: docUser.id } });
  if (!testDoc) {
    testDoc = await prisma.doctor.create({
      data: {
        userId: docUser.id,
        departmentId: dept.id,
        specialization: 'Interventional Cardiology',
        qualification: 'MD, FACC',
        consultationFee: 175.0,
      },
    });
  }

  // Doctor configures working shift (e.g. Wednesday = day 3, 09:00 - 17:00, 30 min intervals)
  await prisma.doctorSchedule.deleteMany({ where: { doctorId: testDoc.id } });
  await prisma.doctorSchedule.create({
    data: {
      doctorId: testDoc.id,
      dayOfWeek: 3, // Wednesday
      startTime: '09:00',
      endTime: '17:00',
      slotDuration: 30,
      isActive: true,
    },
  });

  const schedules = await prisma.doctorSchedule.findMany({ where: { doctorId: testDoc.id } });
  assert(schedules.length === 1 && schedules[0].dayOfWeek === 3, 'Doctor schedule shift saved in database (Wednesday 09:00-17:00, 30m slots)');

  // Create 10 distinct patient accounts for testing
  const testPatients: any[] = [];
  for (let i = 1; i <= 10; i++) {
    const pEmail = `e2e_patient_${i}@hospital.com`;
    let pUser = await prisma.user.findUnique({ where: { email: pEmail } });
    if (!pUser) {
      pUser = await prisma.user.create({
        data: {
          name: `E2E Patient ${i}`,
          email: pEmail,
          passwordHash: 'dummy_hash',
          role: Role.PATIENT,
          phone: `+1 555-030${i}`,
        },
      });
    }

    let patient = await prisma.patient.findUnique({ where: { userId: pUser.id } });
    if (!patient) {
      patient = await prisma.patient.create({
        data: {
          userId: pUser.id,
          dateOfBirth: new Date('1988-04-12'),
          gender: i % 2 === 0 ? 'Female' : 'Male',
          bloodGroup: 'B+',
          emergencyContact: '+1 555-9999',
        },
      });
    }
    testPatients.push(patient);
  }
  assert(testPatients.length === 10, '10 test patient profiles verified in database');

  // ===========================================================================
  // SECTION 3: Concurrency Stress Test (10 Simultaneous Bookings for the SAME Slot)
  // ===========================================================================
  console.log('\n--- SECTION 3: Concurrency Stress Test (10 Simultaneous Bookings) ---');
  // Target slot: 2027-06-16 (Wednesday), 10:30
  const targetDate = new Date(Date.UTC(2027, 5, 16, 0, 0, 0));
  const targetSlot = '10:30';

  // Clean any old records
  await prisma.prescription.deleteMany({
    where: { appointment: { doctorId: testDoc.id, appointmentDate: targetDate } },
  });
  await prisma.appointment.deleteMany({
    where: { doctorId: testDoc.id, appointmentDate: targetDate },
  });

  // Function to simulate simultaneous booking using FIFO Queue + Interactive Transaction
  async function bookSlotConcurrent(patientId: string, clientNum: number) {
    try {
      return await appointmentQueue.enqueueTask(
        `${testDoc!.id}_2027-06-16_${targetSlot}`,
        async () => {
          return await prisma.$transaction(async (tx) => {
            const existing = await tx.appointment.findFirst({
              where: {
                doctorId: testDoc!.id,
                appointmentDate: targetDate,
                timeSlot: targetSlot,
                status: { not: AppointmentStatus.CANCELLED },
              },
            });

            if (existing) {
              throw new Error(`CONCURRENCY_CONFLICT: Slot ${targetSlot} is already reserved.`);
            }

            const appt = await tx.appointment.create({
              data: {
                patientId,
                doctorId: testDoc!.id,
                appointmentDate: targetDate,
                timeSlot: targetSlot,
                status: AppointmentStatus.CONFIRMED,
                reason: `Simultaneous applicant #${clientNum}`,
              },
            });

            return { success: true, appt, clientNum };
          });
        }
      );
    } catch (err: any) {
      return { success: false, error: err.message, clientNum };
    }
  }

  // Fire 10 simultaneous asynchronous requests using Promise.all
  console.log(`   Dispatching 10 simultaneous booking requests for: Dr. Chen, 2027-06-16, ${targetSlot}...`);
  const concurrentResults = await Promise.all(
    testPatients.map((p, idx) => bookSlotConcurrent(p.id, idx + 1))
  );

  const successfulBookings = concurrentResults.filter((r) => r.success);
  const rejectedBookings = concurrentResults.filter((r) => !r.success);

  assert(
    successfulBookings.length === 1,
    `Exactly 1 booking succeeded (Winner: Client #${successfulBookings[0]?.clientNum})`,
    `Successful: ${successfulBookings.length}`
  );
  assert(
    rejectedBookings.length === 9,
    `Exactly 9 simultaneous requests were safely rejected with conflict errors`,
    `Rejected: ${rejectedBookings.length}`
  );

  // Verify database count for that slot
  const dbCount = await prisma.appointment.count({
    where: {
      doctorId: testDoc.id,
      appointmentDate: targetDate,
      timeSlot: targetSlot,
      status: AppointmentStatus.CONFIRMED,
    },
  });
  assert(dbCount === 1, 'Database constraint integrity: Zero double-booking detected', `DB Count: ${dbCount}`);

  // Inspect queue stats
  const queueStats = appointmentQueue.getStats();
  assert(queueStats.totalProcessed >= 10, 'FIFO Queue processed all incoming concurrent tasks in order', JSON.stringify(queueStats));

  // ===========================================================================
  // SECTION 4: End-to-End Workflow: Consultation -> Prescription -> EHR Timeline
  // ===========================================================================
  console.log('\n--- SECTION 4: End-to-End Clinical Flow: Patient -> Doctor -> EHR ---');

  const winnerAppt = (successfulBookings[0] as any)?.appt;
  if (!winnerAppt) throw new Error('No winning appointment found in concurrency test');
  const winnerPatientId = winnerAppt.patientId;

  // 4.1 Doctor launches consultation and issues prescription
  const rxResult = await prisma.$transaction(async (tx) => {
    const rx = await tx.prescription.create({
      data: {
        appointmentId: winnerAppt.id,
        patientId: winnerPatientId,
        doctorId: testDoc!.id,
        diagnosis: 'Stage 1 Essential Hypertension',
        notes: 'Advised 30 min daily walking, low sodium dietary plan. Follow-up in 4 weeks.',
        medications: [
          { name: 'Telmisartan', dosage: '40mg', frequency: 'Once daily before breakfast', duration: '30 days' },
          { name: 'Aspirin', dosage: '75mg', frequency: 'Once daily after dinner', duration: '30 days' },
        ],
      },
    });

    // Mark consultation as COMPLETED
    await tx.appointment.update({
      where: { id: winnerAppt.id },
      data: { status: AppointmentStatus.COMPLETED },
    });

    return rx;
  });

  assert(rxResult.diagnosis === 'Stage 1 Essential Hypertension', 'Prescription created with clinical diagnosis and medication array');

  const updatedAppt = await prisma.appointment.findUnique({ where: { id: winnerAppt.id } });
  assert(updatedAppt?.status === AppointmentStatus.COMPLETED, 'Appointment status automatically transitioned to COMPLETED');

  // 4.2 Diagnostic Lab Report Upload
  const labReport = await prisma.medicalReport.create({
    data: {
      patientId: winnerPatientId,
      doctorId: testDoc.id,
      title: 'Lipid Panel & Fasting Glucose',
      reportType: 'Blood Test',
      fileUrl: 'https://storage.hospitalcare.org/reports/lipid-panel-fasting.pdf',
      notes: 'Cholesterol slightly elevated at 210 mg/dL.',
    },
  });
  assert(labReport.title === 'Lipid Panel & Fasting Glucose', 'Diagnostic lab report uploaded and linked to patient record');

  // 4.3 Patient fetches updated chronological Medical History Timeline
  const [patientAppts, patientRxs, patientReports] = await Promise.all([
    prisma.appointment.findMany({ where: { patientId: winnerPatientId } }),
    prisma.prescription.findMany({ where: { patientId: winnerPatientId } }),
    prisma.medicalReport.findMany({ where: { patientId: winnerPatientId } }),
  ]);

  const timelineEvents: any[] = [];
  patientRxs.forEach((r) => timelineEvents.push({ type: 'PRESCRIPTION', date: r.createdAt }));
  patientReports.forEach((rep) => timelineEvents.push({ type: 'LAB_REPORT', date: rep.createdAt }));
  patientAppts.forEach((a) => timelineEvents.push({ type: 'CONSULTATION', date: a.appointmentDate }));
  timelineEvents.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  assert(patientRxs.length >= 1, 'Patient EHR contains issued prescription');
  assert(patientReports.length >= 1, 'Patient EHR contains uploaded diagnostic lab report');
  assert(timelineEvents.length >= 3, 'Patient unified chronological timeline aggregates all events', `Total events: ${timelineEvents.length}`);

  // ===========================================================================
  // SECTION 5: Appointment Rescheduling & Cancellation
  // ===========================================================================
  console.log('\n--- SECTION 5: Rescheduling & Cancellation Workflow ---');

  // Create a separate appointment for patient 2 on slot 11:30
  const appt2 = await prisma.appointment.create({
    data: {
      patientId: testPatients[1].id,
      doctorId: testDoc.id,
      appointmentDate: targetDate,
      timeSlot: '11:30',
      status: AppointmentStatus.CONFIRMED,
      reason: 'Chest tightness evaluation',
    },
  });
  assert(appt2.status === AppointmentStatus.CONFIRMED, 'Second test appointment created for rescheduling & cancellation testing');

  // Reschedule appt2 to 14:00
  const rescheduled = await prisma.$transaction(async (tx) => {
    // Conflict check on 14:00
    const conflict = await tx.appointment.findFirst({
      where: {
        id: { not: appt2.id },
        doctorId: testDoc!.id,
        appointmentDate: targetDate,
        timeSlot: '14:00',
        status: { not: AppointmentStatus.CANCELLED },
      },
    });
    if (conflict) throw new Error('Slot occupied');

    return await tx.appointment.update({
      where: { id: appt2.id },
      data: { timeSlot: '14:00', reason: 'Rescheduled by patient' },
    });
  });
  assert(rescheduled.timeSlot === '14:00', 'Appointment successfully rescheduled to new valid time slot (14:00)');

  // Now Cancel appt2
  const cancelled = await prisma.appointment.update({
    where: { id: appt2.id },
    data: { status: AppointmentStatus.CANCELLED, reason: '[Cancelled]: Patient unable to attend' },
  });
  assert(cancelled.status === AppointmentStatus.CANCELLED, 'Appointment successfully cancelled and marked CANCELLED');

  // Verify that cancelled slot (14:00) is now free for another booking
  const freedSlotCheck = await prisma.appointment.findFirst({
    where: {
      doctorId: testDoc.id,
      appointmentDate: targetDate,
      timeSlot: '14:00',
      status: { not: AppointmentStatus.CANCELLED },
    },
  });
  assert(freedSlotCheck === null, 'Cancelled slot is immediately free and available for re-booking');

  console.log('\n================================================================');
  console.log(`📊 FINAL TEST RESULTS: ${passed} PASSED | ${failed} FAILED`);
  console.log('================================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runTeam2TestSuite()
  .catch((err) => {
    console.error('Fatal error during test run:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
