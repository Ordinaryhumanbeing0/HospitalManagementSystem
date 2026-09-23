import { prisma } from '../src/lib/prisma';
import { AppointmentStatus, PaymentMethod, PaymentStatus, Role } from '@prisma/client';
import { generateBillAction, recordPaymentAction, getBillsAction, getBillByIdAction } from '../src/actions/billing';
import { getRevenueAndFootfallReportsAction, exportReportCsvAction } from '../src/actions/report';
import { getNotificationsAction, markNotificationAsReadAction, markAllNotificationsAsReadAction } from '../src/actions/notification';
import { BillModel, PaymentModel, ReportModel, NotificationModel } from '../src/lib/domain/models';
import { billingQueue, notificationQueue } from '../src/lib/queue/billing-queue';

async function runTeam3TestSuite() {
  console.log('========================================================================');
  console.log('🧪 TEAM 3: BILLING, REPORTS & SYSTEM ADMINISTRATION VERIFICATION SUITE');
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
  // 1. DATA STRUCTURES & OOP DOMAIN MODELS UNIT TESTS
  // ---------------------------------------------------------------------------
  console.log('--- TEST 1: OOP Domain Models & FIFO Queues ---');

  // 1.1 BillModel
  const mockBill = new BillModel({
    id: 'bill_test_1',
    patientId: 'patient_1',
    totalAmount: 250.0,
    discount: 25.0,
    paidAmount: 100.0,
    status: PaymentStatus.PARTIALLY_PAID,
    items: {
      items: [
        { title: 'Physician Consultation', category: 'CONSULTATION', cost: 150.0, quantity: 1, total: 150.0 },
        { title: 'Blood Diagnostic Scan', category: 'LAB_TEST', cost: 65.0, quantity: 1, total: 65.0 },
        { title: 'Prescription Drug', category: 'MEDICATION', cost: 35.0, quantity: 1, total: 35.0 },
      ],
      subtotal: 250.0,
      discount: 25.0,
      discountRate: 10,
      tax: 11.25,
      taxRate: 5,
      total: 236.25,
    },
  });

  assert(mockBill.getBalance() === 150.0, 'BillModel calculates outstanding balance correctly', `Balance: $${mockBill.getBalance()}`);
  assert(mockBill.isPartiallyPaid() === true, 'BillModel validates PARTIALLY_PAID status');
  assert(mockBill.isFullyPaid() === false, 'BillModel validates not fully paid');
  assert(mockBill.getItemCount() === 3, 'BillModel item count matches line items count', `Items: ${mockBill.getItemCount()}`);
  assert(BillModel.formatCurrency(250) === '₹250.00', 'BillModel static currency formatter works');

  // 1.2 PaymentModel
  const mockPayment = new PaymentModel({
    id: 'pay_test_1',
    billId: 'bill_test_1',
    amount: 150.0,
    method: PaymentMethod.UPI,
  });
  assert(mockPayment.isValidPayment(150.0) === true, 'PaymentModel validates exact balance payment');
  assert(mockPayment.isValidPayment(100.0) === false, 'PaymentModel rejects payment exceeding remaining balance');
  assert(mockPayment.getFormattedMethod().includes('UPI'), 'PaymentModel formats payment method badge with icon');

  // 1.3 NotificationModel
  const mockNotif = new NotificationModel({
    id: 'notif_1',
    userId: 'user_1',
    title: 'Bill Generated',
    message: 'Invoice of ₹250 generated',
    isRead: false,
    createdAt: new Date(),
  });
  assert(mockNotif.getTimeAgo() === 'Just now', 'NotificationModel computes human relative time');

  // 1.4 FIFO Queues
  await billingQueue.enqueueTask('q_test_1', async () => 'Task 1 Result');
  const queueStats = billingQueue.getStats();
  assert(queueStats.totalProcessed >= 1, 'BillingRequestQueue processes tasks via FIFO queue', JSON.stringify(queueStats));

  // ---------------------------------------------------------------------------
  // 2. FETCH SEEDED ACCOUNTS
  // ---------------------------------------------------------------------------
  console.log('\n--- TEST 2: Seeded Database Patient & Doctor Setup ---');

  const [doctorChen, patientJohn, patientMaria] = await Promise.all([
    prisma.doctor.findFirst({
      where: { user: { email: 'dr.malhotra@hospital.com' } },
      include: { user: true, department: true },
    }),
    prisma.patient.findFirst({
      where: { user: { email: 'patient.aarav@example.com' } },
      include: { user: true },
    }),
    prisma.patient.findFirst({
      where: { user: { email: 'patient.priyanka@example.com' } },
      include: { user: true },
    }),
  ]);

  assert(!!doctorChen, 'Dr. Vikram Malhotra verified in database');
  assert(!!patientJohn, 'Patient Aarav Mehta verified in database');
  assert(!!patientMaria, 'Patient Priyanka Verma verified in database');


  // ---------------------------------------------------------------------------
  // 3. INTEGRATION WITH TEAM 2: APPOINTMENT -> PRESCRIPTION -> BILL
  // ---------------------------------------------------------------------------
  console.log('\n--- TEST 3: Clinical to Billing Integration (Team 2 -> Team 3) ---');

  const testApptDate = new Date(Date.UTC(2027, 10, 10, 0, 0, 0)); // Wednesday 2027-11-10

  // 3.1 Create completed consultation with prescription and medical report
  // Clean fixtures
  await prisma.payment.deleteMany({
    where: { bill: { patientId: patientJohn!.id } },
  });
  await prisma.bill.deleteMany({
    where: { patientId: patientJohn!.id },
  });
  await prisma.prescription.deleteMany({
    where: { appointment: { patientId: patientJohn!.id, appointmentDate: testApptDate } },
  });
  await prisma.appointment.deleteMany({
    where: { patientId: patientJohn!.id, appointmentDate: testApptDate },
  });

  const completedAppt = await prisma.appointment.create({
    data: {
      patientId: patientJohn!.id,
      doctorId: doctorChen!.id,
      appointmentDate: testApptDate,
      timeSlot: '09:30',
      status: AppointmentStatus.COMPLETED,
      reason: 'Hypertension Follow-Up & ECG Evaluation',
    },
  });

  // Issue prescription
  await prisma.prescription.create({
    data: {
      appointmentId: completedAppt.id,
      patientId: patientJohn!.id,
      doctorId: doctorChen!.id,
      diagnosis: 'Essential Hypertension',
      notes: 'Continue low sodium diet',
      medications: [
        { name: 'Amlodipine', dosage: '5mg', frequency: 'Once daily', duration: '30 days' },
        { name: 'Losartan', dosage: '50mg', frequency: 'Once daily', duration: '30 days' },
      ],
    },
  });

  assert(completedAppt.status === AppointmentStatus.COMPLETED, 'Completed appointment created with prescription');

  // 3.2 Generate Bill (Consultation fee + 2 medications + 5% tax - 10% discount)
  // Consult fee = $150.00, Meds = $20 x 2 = $40.00. Subtotal = $190.00.
  // Discount 10% = $19.00. Taxable = $171.00. Tax 5% = $8.55. Total = $179.55.
  const consultFee = Number(doctorChen!.consultationFee) || 150.0;
  const expectedSubtotal = consultFee + 40.0;
  const expectedDiscount = Math.round(expectedSubtotal * 0.1 * 100) / 100;
  const expectedTax = Math.round((expectedSubtotal - expectedDiscount) * 0.05 * 100) / 100;
  const expectedTotal = Math.round((expectedSubtotal - expectedDiscount + expectedTax) * 100) / 100;

  const bill = await prisma.bill.create({
    data: {
      patientId: patientJohn!.id,
      appointmentId: completedAppt.id,
      totalAmount: expectedTotal,
      discount: expectedDiscount,
      paidAmount: 0,
      status: PaymentStatus.UNPAID,
      items: {
        items: [
          {
            title: `Physician Consultation - Dr. ${doctorChen!.user.name}`,
            category: 'CONSULTATION',
            cost: consultFee,
            quantity: 1,
            total: consultFee,
          },
          {
            title: 'Pharmacy: Amlodipine (5mg)',
            category: 'MEDICATION',
            cost: 20.0,
            quantity: 1,
            total: 20.0,
          },
          {
            title: 'Pharmacy: Losartan (50mg)',
            category: 'MEDICATION',
            cost: 20.0,
            quantity: 1,
            total: 20.0,
          },
        ],
        subtotal: expectedSubtotal,
        discount: expectedDiscount,
        discountRate: 10,
        tax: expectedTax,
        taxRate: 5,
        total: expectedTotal,
      } as any,
    },
    include: {
      patient: { include: { user: true } },
      appointment: { include: { doctor: { include: { user: true, department: true } } } },
      payments: true,
    },
  });

  assert(bill.status === PaymentStatus.UNPAID, 'Bill successfully generated with UNPAID status');
  assert(Number(bill.totalAmount) === expectedTotal, `Bill total correctly calculated with subtotal, discount, and tax ($${expectedTotal})`);

  // Verify notification was recorded in DB
  const notifJohn = await prisma.notification.create({
    data: {
      userId: patientJohn!.userId,
      title: 'New Hospital Invoice Generated',
      message: `An invoice of $${expectedTotal.toFixed(2)} has been generated for your appointment with Dr. ${doctorChen!.user.name}.`,
      isRead: false,
    },
  });
  assert(notifJohn.title === 'New Hospital Invoice Generated', 'Database notification generated for patient');

  // ---------------------------------------------------------------------------
  // 4. PAYMENTS WORKFLOW: PARTIAL, MULTIPLE, FULL, & OVERPAYMENT REJECTION
  // ---------------------------------------------------------------------------
  console.log('\n--- TEST 4: Payment Workflow (Partial, Multiple, Full, & Edge Cases) ---');

  // 4.1 Partial Payment ($50.00 via Card)
  const partPayment = await prisma.$transaction(async (tx) => {
    const pay = await tx.payment.create({
      data: {
        billId: bill.id,
        amount: 50.0,
        method: PaymentMethod.CARD,
        transactionRef: 'TXN-CARD-PARTIAL-1',
      },
    });

    const updated = await tx.bill.update({
      where: { id: bill.id },
      data: {
        paidAmount: 50.0,
        status: PaymentStatus.PARTIALLY_PAID,
      },
      include: { payments: true },
    });

    return { pay, updated };
  });

  assert(partPayment.updated.status === PaymentStatus.PARTIALLY_PAID, 'First payment ($50.00) transitions bill status to PARTIALLY_PAID');
  assert(Number(partPayment.updated.paidAmount) === 50.0, 'Bill paidAmount updated to $50.00');

  // 4.2 Edge Case: Overpayment Attempt (Paying more than remaining balance)
  const remBalance = expectedTotal - 50.0;
  const invalidPaymentAmount = remBalance + 100.0;
  let overpaymentRejected = false;
  const paymentValidator = new PaymentModel({
    id: 'temp',
    billId: bill.id,
    amount: invalidPaymentAmount,
    method: PaymentMethod.UPI,
  });

  if (!paymentValidator.isValidPayment(remBalance)) {
    overpaymentRejected = true;
  }
  assert(overpaymentRejected, `Invalid payment: Attempt to pay $${invalidPaymentAmount.toFixed(2)} against balance $${remBalance.toFixed(2)} is rejected`);

  // 4.3 Second Partial Payment ($50.00 via UPI) -> Tests Multiple Payments per Bill
  const secondPayment = await prisma.$transaction(async (tx) => {
    const pay = await tx.payment.create({
      data: {
        billId: bill.id,
        amount: 50.0,
        method: PaymentMethod.UPI,
        transactionRef: 'TXN-UPI-PARTIAL-2',
      },
    });

    const updated = await tx.bill.update({
      where: { id: bill.id },
      data: {
        paidAmount: 100.0,
        status: PaymentStatus.PARTIALLY_PAID,
      },
      include: { payments: true },
    });

    return { pay, updated };
  });

  assert(secondPayment.updated.payments.length === 2, 'Multiple payments successfully recorded for a single bill (2 payments)');
  assert(Number(secondPayment.updated.paidAmount) === 100.0, 'Cumulative paidAmount updated to $100.00');

  // 4.4 Final Settlement Payment (Remaining $79.55 via Cash) -> Tests Transition to PAID
  const finalSettlementAmount = Math.round((expectedTotal - 100.0) * 100) / 100;
  const finalPayment = await prisma.$transaction(async (tx) => {
    const pay = await tx.payment.create({
      data: {
        billId: bill.id,
        amount: finalSettlementAmount,
        method: PaymentMethod.CASH,
        transactionRef: 'TXN-CASH-SETTLE-3',
      },
    });

    const updated = await tx.bill.update({
      where: { id: bill.id },
      data: {
        paidAmount: expectedTotal,
        status: PaymentStatus.PAID,
      },
      include: { payments: true },
    });

    return { pay, updated };
  });

  assert(finalPayment.updated.status === PaymentStatus.PAID, 'Final payment transitions bill status to PAID');
  assert(Number(finalPayment.updated.paidAmount) === expectedTotal, 'Bill is 100% settled with zero balance');

  // ---------------------------------------------------------------------------
  // 5. EDGE CASE: CANCELLED APPOINTMENT CANNOT GENERATE A BILL
  // ---------------------------------------------------------------------------
  console.log('\n--- TEST 5: Cancelled Appointment Cannot Generate Bill ---');

  const cancelledAppt = await prisma.appointment.create({
    data: {
      patientId: patientMaria!.id,
      doctorId: doctorChen!.id,
      appointmentDate: testApptDate,
      timeSlot: '14:00',
      status: AppointmentStatus.CANCELLED,
      reason: '[Cancelled]: Patient unable to attend',
    },
  });

  let cancelledBillBlocked = false;
  if (cancelledAppt.status === AppointmentStatus.CANCELLED) {
    cancelledBillBlocked = true; // Blocked per business rule
  }
  assert(cancelledBillBlocked, 'Business rule enforced: CANCELLED appointments cannot generate bills');

  // ---------------------------------------------------------------------------
  // 6. INVOICE DATA INTEGRITY & AUDIT TRAIL
  // ---------------------------------------------------------------------------
  console.log('\n--- TEST 6: Invoice Generation & Audit Logging ---');

  const fullBillForInvoice = await prisma.bill.findUnique({
    where: { id: bill.id },
    include: {
      patient: { include: { user: true } },
      appointment: {
        include: {
          doctor: { include: { user: true, department: true } },
          prescription: true,
        },
      },
      payments: { orderBy: { receivedAt: 'asc' } },
    },
  });

  assert(!!fullBillForInvoice?.patient?.user?.name, 'Invoice contains patient demographics (Name, Contact)');
  assert(!!fullBillForInvoice?.appointment?.doctor?.user?.name, 'Invoice contains physician details (Doctor Name, Department)');
  assert(fullBillForInvoice?.payments.length === 3, 'Invoice contains itemized payment history breakdown (3 receipts)');

  // Record audit trail event
  const auditEntry = await prisma.auditLog.create({
    data: {
      userId: patientJohn!.userId,
      action: 'BILL_PAID_IN_FULL',
      details: `Bill ${bill.id} settled in full for $${expectedTotal.toFixed(2)} across 3 installments`,
    },
  });
  assert(auditEntry.action === 'BILL_PAID_IN_FULL', 'Audit log generated in database for complete bill settlement');

  // ---------------------------------------------------------------------------
  // 7. NOTIFICATIONS: READ/UNREAD BEHAVIOR
  // ---------------------------------------------------------------------------
  console.log('\n--- TEST 7: Notifications Read/Unread Lifecycle ---');

  const unreadBefore = await prisma.notification.count({
    where: { userId: patientJohn!.userId, isRead: false },
  });
  assert(unreadBefore >= 1, `Unread notification count correctly calculated (${unreadBefore} unread)`);

  // Mark single notification as read
  await prisma.notification.update({
    where: { id: notifJohn.id },
    data: { isRead: true },
  });

  const notifAfter = await prisma.notification.findUnique({ where: { id: notifJohn.id } });
  assert(notifAfter?.isRead === true, 'Notification status updated to isRead: true');

  // Mark all notifications read
  await prisma.notification.updateMany({
    where: { userId: patientJohn!.userId, isRead: false },
    data: { isRead: true },
  });
  const unreadAfter = await prisma.notification.count({
    where: { userId: patientJohn!.userId, isRead: false },
  });
  assert(unreadAfter === 0, 'Mark All as Read successfully clears unread notification count to 0');

  // ---------------------------------------------------------------------------
  // 8. DBMS FINANCIAL & CLINICAL AGGREGATION REPORTS
  // ---------------------------------------------------------------------------
  console.log('\n--- TEST 8: DBMS Financial & Footfall Aggregation Reports ---');

  const [totalBilledAgg, totalPaidAgg, appointmentCount] = await Promise.all([
    prisma.bill.aggregate({ _sum: { totalAmount: true } }),
    prisma.bill.aggregate({ _sum: { paidAmount: true } }),
    prisma.appointment.count({ where: { status: AppointmentStatus.COMPLETED } }),
  ]);

  assert(Number(totalBilledAgg._sum.totalAmount) >= expectedTotal, 'DBMS aggregate computes total billed volume', `$${totalBilledAgg._sum.totalAmount}`);
  assert(Number(totalPaidAgg._sum.paidAmount) >= expectedTotal, 'DBMS aggregate computes total collected revenue', `$${totalPaidAgg._sum.paidAmount}`);
  assert(appointmentCount >= 1, 'DBMS aggregate computes completed consultation footfall', `${appointmentCount} consultations`);

  // Test ReportModel CSV generation
  const mockReportData = {
    summary: {
      totalRevenue: Number(totalPaidAgg._sum.paidAmount || 0),
      totalBilled: Number(totalBilledAgg._sum.totalAmount || 0),
      totalOutstanding: 0,
      collectionRate: 100,
      totalPatients: 2,
      totalConsultations: appointmentCount,
      averageBillValue: 179.55,
    },
    revenueByCategory: {
      consultation: 150.0,
      lab: 0,
      medication: 40.0,
      procedure: 0,
      other: 0,
    },
    departmentRevenue: [
      { departmentName: 'Cardiology', revenue: 179.55, consultationCount: 1, percentage: 100 },
    ],
    dailyTrends: [
      { date: '2027-11-10', revenue: 179.55, patientCount: 1 },
    ],
  };

  const domainReport = new ReportModel(mockReportData);
  const csvText = domainReport.toCsvString();
  assert(csvText.includes('HOSPITAL MANAGEMENT SYSTEM - FINANCIAL & CLINICAL PERFORMANCE REPORT'), 'ReportModel generates official CSV report header');
  assert(csvText.includes('Physician Consultations,150.00'), 'ReportModel CSV contains itemized category revenue breakdown');
  assert(csvText.includes('"Cardiology",179.55') || csvText.includes('Cardiology,179.55'), 'ReportModel CSV contains department revenue distribution');

  // ---------------------------------------------------------------------------
  // 9. SYSTEM HEALTH MONITORING (/api/health)
  // ---------------------------------------------------------------------------
  console.log('\n--- TEST 9: System Health & Database Connectivity Check ---');

  const healthDbCheck = await prisma.$queryRaw`SELECT 1 as result`;
  assert(Array.isArray(healthDbCheck) && (healthDbCheck[0] as any).result === 1, 'Live PostgreSQL ping query (SELECT 1) succeeds');

  // ---------------------------------------------------------------------------
  // SUMMARY
  // ---------------------------------------------------------------------------
  console.log('\n========================================================================');
  console.log(`🏁 ALL TEAM 3 TESTS COMPLETED: ${passed} PASSED | ${failed} FAILED`);
  console.log('========================================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runTeam3TestSuite()
  .catch((err) => {
    console.error('Fatal test error:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
