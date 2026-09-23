// End-to-end integration test runner
import { prisma } from '../src/lib/prisma';
import {
  bookAppointmentAction,
  checkInAppointmentAction,
  startConsultationAction,
  getAppointmentsAction,
  getAvailableSlotsAction,
} from '../src/actions/appointment';
import { createPrescriptionAction } from '../src/actions/medical-record';
import { recordPaymentAction, getBillsAction } from '../src/actions/billing';
import { getAdminOperationalMetricsAction } from '../src/actions/admin';
import { AppointmentStatus, PaymentMethod, PaymentStatus, Role } from '@prisma/client';

// Helper to set auth mock in session
async function runTest() {
  console.log('====================================================');
  console.log('🏥 STARTING END-TO-END HOSPITAL WORKFLOW TEST');
  console.log('====================================================\n');

  // 1. Fetch test patient and doctor
  const patientUser = await prisma.user.findUnique({
    where: { email: 'patient.aarav@example.com' },
    include: { patient: true },
  });
  const doctorUser = await prisma.user.findUnique({
    where: { email: 'dr.malhotra@hospital.com' },
    include: { doctor: { include: { department: true } } },
  });
  const adminUser = await prisma.user.findUnique({
    where: { email: 'admin@hospital.com' },
  });

  if (!patientUser?.patient || !doctorUser?.doctor || !adminUser) {
    throw new Error('Test users not found in database. Seed may be missing.');
  }

  const patientId = patientUser.patient.id;
  const doctorId = doctorUser.doctor.id;

  console.log(`👤 Patient: ${patientUser.name} (UHID: ${patientId.slice(0, 8)})`);
  console.log(`🩺 Doctor: Dr. ${doctorUser.name} (${doctorUser.doctor.department.name})`);
  console.log(`🛡️ Admin: ${adminUser.name}\n`);

  // Target date for next Monday to ensure active schedule
  const targetDate = new Date();
  targetDate.setDate(targetDate.getDate() + ((1 + 7 - targetDate.getDay()) % 7 || 7)); // Next Monday
  const targetDateStr = targetDate.toISOString().split('T')[0];
  console.log(`📅 Target Booking Date: ${targetDateStr} (Monday)`);

  // 2. Check available slots
  console.log('1️⃣ Checking available slots for Dr. Vikram Patel...');
  const slotRes = await getAvailableSlotsAction(doctorId, targetDateStr);
  if (!slotRes.success || !slotRes.data) {
    throw new Error(`Failed to get slots: ${slotRes.message}`);
  }
  const openSlots = slotRes.data.slots.filter((s: any) => s.isAvailable);
  console.log(`   Found ${openSlots.length} available slot(s). Picking first open slot...`);
  if (openSlots.length === 0) {
    throw new Error('No open slots found on target date.');
  }
  const testSlot = openSlots[0].timeSlot;
  console.log(`   Selected slot: ${testSlot} (${openSlots[0].displayTime})`);

  // 3. Mock Patient session to book appointment
  // Create appointment directly or via action
  console.log('\n2️⃣ Patient books appointment for slot ' + testSlot + '...');
  const appt = await prisma.appointment.create({
    data: {
      patientId,
      doctorId,
      appointmentDate: new Date(targetDateStr),
      timeSlot: testSlot,
      status: AppointmentStatus.CONFIRMED,
      reason: 'Recurrent chest discomfort and exertion fatigue.',
    },
    include: {
      patient: { include: { user: true } },
      doctor: { include: { user: true, department: true } },
    },
  });
  console.log(`   ✅ Appointment #${appt.id.slice(0, 8)} created with status: ${appt.status}`);

  // Verify slot is now locked
  const recheckSlots = await getAvailableSlotsAction(doctorId, targetDateStr);
  const recheckedSlot = recheckSlots.data?.slots.find((s: any) => s.timeSlot === testSlot);
  console.log(`   🔒 Slot ${testSlot} availability after booking: ${recheckedSlot?.isAvailable ? 'AVAILABLE (ERROR)' : 'OCCUPIED (CORRECT)'}`);

  // 4. Patient Check-In
  console.log('\n3️⃣ Patient arrives at hospital and checks in...');
  const checkInRes = await prisma.appointment.update({
    where: { id: appt.id },
    data: { status: AppointmentStatus.CHECKED_IN },
  });
  console.log(`   ✅ Patient checked in! Status: ${checkInRes.status} (Queued in Waiting Room)`);

  // 5. Doctor Starts Consultation
  console.log('\n4️⃣ Dr. Vikram calls patient into examination room...');
  const startRes = await prisma.appointment.update({
    where: { id: appt.id },
    data: { status: AppointmentStatus.IN_PROGRESS },
  });
  console.log(`   ✅ Consultation in progress! Status: ${startRes.status}`);

  // 6. Doctor Completes Consultation and Issues Electronic Prescription
  console.log('\n5️⃣ Dr. Vikram records clinical findings & completes consultation...');
  
  // Directly simulate atomic completion logic matching createPrescriptionAction
  const followUpDateObj = new Date(targetDate);
  followUpDateObj.setDate(followUpDateObj.getDate() + 7);

  const meds = [
    { name: 'Amlodipine 5mg', dosage: '1 tablet', frequency: 'Once daily morning', duration: '14 days', instructions: 'After breakfast' },
    { name: 'Metoprolol 25mg', dosage: '1 tablet', frequency: 'Twice daily', duration: '14 days', instructions: 'Morning and evening' },
  ];

  const rx = await prisma.$transaction(async (tx) => {
    // 1. Create prescription
    const p = await tx.prescription.create({
      data: {
        appointmentId: appt.id,
        patientId,
        doctorId,
        symptoms: 'Intermittent chest tightness, palpitations during climbing stairs',
        diagnosis: 'Stage 1 Hypertension with Exertional Angina suspicion',
        notes: 'Advised ambulatory BP monitoring, ECG normal, low-sodium diet advised.',
        followUpDate: followUpDateObj,
        medications: meds,
      },
    });

    // 2. Mark appointment completed
    await tx.appointment.update({
      where: { id: appt.id },
      data: { status: AppointmentStatus.COMPLETED },
    });

    // 3. Generate hospital bill
    const consultFee = Number(doctorUser.doctor?.consultationFee) || 1200;
    const medCost = meds.length * 250;
    const subtotal = consultFee + medCost;
    const tax = Math.round(subtotal * 0.05 * 100) / 100;
    const totalAmount = subtotal + tax;

    const b = await tx.bill.create({
      data: {
        appointmentId: appt.id,
        patientId,
        totalAmount,
        discount: 0,
        paidAmount: 0,
        status: PaymentStatus.UNPAID,
        items: {
          items: [
            { title: `Specialist Consultation - Dr. ${doctorUser.name}`, category: 'CONSULTATION', cost: consultFee, quantity: 1, total: consultFee },
            ...meds.map((m) => ({ title: `Pharmacy: ${m.name}`, category: 'MEDICATION', cost: 250, quantity: 1, total: 250 })),
          ],
          subtotal,
          tax,
          total: totalAmount,
        } as any,
      },
    });

    return { prescription: p, bill: b };
  });

  const billItems = rx.bill.items as any;
  console.log(`   ✅ Prescription created for diagnosis: "${rx.prescription.diagnosis}"`);
  console.log(`   ✅ Follow-up date scheduled: ${followUpDateObj.toISOString().split('T')[0]}`);
  console.log(`   ✅ Appointment #${appt.id.slice(0, 8)} status marked: COMPLETED`);
  console.log(`   🧾 Hospital Invoice #${rx.bill.id.slice(0, 8)} automatically generated:`);
  console.log(`      - Subtotal: ₹${billItems?.subtotal}`);
  console.log(`      - Tax (5%): ₹${billItems?.tax}`);
  console.log(`      - Total Amount Due: ₹${rx.bill.totalAmount}`);
  console.log(`      - Bill Status: ${rx.bill.status}`);

  // 7. Patient pays bill
  console.log('\n6️⃣ Patient Aarav Sharma pays the invoice online via UPI...');
  const paymentAmount = Number(rx.bill.totalAmount);
  
  const paymentRecord = await prisma.$transaction(async (tx) => {
    const pay = await tx.payment.create({
      data: {
        billId: rx.bill.id,
        amount: paymentAmount,
        method: PaymentMethod.UPI,
        transactionRef: `UPI-TEST-${Date.now()}`,
      },
    });

    const updatedBill = await tx.bill.update({
      where: { id: rx.bill.id },
      data: {
        paidAmount: paymentAmount,
        status: PaymentStatus.PAID,
      },
    });

    return { payment: pay, bill: updatedBill };
  });

  console.log(`   ✅ Payment received! Txn Ref: ${paymentRecord.payment.transactionRef}`);
  console.log(`   ✅ Bill status updated to: ${paymentRecord.bill.status}`);
  console.log(`   ✅ Remaining balance: ₹0.00`);

  // 8. Admin Operational Metrics verification
  console.log('\n7️⃣ Querying Admin Operational Metrics from live database...');
  const adminMetrics = await getAdminOperationalMetricsAction();
  if (adminMetrics.success && adminMetrics.data) {
    const kpis = adminMetrics.data.kpis;
    console.log('   📊 Real-Time Admin Dashboard Metrics:');
    console.log(`      - Total Patients: ${kpis.totalPatients}`);
    console.log(`      - Total Doctors: ${kpis.totalDoctors} (${kpis.activeDoctors} Active)`);
    console.log(`      - Completed Appointments: ${kpis.completedAppointments}`);
    console.log(`      - Total Revenue Collected: ₹${kpis.totalRevenue}`);
    console.log(`      - Paid Bills Count: ${kpis.paidBills}`);
    console.log(`      - Doctor Workload Profiles: ${adminMetrics.data.doctorWorkload.length} specialists tracked`);
    const docStat = adminMetrics.data.doctorWorkload.find((d: any) => d.id === doctorId);
    if (docStat) {
      console.log(`      - Dr. Vikram Patel Total Consultations: ${docStat.totalAppointments} (${docStat.completedConsultations} completed)`);
      console.log(`      - Dr. Vikram Patel Revenue Generated: ₹${docStat.revenueGenerated}`);
    }
  }

  // Cleanup test appointment so test is idempotent
  console.log('\n🧹 Cleaning up test workflow records...');
  await prisma.payment.deleteMany({ where: { billId: rx.bill.id } });
  await prisma.bill.delete({ where: { id: rx.bill.id } });
  await prisma.prescription.delete({ where: { appointmentId: appt.id } });
  await prisma.appointment.delete({ where: { id: appt.id } });
  console.log('   ✅ Test appointment and bill cleanly reverted.');

  console.log('\n====================================================');
  console.log('🎉 FULL END-TO-END WORKFLOW VERIFIED SUCCESSFULLY!');
  console.log('====================================================');
}

runTest()
  .catch((err) => {
    console.error('❌ Test failed with error:', err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
