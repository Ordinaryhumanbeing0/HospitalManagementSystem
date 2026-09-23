'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Heart,
  Droplet,
  Calendar,
  Building2,
  Stethoscope,
  ShieldCheck,
  Activity,
  ArrowRight,
  FileText,
  Plus,
  Clock,
  Pill,
  CheckCircle2,
  RefreshCw,
  Eye,
  CreditCard,
  AlertCircle,
  CalendarCheck,
  UserCheck,
  Receipt,
  Download,
} from 'lucide-react';
import { DashboardShell } from '@/components/ui/DashboardShell';
import { Modal } from '@/components/ui/Modal';
import { getAuthUserAction } from '@/actions/auth';
import { getPatientByIdAction } from '@/actions/patient';
import { getAppointmentsAction, checkInAppointmentAction } from '@/actions/appointment';
import { getPatientMedicalHistoryAction } from '@/actions/medical-record';
import { getBillsAction, recordPaymentAction, getBillByIdAction } from '@/actions/billing';
import { formatCurrency } from '@/lib/config/currency';
import { SessionUser } from '@/types';
import { AppointmentStatus, PaymentMethod, PaymentStatus } from '@prisma/client';

export default function PatientDashboardPage() {
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState<SessionUser | null>(null);
  const [patientRecord, setPatientRecord] = useState<any | null>(null);
  const [upcomingAppointments, setUpcomingAppointments] = useState<any[]>([]);
  const [recentPrescriptions, setRecentPrescriptions] = useState<any[]>([]);
  const [recentReports, setRecentReports] = useState<any[]>([]);
  const [patientBills, setPatientBills] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // 1. View Prescription Modal
  const [selectedRx, setSelectedRx] = useState<any | null>(null);

  // 2. Pay Bill Modal State
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [selectedBillForPayment, setSelectedBillForPayment] = useState<any | null>(null);
  const [payAmount, setPayAmount] = useState<string>('');
  const [payMethod, setPayMethod] = useState<PaymentMethod>(PaymentMethod.UPI);
  const [submittingPayment, setSubmittingPayment] = useState(false);
  const [paymentError, setPaymentError] = useState<string | null>(null);

  // 3. Invoice Details Modal State
  const [isInvoiceModalOpen, setIsInvoiceModalOpen] = useState(false);
  const [invoiceBill, setInvoiceBill] = useState<any | null>(null);
  const [loadingInvoice, setLoadingInvoice] = useState(false);

  // 4. Follow-up recommendation
  const [followUpBanner, setFollowUpBanner] = useState<{
    date: string;
    doctorName: string;
    specialization: string;
    diagnosis: string;
  } | null>(null);

  const loadPatientData = async (patientId: string) => {
    setLoading(true);
    const [patRes, apptRes, histRes, billsRes] = await Promise.all([
      getPatientByIdAction(patientId),
      getAppointmentsAction({ limit: 10 }),
      getPatientMedicalHistoryAction(patientId),
      getBillsAction({ patientId, limit: 10 }),
    ]);

    if (patRes.success && patRes.data) setPatientRecord(patRes.data);

    if (apptRes.success && apptRes.data) {
      // Sort upcoming / active appointments
      const active = apptRes.data.appointments.filter(
        (a: any) =>
          a.status === AppointmentStatus.CONFIRMED ||
          a.status === AppointmentStatus.CHECKED_IN ||
          a.status === AppointmentStatus.IN_PROGRESS ||
          a.status === AppointmentStatus.SCHEDULED
      );
      setUpcomingAppointments(active);
    }

    if (histRes.success && histRes.data) {
      const rxList = histRes.data.prescriptions;
      setRecentPrescriptions(rxList.slice(0, 3));
      setRecentReports(histRes.data.reports.slice(0, 3));

      // Check for follow-up date in recent prescriptions
      const rxWithFollowUp = rxList.find((p: any) => p.followUpDate);
      if (rxWithFollowUp) {
        setFollowUpBanner({
          date: new Date(rxWithFollowUp.followUpDate).toLocaleDateString(),
          doctorName: rxWithFollowUp.doctor?.user?.name || 'Physician',
          specialization: rxWithFollowUp.doctor?.department?.name || 'Specialist',
          diagnosis: rxWithFollowUp.diagnosis,
        });
      }
    }

    if (billsRes.success && billsRes.data) {
      setPatientBills(billsRes.data.bills);
    }

    setLoading(false);
  };

  useEffect(() => {
    getAuthUserAction().then(async (res) => {
      if (res.data) {
        setCurrentUser(res.data);
        if (res.data.patientId) {
          loadPatientData(res.data.patientId);
        } else {
          setLoading(false);
        }
      } else {
        router.push('/login?role=PATIENT&callbackUrl=/patient/dashboard');
      }
    });
  }, [router]);

  // Self check-in for today's appointment
  const handlePatientCheckIn = async (apptId: string) => {
    const res = await checkInAppointmentAction(apptId);
    if (res.success) {
      setToastMessage('You have successfully checked in! The doctor has been notified that you are in the waiting room.');
      if (currentUser?.patientId) {
        loadPatientData(currentUser.patientId);
      }
    } else {
      setToastMessage(res.message || 'Check-in failed.');
    }
  };

  // Open Payment Modal
  const handleOpenPayment = (bill: any) => {
    setSelectedBillForPayment(bill);
    const bal = Math.max(0, Number(bill.totalAmount) - Number(bill.paidAmount));
    setPayAmount(bal.toFixed(2));
    setPayMethod(PaymentMethod.UPI);
    setPaymentError(null);
    setIsPaymentModalOpen(true);
  };

  // Submit Payment
  const handleSubmitPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedBillForPayment) return;

    const amt = parseFloat(payAmount);
    const bal = Number(selectedBillForPayment.totalAmount) - Number(selectedBillForPayment.paidAmount);

    if (isNaN(amt) || amt <= 0) {
      setPaymentError('Please enter a valid amount.');
      return;
    }

    if (amt > bal + 0.01) {
      setPaymentError(`Payment amount cannot exceed remaining balance (${formatCurrency(bal)}).`);
      return;
    }

    setSubmittingPayment(true);
    setPaymentError(null);

    const res = await recordPaymentAction({
      billId: selectedBillForPayment.id,
      amount: amt,
      method: payMethod,
      transactionRef: `UPI-APP-${Date.now()}`,
    });

    if (!res.success) {
      setPaymentError(res.message || 'Payment processing failed.');
      setSubmittingPayment(false);
      return;
    }

    setToastMessage(`Payment of ${formatCurrency(amt)} received successfully! Thank you.`);
    setIsPaymentModalOpen(false);
    setSubmittingPayment(false);
    if (currentUser?.patientId) {
      loadPatientData(currentUser.patientId);
    }
  };

  // Open Invoice View
  const handleOpenInvoice = async (billId: string) => {
    setIsInvoiceModalOpen(true);
    setLoadingInvoice(true);
    const res = await getBillByIdAction(billId);
    if (res.success && res.data) {
      setInvoiceBill(res.data);
    }
    setLoadingInvoice(false);
  };

  if (!currentUser || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white text-body text-sm">
        Loading patient healthcare portal...
      </div>
    );
  }

  const todayStr = new Date().toISOString().split('T')[0];

  return (
    <DashboardShell
      user={currentUser}
      title="Patient Health Portal"
      subtitle={`Welcome back, ${currentUser.name}. Access your medical history, check-in to consultations, and settle hospital bills.`}
      badge="Patient Electronic Desk"
      actionButton={
        <div className="flex items-center gap-2">
          <Link href="/appointments/book" className="btn-primary flex items-center gap-2 text-xs !py-2 !px-3">
            <Plus className="h-4 w-4" /> Book Consultation
          </Link>
          <Link href="/medical-records" className="btn-secondary flex items-center gap-2 text-xs !py-2 !px-3">
            <FileText className="h-4 w-4 text-brand" /> My Health Records
          </Link>
        </div>
      }
    >
      {/* Toast Alert */}
      {toastMessage && (
        <div className="mb-6 p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-semantic-up text-sm flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5 shrink-0" />
            <span>{toastMessage}</span>
          </div>
          <button
            onClick={() => setToastMessage(null)}
            className="text-xs font-semibold hover:underline"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Follow-up Recommended Banner */}
      {followUpBanner && (
        <div className="mb-8 p-5 rounded-xl bg-blue-50 border border-blue-200 text-blue-900 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-soft">
          <div className="flex items-start gap-3">
            <CalendarCheck className="h-6 w-6 text-brand shrink-0 mt-0.5" />
            <div>
              <div className="font-bold text-sm text-ink">
                Follow-up Consultation Due on {followUpBanner.date}
              </div>
              <p className="text-xs text-blue-800 mt-0.5">
                Recommended by Dr. {followUpBanner.doctorName} ({followUpBanner.specialization}) following your diagnosis for &ldquo;{followUpBanner.diagnosis}&rdquo;.
              </p>
            </div>
          </div>
          <Link
            href="/appointments/book"
            className="btn-primary !text-xs !py-2 !px-4 shrink-0 flex items-center gap-1.5 shadow-sm"
          >
            Book Follow-up Slot &rarr;
          </Link>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-10">
        {/* Left: Patient Digital Health Card & Active Consultations */}
        <div className="lg:col-span-2 space-y-6">
          {/* Health ID Card */}
          <div className="bg-surface-dark text-white rounded-xl p-8 shadow-soft relative overflow-hidden">
            <div className="flex items-start justify-between gap-4">
              <div>
                <span className="badge-pill !bg-white/10 !text-white mb-3">
                  <ShieldCheck className="h-3.5 w-3.5 text-brand" /> Verified Electronic Health ID
                </span>
                <h2 className="text-3xl font-normal tracking-tight text-white">
                  {currentUser.name}
                </h2>
                <div className="text-xs text-muted-soft number-mono mt-1">
                  UHID: {patientRecord?.id || currentUser.patientId || 'ACTIVE'}
                </div>
              </div>

              {patientRecord?.bloodGroup && (
                <div className="px-4 py-2 rounded-xl bg-red-950/80 border border-red-800/60 text-white flex items-center gap-2 shadow-sm">
                  <Droplet className="h-4 w-4 text-semantic-down" />
                  <span className="text-lg font-bold number-mono">{patientRecord.bloodGroup}</span>
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-8 pt-6 border-t border-surface-dark-elevated text-xs">
              <div>
                <div className="text-[10px] font-semibold uppercase text-muted tracking-wider">
                  Date of Birth
                </div>
                <div className="text-sm font-semibold text-white number-mono mt-0.5">
                  {patientRecord?.dateOfBirth ? new Date(patientRecord.dateOfBirth).toLocaleDateString() : 'N/A'}
                </div>
              </div>

              <div>
                <div className="text-[10px] font-semibold uppercase text-muted tracking-wider">
                  Gender
                </div>
                <div className="text-sm font-semibold text-white mt-0.5">
                  {patientRecord?.gender || 'N/A'}
                </div>
              </div>

              <div>
                <div className="text-[10px] font-semibold uppercase text-muted tracking-wider">
                  Contact Phone
                </div>
                <div className="text-xs text-muted-soft number-mono mt-0.5">
                  {currentUser.phone || 'None'}
                </div>
              </div>

              <div>
                <div className="text-[10px] font-semibold uppercase text-muted tracking-wider">
                  Emergency Contact
                </div>
                <div className="text-xs text-muted-soft mt-0.5 truncate">
                  {patientRecord?.emergencyContact || 'None'}
                </div>
              </div>
            </div>
          </div>

          {/* Upcoming Consultations Widget with Self Check-in */}
          <div className="bg-white rounded-xl border border-hairline p-6 shadow-soft">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-semibold text-ink flex items-center gap-2">
                <Calendar className="h-4 w-4 text-brand" /> Upcoming Consultations & Visits
              </h3>
              <Link href="/appointments" className="text-xs font-semibold text-brand hover:underline">
                Manage All &rarr;
              </Link>
            </div>

            {upcomingAppointments.length === 0 ? (
              <div className="p-6 bg-surface-soft rounded-xl text-center text-xs text-muted space-y-3">
                <div>You have no upcoming consultations scheduled.</div>
                <Link href="/appointments/book" className="btn-primary !text-xs inline-flex items-center gap-1.5">
                  <Plus className="h-3.5 w-3.5" /> Book Consultation Slot
                </Link>
              </div>
            ) : (
              <div className="space-y-3">
                {upcomingAppointments.map((appt) => {
                  const apptDateStr = new Date(appt.appointmentDate).toISOString().split('T')[0];
                  const isToday = apptDateStr === todayStr;
                  const isCheckedIn = appt.status === AppointmentStatus.CHECKED_IN;
                  const isInProgress = appt.status === AppointmentStatus.IN_PROGRESS;

                  return (
                    <div
                      key={appt.id}
                      className={`p-4 rounded-xl border border-hairline flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
                        isCheckedIn
                          ? 'bg-amber-50/40 border-amber-200'
                          : isInProgress
                          ? 'bg-blue-50/40 border-blue-200'
                          : 'bg-surface-soft'
                      }`}
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span
                            className={`badge-pill text-[10px] font-bold ${
                              isCheckedIn
                                ? '!bg-amber-100 !text-amber-800'
                                : isInProgress
                                ? '!bg-blue-100 !text-blue-800'
                                : '!bg-emerald-50 !text-semantic-up'
                            }`}
                          >
                            {isCheckedIn
                              ? 'WAITING IN CLINIC'
                              : isInProgress
                              ? 'IN EXAMINATION'
                              : appt.status}
                          </span>
                          <span className="text-xs font-semibold text-ink number-mono">
                            {apptDateStr} at {appt.timeSlot}
                          </span>
                        </div>

                        <div className="text-sm font-semibold text-ink">
                          Dr. {appt.doctor?.user?.name}{' '}
                          <span className="text-xs text-muted font-normal">
                            ({appt.doctor?.department?.name || 'Department'})
                          </span>
                        </div>

                        {appt.reason && (
                          <div className="text-xs text-muted">Reason: {appt.reason}</div>
                        )}
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        {/* Patient Check-in Button if today and not yet checked in */}
                        {isToday && !isCheckedIn && !isInProgress && (
                          <button
                            onClick={() => handlePatientCheckIn(appt.id)}
                            className="btn-primary !py-1.5 !px-3 !text-xs flex items-center gap-1.5 shadow-sm"
                          >
                            <UserCheck className="h-3.5 w-3.5" /> Check In Now
                          </button>
                        )}

                        {isCheckedIn && (
                          <span className="text-xs text-amber-700 font-medium flex items-center gap-1">
                            <span className="h-2 w-2 rounded-full bg-amber-500 animate-pulse" />
                            Queued in Waiting Room
                          </span>
                        )}

                        <Link
                          href="/appointments"
                          className="btn-secondary !py-1.5 !px-3 !text-xs flex items-center gap-1"
                        >
                          <RefreshCw className="h-3 w-3" /> Reschedule
                        </Link>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* DEDICATED BILLS & PAYMENTS SECTION */}
          <div className="bg-white rounded-xl border border-hairline p-6 shadow-soft">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-base font-semibold text-ink flex items-center gap-2">
                  <CreditCard className="h-4 w-4 text-brand" /> My Hospital Bills & Invoices
                </h3>
                <p className="text-xs text-muted mt-0.5">
                  Automated itemized invoices generated after physician consultations. Settle balances securely online.
                </p>
              </div>
              <Link href="/billing" className="text-xs font-semibold text-brand hover:underline">
                Billing Center &rarr;
              </Link>
            </div>

            {patientBills.length === 0 ? (
              <div className="p-6 bg-surface-soft rounded-xl text-center text-xs text-muted">
                No invoices generated yet. Bills are automatically compiled once a consultation is completed.
              </div>
            ) : (
              <div className="space-y-3">
                {patientBills.map((bill) => {
                  const billDate = new Date(bill.createdAt).toLocaleDateString();
                  const totalAmt = Number(bill.totalAmount);
                  const paidAmt = Number(bill.paidAmount);
                  const balance = Math.max(0, totalAmt - paidAmt);
                  const isPaid = bill.status === PaymentStatus.PAID;

                  return (
                    <div
                      key={bill.id}
                      className="p-4 rounded-xl bg-surface-soft border border-hairline flex flex-col md:flex-row md:items-center justify-between gap-4"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span
                            className={`badge-pill text-[10px] font-bold ${
                              isPaid
                                ? '!bg-emerald-100 !text-emerald-800'
                                : bill.status === PaymentStatus.PARTIALLY_PAID
                                ? '!bg-amber-100 !text-amber-800'
                                : '!bg-red-50 !text-semantic-down'
                            }`}
                          >
                            {bill.status}
                          </span>
                          <span className="text-xs text-muted number-mono">
                            Inv #{bill.id.slice(0, 8).toUpperCase()} • {billDate}
                          </span>
                        </div>

                        <div className="text-sm font-semibold text-ink">
                          Consultation with Dr. {bill.appointment?.doctor?.user?.name || 'Physician'}
                        </div>

                        <div className="text-xs text-muted">
                          {bill.items?.items?.length || 1} clinical item(s) itemized
                        </div>
                      </div>

                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <div className="text-sm font-bold text-ink number-mono">
                            {formatCurrency(totalAmt)}
                          </div>
                          {!isPaid && (
                            <div className="text-[11px] font-semibold text-semantic-down number-mono">
                              Due: {formatCurrency(balance)}
                            </div>
                          )}
                        </div>

                        <div className="flex items-center gap-2">
                          {!isPaid && (
                            <button
                              onClick={() => handleOpenPayment(bill)}
                              className="btn-primary !py-1.5 !px-3 !text-xs flex items-center gap-1.5 shadow-sm"
                            >
                              <CreditCard className="h-3.5 w-3.5" /> Pay Online
                            </button>
                          )}

                          <button
                            onClick={() => handleOpenInvoice(bill.id)}
                            className="btn-secondary !py-1.5 !px-3 !text-xs flex items-center gap-1"
                          >
                            <Receipt className="h-3.5 w-3.5 text-brand" /> Invoice
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Recent Prescriptions Issued Widget */}
          <div className="bg-white rounded-xl border border-hairline p-6 shadow-soft">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-semibold text-ink flex items-center gap-2">
                <Pill className="h-4 w-4 text-brand" /> My Digital Prescriptions
              </h3>
              <Link href="/medical-records" className="text-xs font-semibold text-brand hover:underline">
                View All EHR Timeline &rarr;
              </Link>
            </div>

            {recentPrescriptions.length === 0 ? (
              <div className="p-6 bg-surface-soft rounded-xl text-center text-xs text-muted">
                No active prescriptions on file. Prescriptions will appear here following completed doctor consultations.
              </div>
            ) : (
              <div className="space-y-3">
                {recentPrescriptions.map((rx) => (
                  <div
                    key={rx.id}
                    className="p-4 rounded-xl bg-surface-soft border border-hairline flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                  >
                    <div>
                      <div className="text-sm font-semibold text-ink">
                        Diagnosis: {rx.diagnosis}
                      </div>
                      <div className="text-xs text-muted mt-0.5">
                        Issued by Dr. {rx.doctor?.user?.name} on {new Date(rx.createdAt).toLocaleDateString()}
                      </div>
                      <div className="text-xs text-body font-medium mt-1">
                        {Array.isArray(rx.medications) ? `${rx.medications.length} medication(s) prescribed` : ''}
                      </div>
                    </div>

                    <button
                      onClick={() => setSelectedRx(rx)}
                      className="btn-primary !py-1.5 !px-3 !text-xs flex items-center gap-1.5 shrink-0"
                    >
                      <Eye className="h-3.5 w-3.5" /> View Prescription
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right: Quick Actions & Navigation */}
        <div className="space-y-6">
          <div className="bg-white rounded-xl border border-hairline p-6 shadow-soft">
            <h3 className="text-base font-semibold text-ink mb-4">Patient Services</h3>
            <div className="space-y-3">
              <Link
                href="/appointments/book"
                className="p-4 rounded-xl bg-brand text-white flex items-center justify-between transition group hover:bg-brand-active shadow-sm"
              >
                <div className="flex items-center gap-3">
                  <div className="h-9 w-9 rounded-full bg-white/20 text-white flex items-center justify-center">
                    <Calendar className="h-4 w-4" />
                  </div>
                  <div>
                    <div className="text-sm font-semibold">Book Doctor Slot</div>
                    <div className="text-xs text-white/80">Specialist outpatient slots</div>
                  </div>
                </div>
                <ArrowRight className="h-4 w-4 text-white" />
              </Link>

              <Link
                href="/billing"
                className="p-4 rounded-xl bg-surface-soft hover:bg-surface-strong border border-hairline flex items-center justify-between transition group"
              >
                <div className="flex items-center gap-3">
                  <div className="h-9 w-9 rounded-full bg-surface-strong text-ink flex items-center justify-center">
                    <CreditCard className="h-4 w-4 text-brand" />
                  </div>
                  <div>
                    <div className="text-sm font-semibold text-ink group-hover:text-brand">
                      Payments & Billing
                    </div>
                    <div className="text-xs text-muted">View receipts & settle bills</div>
                  </div>
                </div>
                <ArrowRight className="h-4 w-4 text-muted group-hover:text-brand" />
              </Link>

              <Link
                href="/medical-records"
                className="p-4 rounded-xl bg-surface-soft hover:bg-surface-strong border border-hairline flex items-center justify-between transition group"
              >
                <div className="flex items-center gap-3">
                  <div className="h-9 w-9 rounded-full bg-surface-strong text-ink flex items-center justify-center">
                    <FileText className="h-4 w-4 text-brand" />
                  </div>
                  <div>
                    <div className="text-sm font-semibold text-ink group-hover:text-brand">
                      Health Records & Lab Reports
                    </div>
                    <div className="text-xs text-muted">Chronological clinical history</div>
                  </div>
                </div>
                <ArrowRight className="h-4 w-4 text-muted group-hover:text-brand" />
              </Link>
            </div>
          </div>

          {/* Health Profile Card */}
          <div className="bg-white rounded-xl border border-hairline p-6 shadow-soft space-y-3">
            <h3 className="text-sm font-semibold text-ink flex items-center gap-1.5">
              <Activity className="h-4 w-4 text-brand" /> Medical History Notes
            </h3>
            <p className="text-xs text-body bg-surface-soft p-3 rounded-lg border border-hairline leading-relaxed">
              {patientRecord?.medicalHistorySummary ||
                'No chronic medical conditions or known drug allergies are currently registered on file.'}
            </p>
          </div>

          {/* Diagnostic Lab Reports Snippet */}
          {recentReports.length > 0 && (
            <div className="bg-white rounded-xl border border-hairline p-6 shadow-soft space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-ink flex items-center gap-1.5">
                  <FileText className="h-4 w-4 text-brand" /> Recent Lab Reports
                </h3>
                <Link href="/medical-records" className="text-xs text-brand hover:underline">
                  All &rarr;
                </Link>
              </div>
              <div className="space-y-2">
                {recentReports.map((rep) => (
                  <div
                    key={rep.id}
                    className="p-2.5 rounded-lg bg-surface-soft border border-hairline flex items-center justify-between text-xs"
                  >
                    <div>
                      <div className="font-semibold text-ink">{rep.title}</div>
                      <div className="text-[10px] text-muted">{rep.reportType}</div>
                    </div>
                    <Link
                      href="/medical-records"
                      className="text-[11px] font-semibold text-brand hover:underline"
                    >
                      View
                    </Link>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* MODAL 1: View Prescription Modal */}
      <Modal
        isOpen={!!selectedRx}
        onClose={() => setSelectedRx(null)}
        title="Electronic Prescription Record"
        subtitle={`Issued by Dr. ${selectedRx?.doctor?.user?.name || 'Physician'} on ${
          selectedRx?.createdAt ? new Date(selectedRx.createdAt).toLocaleDateString() : ''
        }`}
        maxWidth="lg"
      >
        {selectedRx && (
          <div className="space-y-6 text-sm">
            <div className="p-4 rounded-xl bg-surface-soft border border-hairline space-y-2">
              {selectedRx.symptoms && (
                <div className="text-xs text-body pb-2 border-b border-hairline">
                  <span className="font-semibold text-ink">Recorded Symptoms:</span> {selectedRx.symptoms}
                </div>
              )}
              <div className="text-xs uppercase font-semibold text-muted">Clinical Diagnosis</div>
              <div className="text-base font-semibold text-ink">{selectedRx.diagnosis}</div>
              {selectedRx.notes && (
                <div className="text-xs text-body pt-2 border-t border-hairline">
                  <span className="font-semibold text-ink">Physician Advice:</span> {selectedRx.notes}
                </div>
              )}
              {selectedRx.followUpDate && (
                <div className="text-xs text-brand font-medium pt-1">
                  Follow-up Date:{' '}
                  <span className="font-bold number-mono">
                    {new Date(selectedRx.followUpDate).toLocaleDateString()}
                  </span>
                </div>
              )}
            </div>

            <div>
              <div className="text-xs uppercase font-semibold text-muted mb-2">
                Prescribed Drug Regimen
              </div>
              <div className="space-y-2">
                {Array.isArray(selectedRx.medications) &&
                  selectedRx.medications.map((m: any, mIdx: number) => (
                    <div
                      key={mIdx}
                      className="p-3 rounded-lg border border-hairline bg-surface-soft flex items-center justify-between text-xs"
                    >
                      <div>
                        <div className="font-semibold text-ink">{m.name}</div>
                        <div className="text-muted">
                          {m.dosage} • {m.frequency}
                        </div>
                        {m.instructions && (
                          <div className="text-[11px] text-brand mt-0.5">{m.instructions}</div>
                        )}
                      </div>
                      <span className="px-2.5 py-1 rounded-pill bg-white border border-hairline font-semibold number-mono">
                        {m.duration}
                      </span>
                    </div>
                  ))}
              </div>
            </div>

            <div className="pt-4 border-t border-hairline flex justify-end">
              <button
                onClick={() => setSelectedRx(null)}
                className="btn-secondary !py-2 !px-4 text-xs"
              >
                Close Prescription
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* MODAL 2: Instant Patient Payment Modal */}
      <Modal
        isOpen={isPaymentModalOpen}
        onClose={() => setIsPaymentModalOpen(false)}
        title="Settle Hospital Bill Online"
        subtitle={`Invoice #${selectedBillForPayment?.id?.slice(0, 8).toUpperCase()} • Dr. ${
          selectedBillForPayment?.appointment?.doctor?.user?.name || 'Physician'
        }`}
        maxWidth="md"
      >
        <form onSubmit={handleSubmitPayment} className="space-y-5">
          {paymentError && (
            <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-semantic-down text-xs flex items-center gap-2">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{paymentError}</span>
            </div>
          )}

          <div className="p-4 rounded-xl bg-surface-soft border border-hairline flex justify-between items-center text-xs">
            <div>
              <span className="text-muted">Total Billed:</span>
              <div className="font-bold text-ink text-sm number-mono">
                {formatCurrency(Number(selectedBillForPayment?.totalAmount || 0))}
              </div>
            </div>
            <div>
              <span className="text-muted">Already Paid:</span>
              <div className="font-bold text-emerald-600 number-mono">
                {formatCurrency(Number(selectedBillForPayment?.paidAmount || 0))}
              </div>
            </div>
            <div>
              <span className="text-muted">Remaining Due:</span>
              <div className="font-bold text-semantic-down text-sm number-mono">
                {formatCurrency(
                  Math.max(
                    0,
                    Number(selectedBillForPayment?.totalAmount || 0) -
                      Number(selectedBillForPayment?.paidAmount || 0)
                  )
                )}
              </div>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-ink mb-1.5">
              Payment Method
            </label>
            <div className="grid grid-cols-3 gap-2">
              {(['UPI', 'CARD', 'NET_BANKING'] as PaymentMethod[]).map((m) => (
                <button
                  type="button"
                  key={m}
                  onClick={() => setPayMethod(m)}
                  className={`p-2.5 rounded-xl border text-xs font-semibold transition ${
                    payMethod === m
                      ? 'border-brand bg-blue-50 text-brand'
                      : 'border-hairline bg-surface-soft text-muted hover:text-ink'
                  }`}
                >
                  {m === 'NET_BANKING' ? 'Net Banking' : m}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-ink mb-1.5">
              Payment Amount
            </label>
            <input
              type="number"
              step="0.01"
              required
              value={payAmount}
              onChange={(e) => setPayAmount(e.target.value)}
              className="text-input-md w-full number-mono"
            />
          </div>

          <div className="pt-3 border-t border-hairline flex items-center justify-between">
            <button
              type="button"
              onClick={() => setIsPaymentModalOpen(false)}
              className="btn-secondary !py-2 !px-4 text-xs"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submittingPayment}
              className="btn-primary !py-2 !px-5 text-xs flex items-center gap-1.5"
            >
              <CheckCircle2 className="h-4 w-4" />
              {submittingPayment ? 'Processing Payment...' : `Pay ${formatCurrency(parseFloat(payAmount) || 0)}`}
            </button>
          </div>
        </form>
      </Modal>

      {/* MODAL 3: Detailed Invoice & Receipt Modal */}
      <Modal
        isOpen={isInvoiceModalOpen}
        onClose={() => setIsInvoiceModalOpen(false)}
        title="Hospital Itemized Invoice"
        subtitle={`Invoice #${invoiceBill?.id?.slice(0, 8).toUpperCase()}`}
        maxWidth="lg"
      >
        {loadingInvoice ? (
          <div className="py-12 text-center text-xs text-muted">Retrieving hospital invoice...</div>
        ) : invoiceBill ? (
          <div className="space-y-6 text-xs">
            <div className="p-4 rounded-xl bg-surface-soft border border-hairline flex justify-between items-center">
              <div>
                <div className="text-[10px] uppercase font-bold text-muted">Patient Details</div>
                <div className="text-sm font-bold text-ink">{invoiceBill.patient?.user?.name}</div>
                <div className="text-muted">{invoiceBill.patient?.user?.phone || 'No phone'}</div>
              </div>
              <div className="text-right">
                <div className="text-[10px] uppercase font-bold text-muted">Consulting Physician</div>
                <div className="text-sm font-bold text-ink">
                  Dr. {invoiceBill.appointment?.doctor?.user?.name}
                </div>
                <div className="text-muted">
                  {invoiceBill.appointment?.doctor?.department?.name}
                </div>
              </div>
            </div>

            {/* Line Items */}
            <div>
              <div className="font-semibold text-ink uppercase tracking-wider text-[11px] mb-2">
                Itemized Clinical Services
              </div>
              <div className="border border-hairline rounded-xl overflow-hidden divide-y divide-hairline">
                {Array.isArray(invoiceBill.items?.items) ? (
                  invoiceBill.items.items.map((item: any, idx: number) => (
                    <div key={idx} className="p-3 bg-white flex justify-between items-center">
                      <div>
                        <div className="font-semibold text-ink">{item.title}</div>
                        <div className="text-muted text-[10px]">
                          Category: {item.category} • Qty: {item.quantity}
                        </div>
                      </div>
                      <div className="font-bold text-ink number-mono">
                        {formatCurrency(Number(item.total))}
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="p-3 bg-white flex justify-between items-center">
                    <div>
                      <div className="font-semibold text-ink">Physician Consultation Fee</div>
                    </div>
                    <div className="font-bold text-ink number-mono">
                      {formatCurrency(Number(invoiceBill.totalAmount))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Financial Summary */}
            <div className="p-4 rounded-xl bg-surface-soft border border-hairline space-y-2 text-right">
              <div className="flex justify-between text-muted">
                <span>Subtotal:</span>
                <span className="number-mono">
                  {formatCurrency(Number(invoiceBill.subtotal || invoiceBill.totalAmount))}
                </span>
              </div>
              {Number(invoiceBill.discountAmount) > 0 && (
                <div className="flex justify-between text-emerald-600">
                  <span>Discount:</span>
                  <span className="number-mono">
                    -{formatCurrency(Number(invoiceBill.discountAmount))}
                  </span>
                </div>
              )}
              {Number(invoiceBill.taxAmount) > 0 && (
                <div className="flex justify-between text-muted">
                  <span>Tax:</span>
                  <span className="number-mono">
                    +{formatCurrency(Number(invoiceBill.taxAmount))}
                  </span>
                </div>
              )}
              <div className="flex justify-between text-base font-bold text-ink pt-2 border-t border-hairline">
                <span>Total Amount:</span>
                <span className="number-mono">{formatCurrency(Number(invoiceBill.totalAmount))}</span>
              </div>
              <div className="flex justify-between text-emerald-600 font-semibold">
                <span>Paid Amount:</span>
                <span className="number-mono">{formatCurrency(Number(invoiceBill.paidAmount))}</span>
              </div>
              <div className="flex justify-between text-semantic-down font-bold">
                <span>Balance Due:</span>
                <span className="number-mono">
                  {formatCurrency(
                    Math.max(0, Number(invoiceBill.totalAmount) - Number(invoiceBill.paidAmount))
                  )}
                </span>
              </div>
            </div>

            <div className="pt-2 border-t border-hairline flex justify-end">
              <button
                onClick={() => setIsInvoiceModalOpen(false)}
                className="btn-secondary !py-2 !px-4 text-xs"
              >
                Close
              </button>
            </div>
          </div>
        ) : (
          <div className="py-8 text-center text-xs text-muted">Invoice not found.</div>
        )}
      </Modal>
    </DashboardShell>
  );
}
