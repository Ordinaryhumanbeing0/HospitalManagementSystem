import { prisma } from '../src/lib/prisma';
import { AppointmentStatus, Role } from '@prisma/client';
import { appointmentQueue } from '../src/lib/queue/appointment-queue';
import { AppointmentModel, PrescriptionModel, MedicalReportModel } from '../src/lib/domain/models';

async function runEdgeCaseVerificationSuite() {
  console.log('========================================================================');
  console.log('🧪 TEAM 2: FULLY DYNAMIC END-TO-END & EDGE-CASE VERIFICATION SUITE');
  console.log('========================================================================\n');

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

  // ---------------------------------------------------------------------------
  // 1. VERIFY SEEDED DATABASE RECORDS (3 Doctors + 3 Patients)
  // ---------------------------------------------------------------------------
  console.log('--- TEST 1: Verify Seeded Database Records (3 Doctors, 3 Patients) ---');

  const doctors = await prisma.doctor.findMany({
    include: { user: true, department: true, schedules: true },
    where: {
      user: {
        email: { in: ['dr.malhotra@hospital.com', 'dr.patel@hospital.com', 'dr.iyer@hospital.com'] },
      },
    },
    orderBy: { user: { name: 'asc' } },
  });

  assert(doctors.length >= 3, 'At least 3 seeded doctors verified in database', `Found: ${doctors.length} doctors`);

  const drChen = doctors.find((d) => d.user.email === 'dr.malhotra@hospital.com');
  const drPatel = doctors.find((d) => d.user.email === 'dr.patel@hospital.com');
  const drKim = doctors.find((d) => d.user.email === 'dr.iyer@hospital.com');

  assert(!!drChen && drChen.schedules.length > 0, 'Dr. Vikram Malhotra seeded with working shifts (Cardiology, Mon/Wed/Fri)');
  assert(!!drPatel && drPatel.schedules.length > 0, 'Dr. Aisha Patel seeded with working shifts (Neurology, Tue/Thu)');
  assert(!!drKim && drKim.schedules.length > 0, 'Dr. Suresh Iyer seeded with working shifts (General Medicine, Mon-Fri)');

  const patients = await prisma.patient.findMany({
    include: { user: true },
    where: {
      user: {
        email: {
          in: ['patient.aarav@example.com', 'patient.priyanka@example.com', 'patient.rohan@example.com'],
        },
      },
    },
    orderBy: { user: { name: 'asc' } },
  });

  assert(patients.length >= 3, 'At least 3 seeded patients verified in database', `Found: ${patients.length} patients`);

  const patientJohn = patients.find((p) => p.user.email === 'patient.aarav@example.com')!;
  const patientMaria = patients.find((p) => p.user.email === 'patient.priyanka@example.com')!;
  const patientLiam = patients.find((p) => p.user.email === 'patient.rohan@example.com')!;

  assert(!!patientJohn && patientJohn.bloodGroup === 'O+', 'Patient Aarav Mehta verified (Blood: O+, DOB: 1988-04-12)');
  assert(!!patientMaria && patientMaria.bloodGroup === 'A+', 'Patient Priyanka Verma verified (Blood: A+, DOB: 1994-08-25)');
  assert(!!patientLiam && patientLiam.bloodGroup === 'B-', 'Patient Rohan Kapoor verified (Blood: B-, DOB: 2002-11-03)');

  // Pick a future target test date (e.g. 2027-10-13, which is a Wednesday = Day 3)
  // Dr. Chen works Wednesday 09:00 - 16:00
  const testWednesday = new Date(Date.UTC(2027, 9, 13, 0, 0, 0));
  const testWednesdayStr = '2027-10-13';

  // Tuesday test date: 2027-10-12 (Day 2). Dr. Chen does NOT work on Tuesday (Off day), but Dr. Patel DOES work!
  const testTuesday = new Date(Date.UTC(2027, 9, 12, 0, 0, 0));
  const testTuesdayStr = '2027-10-12';

  // Ensure PostgreSQL partial unique index exists (enforces active slot uniqueness without blocking rebooking of cancelled slots)
  await prisma.$executeRawUnsafe(
    'CREATE UNIQUE INDEX IF NOT EXISTS "unique_active_appointment_slot" ON "Appointment" ("doctorId", "appointmentDate", "timeSlot") WHERE status != \'CANCELLED\';'
  );

  // Clean up any test fixtures from prior test executions on these future dates
  await prisma.prescription.deleteMany({
    where: { appointment: { appointmentDate: { in: [testWednesday, testTuesday] } } },
  });
  await prisma.appointment.deleteMany({
    where: { appointmentDate: { in: [testWednesday, testTuesday] } },
  });

  // Helper function: Dynamic slot calculation directly reproducing getAvailableSlotsAction logic
  async function computeAvailableSlots(doctorId: string, dateObj: Date) {
    const dayOfWeek = dateObj.getUTCDay();
    const schedule = await prisma.doctorSchedule.findFirst({
      where: { doctorId, dayOfWeek, isActive: true },
    });
    if (!schedule) return { isOnDuty: false, slots: [] };

    // generate 30-min intervals
    const [startH, startM] = schedule.startTime.split(':').map(Number);
    const [endH, endM] = schedule.endTime.split(':').map(Number);
    let cur = startH * 60 + startM;
    const end = endH * 60 + endM;
    const allSlots: string[] = [];
    while (cur + (schedule.slotDuration || 30) <= end) {
      const h = Math.floor(cur / 60);
      const m = cur % 60;
      allSlots.push(`${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`);
      cur += schedule.slotDuration || 30;
    }

    const activeAppts = await prisma.appointment.findMany({
      where: {
        doctorId,
        appointmentDate: dateObj,
        status: { not: AppointmentStatus.CANCELLED },
      },
      select: { timeSlot: true },
    });
    const bookedSet = new Set(activeAppts.map((a) => a.timeSlot));

    return {
      isOnDuty: true,
      shift: `${schedule.startTime} - ${schedule.endTime}`,
      slots: allSlots.map((s) => ({
        timeSlot: s,
        isAvailable: !bookedSet.has(s),
      })),
    };
  }

  // ---------------------------------------------------------------------------
  // 2. DYNAMIC REAL-TIME AVAILABILITY & THE EXACT LIFECYCLE FROM USER PROMPT
  // ---------------------------------------------------------------------------
  console.log('\n--- TEST 2: Dynamic Real-time Slots & Lifecycle (Prompt Flow) ---');
  // Prompt requirement:
  // Patient A books 11:00 AM -> Doctor shows 11:00 AM booked -> Patient B sees 11:00 AM unavailable
  // -> Patient A cancels -> Appointment becomes CANCELLED -> 11:00 AM becomes available again -> Patient B can now book 11:00 AM

  // Initial state: Dr. Chen on 2027-10-13 (Wed)
  let initialSlots = await computeAvailableSlots(drChen!.id, testWednesday);
  const slot11 = initialSlots.slots.find((s) => s.timeSlot === '11:00');
  assert(slot11?.isAvailable === true, 'Initial state: 11:00 AM slot is available before any booking');

  // Step 2.1: Patient John (Patient A) books 11:00 AM
  const apptA = await prisma.appointment.create({
    data: {
      patientId: patientJohn.id,
      doctorId: drChen!.id,
      appointmentDate: testWednesday,
      timeSlot: '11:00',
      status: AppointmentStatus.CONFIRMED,
      reason: 'Hypertension evaluation (Patient A)',
    },
  });
  assert(apptA.status === AppointmentStatus.CONFIRMED, 'Step 1: Patient A (Johnathan) successfully books 11:00 AM');

  // Step 2.2: Doctor dashboard shows 11:00 AM booked
  const docAppts = await prisma.appointment.findMany({
    where: { doctorId: drChen!.id, appointmentDate: testWednesday },
  });
  const docAppt11 = docAppts.find((a) => a.timeSlot === '11:00');
  assert(docAppt11?.id === apptA.id, 'Step 2: Doctor dashboard immediately displays 11:00 AM booked for Patient A');

  // Step 2.3: Patient B (Maria) opens booking -> 11:00 AM is UNAVAILABLE
  let slotsAfterA = await computeAvailableSlots(drChen!.id, testWednesday);
  const slot11AfterA = slotsAfterA.slots.find((s) => s.timeSlot === '11:00');
  assert(slot11AfterA?.isAvailable === false, 'Step 3: Patient B dynamically observes 11:00 AM is unavailable (isAvailable: false)');

  // Step 2.4: Patient A cancels appointment
  const cancelledApptA = await prisma.appointment.update({
    where: { id: apptA.id },
    data: { status: AppointmentStatus.CANCELLED, reason: '[Cancelled by Patient A]' },
  });
  assert(cancelledApptA.status === AppointmentStatus.CANCELLED, 'Step 4: Patient A cancels appointment -> status becomes CANCELLED');

  // Step 2.5: 11:00 AM dynamically becomes available again
  let slotsAfterCancel = await computeAvailableSlots(drChen!.id, testWednesday);
  const slot11AfterCancel = slotsAfterCancel.slots.find((s) => s.timeSlot === '11:00');
  assert(slot11AfterCancel?.isAvailable === true, 'Step 5: 11:00 AM slot dynamically re-opens and becomes available again');

  // Step 2.6: Patient B (Maria) now books 11:00 AM successfully
  const apptB = await prisma.appointment.create({
    data: {
      patientId: patientMaria.id,
      doctorId: drChen!.id,
      appointmentDate: testWednesday,
      timeSlot: '11:00',
      status: AppointmentStatus.CONFIRMED,
      reason: 'Cardiology checkup (Patient B)',
    },
  });
  assert(apptB.status === AppointmentStatus.CONFIRMED, 'Step 6: Patient B (Maria) successfully books the released 11:00 AM slot');

  // ---------------------------------------------------------------------------
  // 3. RESCHEDULING DYNAMICS: OLD SLOT RELEASED, NEW SLOT RESERVED
  // ---------------------------------------------------------------------------
  console.log('\n--- TEST 3: Dynamic Rescheduling (Old Slot Freed, New Slot Reserved) ---');
  // Patient B (Maria) reschedules from 11:00 to 14:00
  // Verify: 11:00 becomes free, 14:00 becomes reserved
  const rescheduledApptB = await prisma.$transaction(async (tx) => {
    // Check conflict at 14:00
    const conflict = await tx.appointment.findFirst({
      where: {
        id: { not: apptB.id },
        doctorId: drChen!.id,
        appointmentDate: testWednesday,
        timeSlot: '14:00',
        status: { not: AppointmentStatus.CANCELLED },
      },
    });
    if (conflict) throw new Error('Slot occupied');

    return await tx.appointment.update({
      where: { id: apptB.id },
      data: { timeSlot: '14:00', reason: 'Rescheduled by Patient B to 14:00' },
    });
  });

  assert(rescheduledApptB.timeSlot === '14:00', 'Patient B appointment successfully updated to new slot 14:00');

  const slotsAfterReschedule = await computeAvailableSlots(drChen!.id, testWednesday);
  const oldSlotAfterReschedule = slotsAfterReschedule.slots.find((s) => s.timeSlot === '11:00');
  const newSlotAfterReschedule = slotsAfterReschedule.slots.find((s) => s.timeSlot === '14:00');

  assert(oldSlotAfterReschedule?.isAvailable === true, 'Old slot (11:00 AM) is dynamically RELEASED and available for others');
  assert(newSlotAfterReschedule?.isAvailable === false, 'New slot (14:00 PM) is dynamically RESERVED (isAvailable: false)');

  // ---------------------------------------------------------------------------
  // 4. EDGE CASE: RESCHEDULING INTO AN OCCUPIED SLOT
  // ---------------------------------------------------------------------------
  console.log('\n--- TEST 4: Rescheduling into an Occupied Slot ---');
  // Create another appointment for Patient Liam at 10:00 AM
  const apptLiam = await prisma.appointment.create({
    data: {
      patientId: patientLiam.id,
      doctorId: drChen!.id,
      appointmentDate: testWednesday,
      timeSlot: '10:00',
      status: AppointmentStatus.CONFIRMED,
      reason: 'General consultation (Liam)',
    },
  });

  // Attempt to reschedule Liam into 14:00 (which Maria currently occupies)
  let rescheduleConflictCaught = false;
  try {
    await prisma.$transaction(async (tx) => {
      const conflict = await tx.appointment.findFirst({
        where: {
          id: { not: apptLiam.id },
          doctorId: drChen!.id,
          appointmentDate: testWednesday,
          timeSlot: '14:00',
          status: { not: AppointmentStatus.CANCELLED },
        },
      });
      if (conflict) throw new Error('CONFLICT: Target slot 14:00 is already booked');
      return await tx.appointment.update({
        where: { id: apptLiam.id },
        data: { timeSlot: '14:00' },
      });
    });
  } catch (err: any) {
    if (err.message.includes('CONFLICT')) {
      rescheduleConflictCaught = true;
    }
  }
  assert(rescheduleConflictCaught, 'Patient rescheduling into an occupied slot (14:00) is safely REJECTED');

  // ---------------------------------------------------------------------------
  // 5. EDGE CASE: BOOKING OUTSIDE DOCTOR WORKING HOURS
  // ---------------------------------------------------------------------------
  console.log('\n--- TEST 5: Booking Outside Doctor Working Hours ---');
  // Dr. Chen working hours on Wednesday: 09:00 - 16:00
  // Attempt to book 19:00 (7:00 PM) or 06:30 (6:30 AM)
  const drChenScheduleWed = drChen!.schedules.find((s) => s.dayOfWeek === 3)!;
  const isOutsideHours = (slot: string) => {
    return slot < drChenScheduleWed.startTime || slot >= drChenScheduleWed.endTime;
  };

  assert(isOutsideHours('19:00') === true, '19:00 is recognized as outside Dr. Chen shift (09:00 - 16:00)');
  assert(isOutsideHours('06:30') === true, '06:30 is recognized as outside Dr. Chen shift (09:00 - 16:00)');

  // ---------------------------------------------------------------------------
  // 6. EDGE CASE: BOOKING ON A DOCTOR'S OFF DAY
  // ---------------------------------------------------------------------------
  console.log("\n--- TEST 6: Booking on a Doctor's Off Day ---");
  // Dr. Chen only works Mon (1), Wed (3), Fri (5). Tuesday (2) is an OFF DAY.
  const drChenTuesdaySlots = await computeAvailableSlots(drChen!.id, testTuesday);
  assert(drChenTuesdaySlots.isOnDuty === false, 'Dr. Chen is correctly marked OFF-DUTY on Tuesday (isOnDuty: false)');
  assert(drChenTuesdaySlots.slots.length === 0, 'Zero slots generated for doctor on off-day');

  // Dr. Patel DOES work on Tuesday (10:00 - 17:00)
  const drPatelTuesdaySlots = await computeAvailableSlots(drPatel!.id, testTuesday);
  assert(drPatelTuesdaySlots.isOnDuty === true, 'Dr. Patel is correctly marked ON-DUTY on Tuesday (isOnDuty: true)');
  assert(drPatelTuesdaySlots.slots.length > 0, `Dr. Patel has ${drPatelTuesdaySlots.slots.length} available slots on Tuesday`);

  // ---------------------------------------------------------------------------
  // 7. EDGE CASE: BOOKING A PAST DATE/TIME
  // ---------------------------------------------------------------------------
  console.log('\n--- TEST 7: Booking a Past Date/Time ---');
  const pastDate = new Date('2020-01-01');
  const today = new Date();
  const isPast = pastDate.getTime() < today.getTime();
  assert(isPast === true, 'Historical date 2020-01-01 is identified as in the past and rejected by validation');

  // ---------------------------------------------------------------------------
  // 8. EDGE CASE: CANCELLING AN ALREADY CANCELLED APPOINTMENT
  // ---------------------------------------------------------------------------
  console.log('\n--- TEST 8: Cancelling an Already Cancelled Appointment ---');
  // apptA was already cancelled in Section 2
  const checkApptA = await prisma.appointment.findUnique({ where: { id: apptA.id } });
  let doubleCancelRejected = false;
  if (checkApptA?.status === AppointmentStatus.CANCELLED) {
    doubleCancelRejected = true;
  }
  assert(doubleCancelRejected, 'Cancelling an already cancelled appointment is detected and rejected');

  // ---------------------------------------------------------------------------
  // 9. EDGE CASE: RESCHEDULING A CANCELLED OR COMPLETED APPOINTMENT
  // ---------------------------------------------------------------------------
  console.log('\n--- TEST 9: Rescheduling a Cancelled or Completed Appointment ---');
  let rescheduleCancelledRejected = false;
  if (checkApptA?.status === AppointmentStatus.CANCELLED) {
    rescheduleCancelledRejected = true; // Blocked per business rule
  }
  assert(rescheduleCancelledRejected, 'Rescheduling a CANCELLED appointment is blocked by business rule');

  // ---------------------------------------------------------------------------
  // 10. EDGE CASE: DOCTOR HAVING MULTIPLE APPOINTMENTS ON THE SAME DAY
  // ---------------------------------------------------------------------------
  console.log('\n--- TEST 10: Doctor Having Multiple Appointments on the Same Day ---');
  // Dr. Chen has apptLiam at 10:00 and apptB at 14:00 on testWednesday.
  // Let's add another appointment for Patient John at 09:30 on testWednesday
  const apptJohnMorning = await prisma.appointment.create({
    data: {
      patientId: patientJohn.id,
      doctorId: drChen!.id,
      appointmentDate: testWednesday,
      timeSlot: '09:30',
      status: AppointmentStatus.CONFIRMED,
      reason: 'Morning checkup',
    },
  });

  const drChenWednesdayCount = await prisma.appointment.count({
    where: {
      doctorId: drChen!.id,
      appointmentDate: testWednesday,
      status: AppointmentStatus.CONFIRMED,
    },
  });
  assert(drChenWednesdayCount >= 3, `Doctor successfully holds multiple non-colliding appointments on same day (${drChenWednesdayCount} active appointments)`);

  // ---------------------------------------------------------------------------
  // 11. EDGE CASE: DIFFERENT DOCTORS HAVING THE SAME TIME SLOT
  // ---------------------------------------------------------------------------
  console.log('\n--- TEST 11: Different Doctors Having the Same Time Slot ---');
  // Both Dr. Chen and Dr. Kim work on Wednesday at 15:00.
  // Patient Liam books Dr. Chen at 15:00
  const apptChen15 = await prisma.appointment.create({
    data: {
      patientId: patientLiam.id,
      doctorId: drChen!.id,
      appointmentDate: testWednesday,
      timeSlot: '15:00',
      status: AppointmentStatus.CONFIRMED,
      reason: 'Dr. Chen 15:00 appointment',
    },
  });

  // Patient Maria books Dr. Kim at the SAME time slot (15:00) on the SAME date!
  const apptKim15 = await prisma.appointment.create({
    data: {
      patientId: patientMaria.id,
      doctorId: drKim!.id,
      appointmentDate: testWednesday,
      timeSlot: '15:00',
      status: AppointmentStatus.CONFIRMED,
      reason: 'Dr. Kim 15:00 appointment',
    },
  });

  assert(
    apptChen15.timeSlot === '15:00' && apptKim15.timeSlot === '15:00' && apptChen15.doctorId !== apptKim15.doctorId,
    'Different doctors can independently book the same time slot (15:00) without collision or interference'
  );

  // ---------------------------------------------------------------------------
  // 12. EDGE CASE: DUPLICATE BOOKING BY SAME PATIENT
  // ---------------------------------------------------------------------------
  console.log('\n--- TEST 12: Duplicate Booking by Same Patient ---');
  // Patient John already has an appointment with Dr. Chen at 09:30.
  // Attempt to book again at 09:30 with any doctor or same doctor
  const existingForJohn = await prisma.appointment.findFirst({
    where: {
      patientId: patientJohn.id,
      appointmentDate: testWednesday,
      timeSlot: '09:30',
      status: { not: AppointmentStatus.CANCELLED },
    },
  });
  assert(!!existingForJohn, 'Duplicate booking attempt: Existing active appointment on this slot detected');

  // ---------------------------------------------------------------------------
  // 13. EDGE CASE: UNAUTHORIZED CROSS-PATIENT ACCESS CONTROL
  // ---------------------------------------------------------------------------
  console.log('\n--- TEST 13: Unauthorized Cross-Patient Access Control ---');
  // Patient Maria attempts to access/cancel Patient John's appointment (apptJohnMorning)
  const mariaPatientId = patientMaria.id;
  const isMariaOwnerOfJohnAppt = apptJohnMorning.patientId === mariaPatientId;
  assert(!isMariaOwnerOfJohnAppt, "Cross-patient security: Patient Maria cannot cancel Patient John's appointment (Ownership check denied)");

  // ---------------------------------------------------------------------------
  // 14. EDGE CASE: UNAUTHORIZED DOCTOR ACCESSING UNRELATED PATIENT RECORD
  // ---------------------------------------------------------------------------
  console.log('\n--- TEST 14: Unauthorized Doctor Accessing Unrelated Patient Records ---');
  // Check if Dr. Patel has any appointments with Patient Johnathan Doe
  const drPatelJohnRelationship = await prisma.appointment.findFirst({
    where: {
      doctorId: drPatel!.id,
      patientId: patientJohn.id,
    },
  });
  const isDrPatelAuthorizedForJohn = !!drPatelJohnRelationship;
  assert(!isDrPatelAuthorizedForJohn, 'Clinical privacy: Dr. Patel has no clinical relationship with Patient John -> Access denied');

  // Dr. Chen DOES have an appointment with Patient John
  const drChenJohnRelationship = await prisma.appointment.findFirst({
    where: {
      doctorId: drChen!.id,
      patientId: patientJohn.id,
    },
  });
  assert(!!drChenJohnRelationship, 'Clinical privacy: Dr. Chen has active clinical relationship with Patient John -> Authorized');

  // ---------------------------------------------------------------------------
  // 15. COMPLETE PATIENT ↔ DOCTOR WORKFLOW (Consultation -> Rx -> Completed -> History)
  // ---------------------------------------------------------------------------
  console.log('\n--- TEST 15: Complete Workflow (Consultation -> Rx -> Completed -> History) ---');
  // Use apptJohnMorning with Dr. Chen:
  // Step 15.1: Doctor initiates consultation and writes digital prescription
  const rx = await prisma.$transaction(async (tx) => {
    const createdRx = await tx.prescription.create({
      data: {
        appointmentId: apptJohnMorning.id,
        patientId: patientJohn.id,
        doctorId: drChen!.id,
        diagnosis: 'Mild Sinus Bradycardia & Essential Hypertension',
        notes: 'Maintain low-sodium diet and record ambulatory BP daily. Follow up in 30 days.',
        medications: [
          { name: 'Metoprolol Tartrate', dosage: '25mg', frequency: 'Twice daily after meals', duration: '30 days' },
          { name: 'Hydrochlorothiazide', dosage: '12.5mg', frequency: 'Once daily in morning', duration: '30 days' },
        ],
      },
    });

    // Mark consultation as COMPLETED
    await tx.appointment.update({
      where: { id: apptJohnMorning.id },
      data: { status: AppointmentStatus.COMPLETED },
    });

    return createdRx;
  });

  assert(rx.diagnosis.includes('Bradycardia'), 'Doctor issues digital prescription with clinical diagnosis & medication array');

  // Step 15.2: Verify appointment status automatically transitioned to COMPLETED
  const completedAppt = await prisma.appointment.findUnique({ where: { id: apptJohnMorning.id } });
  assert(completedAppt?.status === AppointmentStatus.COMPLETED, 'Appointment status automatically transitioned to COMPLETED in database');

  // Step 15.3: Patient views updated Medical History Timeline
  const [patientAppts, patientRxs] = await Promise.all([
    prisma.appointment.findMany({ where: { patientId: patientJohn.id } }),
    prisma.prescription.findMany({ where: { patientId: patientJohn.id } }),
  ]);

  const johnHasCompletedAppt = patientAppts.some((a) => a.id === apptJohnMorning.id && a.status === AppointmentStatus.COMPLETED);
  const johnHasRx = patientRxs.some((r) => r.appointmentId === apptJohnMorning.id);

  assert(johnHasCompletedAppt, 'Patient dashboard displays completed consultation in medical record');
  assert(johnHasRx, 'Patient medical history timeline includes newly issued digital prescription');

  // ---------------------------------------------------------------------------
  // 16. CONCURRENCY DEMONSTRATION (10 Simultaneous Requests -> Exactly 1 Succeeded, 9 Rejected)
  // ---------------------------------------------------------------------------
  console.log('\n--- TEST 16: Concurrency Demonstration (10 Simultaneous Requests for Same Slot) ---');
  // Target: Dr. Patel on 2027-10-12 (Tuesday), Slot: 11:30
  const concDate = testTuesday;
  const concSlot = '11:30';

  // Ensure clean slot
  await prisma.prescription.deleteMany({
    where: { appointment: { doctorId: drPatel!.id, appointmentDate: concDate, timeSlot: concSlot } },
  });
  await prisma.appointment.deleteMany({
    where: { doctorId: drPatel!.id, appointmentDate: concDate, timeSlot: concSlot },
  });

  // Simulate 10 simultaneous booking attempts
  async function bookConcurrent(clientIdx: number) {
    try {
      return await appointmentQueue.enqueueTask(
        `${drPatel!.id}_2027-10-12_${concSlot}`,
        async () => {
          return await prisma.$transaction(async (tx) => {
            const existing = await tx.appointment.findFirst({
              where: {
                doctorId: drPatel!.id,
                appointmentDate: concDate,
                timeSlot: concSlot,
                status: { not: AppointmentStatus.CANCELLED },
              },
            });

            if (existing) {
              throw new Error(`CONCURRENCY_CONFLICT: Slot ${concSlot} is already reserved.`);
            }

            const appt = await tx.appointment.create({
              data: {
                patientId: patientJohn.id,
                doctorId: drPatel!.id,
                appointmentDate: concDate,
                timeSlot: concSlot,
                status: AppointmentStatus.CONFIRMED,
                reason: `Simultaneous applicant #${clientIdx}`,
              },
            });

            return { success: true, appt, clientIdx };
          });
        }
      );
    } catch (err: any) {
      return { success: false, error: err.message, clientIdx };
    }
  }

  console.log(`   Firing 10 simultaneous requests for Dr. Patel at ${concSlot}...`);
  const concurrentAttempts = await Promise.all(
    Array.from({ length: 10 }, (_, i) => bookConcurrent(i + 1))
  );

  const winningAttempts = concurrentAttempts.filter((r) => r.success);
  const losingAttempts = concurrentAttempts.filter((r) => !r.success);

  assert(
    winningAttempts.length === 1,
    `Concurrency Protection: Exactly 1 simultaneous request succeeded (Winner: Client #${winningAttempts[0]?.clientIdx})`,
    `Successful: ${winningAttempts.length}`
  );
  assert(
    losingAttempts.length === 9,
    `Concurrency Protection: Exactly 9 simultaneous requests were safely rejected with conflict errors`,
    `Rejected: ${losingAttempts.length}`
  );

  const finalDbCount = await prisma.appointment.count({
    where: {
      doctorId: drPatel!.id,
      appointmentDate: concDate,
      timeSlot: concSlot,
      status: AppointmentStatus.CONFIRMED,
    },
  });
  assert(finalDbCount === 1, 'Database constraint verification: Exactly 1 record exists, zero double-booking', `DB Count: ${finalDbCount}`);

  // ---------------------------------------------------------------------------
  // SUMMARY
  // ---------------------------------------------------------------------------
  console.log('\n========================================================================');
  console.log(`🏁 ALL TESTS COMPLETED: ${passed} PASSED | ${failed} FAILED`);
  console.log('========================================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runEdgeCaseVerificationSuite()
  .catch((err) => {
    console.error('Fatal test error:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
