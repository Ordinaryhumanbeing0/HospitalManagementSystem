'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Users,
  Building2,
  Stethoscope,
  ShieldCheck,
  Activity,
  UserPlus,
  Plus,
  ArrowRight,
  Clock,
  Shield,
  FileText,
  DollarSign,
  Receipt,
  BarChart3,
  Database,
  Server,
  RefreshCw,
  Calendar,
  Filter,
  Search,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Eye,
  UserCheck,
  UserX,
  CreditCard,
  Phone,
  Mail,
  AlertCircle,
  ChevronRight,
  UserCog,
  TrendingUp,
  LayoutGrid,
  List,
  ArrowRightLeft,
} from 'lucide-react';
import { DashboardShell } from '@/components/ui/DashboardShell';
import { Modal } from '@/components/ui/Modal';
import { getAuthUserAction } from '@/actions/auth';
import { getAdminOperationalMetricsAction } from '@/actions/admin';
import {
  getAppointmentsAction,
  updateAppointmentStatusAction,
  checkInAppointmentAction,
  startConsultationAction,
  markNoShowAction,
  reassignAppointmentAction,
  cancelAppointmentAction,
  rescheduleAppointmentAction,
  getAvailableSlotsAction,
} from '@/actions/appointment';
import {
  getDoctorsAction,
  toggleDoctorActiveAction,
  addDoctorLeaveAction,
  getDoctorLeavesAction,
  deleteDoctorLeaveAction,
} from '@/actions/doctor';
import {
  getPatientsAction,
  getPatientFullDossierAction,
  togglePatientActiveAction,
} from '@/actions/patient';
import { getBillsAction, recordPaymentAction } from '@/actions/billing';
import { getAuditLogsAction } from '@/actions/audit';
import { formatCurrency } from '@/lib/config/currency';
import { SessionUser, AdminOperationalMetrics, SlotInfo } from '@/types';
import { AppointmentStatus, PaymentMethod, PaymentStatus } from '@prisma/client';

export default function AdminDashboardPage() {
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState<SessionUser | null>(null);
  const [activeTab, setActiveTab] = useState<'OPERATIONS' | 'APPOINTMENTS' | 'DOCTORS' | 'PATIENTS' | 'FINANCE' | 'ANALYTICS'>('OPERATIONS');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Metrics Data
  const [metrics, setMetrics] = useState<AdminOperationalMetrics | null>(null);

  // Centralized Appointments State
  const [appointmentsViewMode, setAppointmentsViewMode] = useState<'LIST' | 'CALENDAR'>('LIST');
  const [appointments, setAppointments] = useState<any[]>([]);
  const [apptTotal, setApptTotal] = useState(0);
  const [apptStatusFilter, setApptStatusFilter] = useState('ALL');
  const [apptDoctorFilter, setApptDoctorFilter] = useState('ALL');
  const [apptDateFilter, setApptDateFilter] = useState('');
  const [apptSearch, setApptSearch] = useState('');

  // Doctor Management State
  const [doctorsList, setDoctorsList] = useState<any[]>([]);
  const [selectedDoctorForLeave, setSelectedDoctorForLeave] = useState<any | null>(null);
  const [isLeaveModalOpen, setIsLeaveModalOpen] = useState(false);
  const [doctorLeaves, setDoctorLeaves] = useState<any[]>([]);
  const [newLeaveStart, setNewLeaveStart] = useState('');
  const [newLeaveEnd, setNewLeaveEnd] = useState('');
  const [newLeaveReason, setNewLeaveReason] = useState('');
  const [submittingLeave, setSubmittingLeave] = useState(false);
  const [leaveError, setLeaveError] = useState<string | null>(null);

  // Patient 360° Dossier State
  const [patientsList, setPatientsList] = useState<any[]>([]);
  const [patientSearch, setPatientSearch] = useState('');
  const [selectedPatientDossier, setSelectedPatientDossier] = useState<any | null>(null);
  const [loadingDossier, setLoadingDossier] = useState(false);

  // Invoices & Payment Desk State
  const [billsList, setBillsList] = useState<any[]>([]);
  const [billStatusFilter, setBillStatusFilter] = useState('ALL');
  const [selectedBillForPayment, setSelectedBillForPayment] = useState<any | null>(null);
  const [payAmount, setPayAmount] = useState('');
  const [payMethod, setPayMethod] = useState<PaymentMethod>(PaymentMethod.CASH);
  const [payRef, setPayRef] = useState('');
  const [submittingPay, setSubmittingPay] = useState(false);
  const [payError, setPayError] = useState<string | null>(null);

  // Reassignment Modal State
  const [reassignAppt, setReassignAppt] = useState<any | null>(null);
  const [reassignDoctorId, setReassignDoctorId] = useState('');
  const [reassignReason, setReassignReason] = useState('');
  const [submittingReassign, setSubmittingReassign] = useState(false);
  const [reassignError, setReassignError] = useState<string | null>(null);

  // Audit Logs State
  const [auditLogs, setAuditLogs] = useState<any[]>([]);

  // Load Dashboard Data
  const loadDashboardData = async () => {
    setRefreshing(true);
    const [metricsRes, apptsRes, docsRes, patientsRes, billsRes, logsRes] = await Promise.all([
      getAdminOperationalMetricsAction(),
      getAppointmentsAction({
        status: apptStatusFilter !== 'ALL' ? (apptStatusFilter as any) : undefined,
        doctorId: apptDoctorFilter !== 'ALL' ? apptDoctorFilter : undefined,
        date: apptDateFilter || undefined,
        search: apptSearch || undefined,
        limit: 30,
      }),
      getDoctorsAction({ limit: 50 }),
      getPatientsAction({ query: patientSearch || undefined, limit: 30 }),
      getBillsAction({ status: billStatusFilter !== 'ALL' ? (billStatusFilter as any) : undefined, limit: 30 }),
      getAuditLogsAction({ limit: 10 }),
    ]);

    if (metricsRes.success && metricsRes.data) setMetrics(metricsRes.data);
    if (apptsRes.success && apptsRes.data) {
      setAppointments(apptsRes.data.appointments);
      setApptTotal(apptsRes.data.total);
    }
    if (docsRes.success && docsRes.data) setDoctorsList(docsRes.data.doctors);
    if (patientsRes.success && patientsRes.data) setPatientsList(patientsRes.data.patients);
    if (billsRes.success && billsRes.data) setBillsList(billsRes.data.bills);
    if (logsRes.success && logsRes.data) setAuditLogs(logsRes.data.logs);

    setRefreshing(false);
    setLoading(false);
  };

  useEffect(() => {
    getAuthUserAction().then((res) => {
      if (res.data && res.data.role === 'ADMIN') {
        setCurrentUser(res.data);
        loadDashboardData();
      } else {
        router.push('/login?callbackUrl=/admin/dashboard');
      }
    });
  }, [router]);

  useEffect(() => {
    if (currentUser) {
      getAppointmentsAction({
        status: apptStatusFilter !== 'ALL' ? (apptStatusFilter as any) : undefined,
        doctorId: apptDoctorFilter !== 'ALL' ? apptDoctorFilter : undefined,
        date: apptDateFilter || undefined,
        search: apptSearch || undefined,
        limit: 30,
      }).then((res) => {
        if (res.success && res.data) {
          setAppointments(res.data.appointments);
          setApptTotal(res.data.total);
        }
      });
    }
  }, [apptStatusFilter, apptDoctorFilter, apptDateFilter, apptSearch]);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 5000);
  };

  // Appointment Action Handlers
  const handleCheckIn = async (apptId: string) => {
    const res = await checkInAppointmentAction(apptId);
    if (res.success) {
      showToast('Patient marked as Checked-In (Queued in Waiting Room).');
      loadDashboardData();
    } else {
      showToast(res.message || 'Failed to check-in.');
    }
  };

  const handleStartConsultation = async (apptId: string) => {
    const res = await startConsultationAction(apptId);
    if (res.success) {
      showToast('Consultation started (Status: IN_PROGRESS).');
      loadDashboardData();
    } else {
      showToast(res.message || 'Failed to start consultation.');
    }
  };

  const handleMarkNoShow = async (apptId: string) => {
    if (!confirm('Mark this appointment as No-Show?')) return;
    const res = await markNoShowAction(apptId);
    if (res.success) {
      showToast('Appointment marked as No-Show.');
      loadDashboardData();
    } else {
      showToast(res.message || 'Failed to update status.');
    }
  };

  const handleCancelAppt = async (apptId: string) => {
    const reason = prompt('Please enter cancellation reason:');
    if (reason === null) return;
    const res = await cancelAppointmentAction({ appointmentId: apptId, reason: reason || 'Administrative cancellation' });
    if (res.success) {
      showToast('Appointment cancelled successfully.');
      loadDashboardData();
    } else {
      showToast(res.message || 'Failed to cancel appointment.');
    }
  };

  // Doctor Handlers
  const handleToggleDoctorActive = async (docId: string) => {
    const res = await toggleDoctorActiveAction(docId);
    if (res.success) {
      showToast(res.message || 'Doctor status updated.');
      loadDashboardData();
    } else {
      showToast(res.message || 'Failed to toggle status.');
    }
  };

  const handleOpenDoctorLeaveModal = async (doctor: any) => {
    setSelectedDoctorForLeave(doctor);
    setNewLeaveStart('');
    setNewLeaveEnd('');
    setNewLeaveReason('');
    setLeaveError(null);
    setIsLeaveModalOpen(true);
    const leavesRes = await getDoctorLeavesAction(doctor.id);
    if (leavesRes.success && leavesRes.data) {
      setDoctorLeaves(leavesRes.data);
    }
  };

  const handleSaveDoctorLeave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDoctorForLeave || !newLeaveStart || !newLeaveEnd) {
      setLeaveError('Please provide start date, end date, and reason.');
      return;
    }
    setSubmittingLeave(true);
    setLeaveError(null);

    const res = await addDoctorLeaveAction({
      doctorId: selectedDoctorForLeave.id,
      startDate: newLeaveStart,
      endDate: newLeaveEnd,
      reason: newLeaveReason || 'Personal Leave',
    });

    if (!res.success) {
      setLeaveError(res.message || 'Failed to schedule leave.');
      setSubmittingLeave(false);
      return;
    }

    showToast(`Leave scheduled! ${res.data?.conflictedCount || 0} appointment(s) flagged for rescheduling.`);
    setIsLeaveModalOpen(false);
    setSubmittingLeave(false);
    loadDashboardData();
  };

  const handleDeleteDoctorLeave = async (leaveId: string) => {
    if (!confirm('Remove this leave record?')) return;
    const res = await deleteDoctorLeaveAction(leaveId);
    if (res.success) {
      showToast('Leave removed successfully.');
      if (selectedDoctorForLeave) {
        const leavesRes = await getDoctorLeavesAction(selectedDoctorForLeave.id);
        if (leavesRes.success && leavesRes.data) setDoctorLeaves(leavesRes.data);
      }
      loadDashboardData();
    }
  };

  // Patient 360° Dossier Handler
  const handleOpenPatientDossier = async (patientId: string) => {
    setLoadingDossier(true);
    const res = await getPatientFullDossierAction(patientId);
    if (res.success && res.data) {
      setSelectedPatientDossier(res.data);
    }
    setLoadingDossier(false);
  };

  const handleTogglePatientActive = async (patientId: string) => {
    const res = await togglePatientActiveAction(patientId);
    if (res.success) {
      showToast(res.message || 'Patient status updated.');
      if (selectedPatientDossier?.id === patientId) {
        setSelectedPatientDossier((prev: any) => ({
          ...prev,
          user: { ...prev.user, isActive: res.data?.isActive },
        }));
      }
      loadDashboardData();
    }
  };

  // Reassignment Submission
  const handleSubmitReassign = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reassignAppt || !reassignDoctorId) {
      setReassignError('Please select a target physician.');
      return;
    }
    setSubmittingReassign(true);
    setReassignError(null);

    const res = await reassignAppointmentAction({
      appointmentId: reassignAppt.id,
      newDoctorId: reassignDoctorId,
      reason: reassignReason || 'Doctor unavailable / administrative load balancing',
    });

    if (!res.success) {
      setReassignError(res.message || 'Failed to reassign appointment.');
      setSubmittingReassign(false);
      return;
    }

    showToast('Appointment successfully reassigned to new physician.');
    setReassignAppt(null);
    setSubmittingReassign(false);
    loadDashboardData();
  };

  // Payment Recording
  const handleOpenRecordPayment = (bill: any) => {
    setSelectedBillForPayment(bill);
    const remaining = Math.max(0, Number(bill.totalAmount) - Number(bill.paidAmount));
    setPayAmount(remaining.toFixed(2));
    setPayMethod(PaymentMethod.CASH);
    setPayRef(`RCPT-${Date.now().toString().slice(-6)}`);
    setPayError(null);
  };

  const handleSubmitRecordPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedBillForPayment) return;
    const amt = parseFloat(payAmount);
    if (isNaN(amt) || amt <= 0) {
      setPayError('Please enter a valid amount.');
      return;
    }
    setSubmittingPay(true);
    setPayError(null);

    const res = await recordPaymentAction({
      billId: selectedBillForPayment.id,
      amount: amt,
      method: payMethod,
      transactionRef: payRef,
    });

    if (!res.success) {
      setPayError(res.message || 'Failed to record payment.');
      setSubmittingPay(false);
      return;
    }

    showToast(`Payment of ${formatCurrency(amt)} recorded successfully!`);
    setSelectedBillForPayment(null);
    setSubmittingPay(false);
    loadDashboardData();
  };

  if (!currentUser || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white text-body text-sm">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 rounded-full border-2 border-brand border-t-transparent animate-spin" />
          <span>Authenticating operational command center...</span>
        </div>
      </div>
    );
  }

  // Quick calculations for "Quick Answers"
  const availableDoctorsNow = metrics?.doctorWorkload?.filter((d) => d.isActive && !d.isOnLeaveToday) || [];
  const busiestDoctorToday = [...(metrics?.doctorWorkload || [])].sort((a, b) => b.todayAppointments - a.todayAppointments)[0];
  const doctorsOnLeaveList = metrics?.doctorWorkload?.filter((d) => d.isOnLeaveToday) || [];

  return (
    <DashboardShell
      user={currentUser}
      title="Hospital Operational Control Center"
      subtitle="Real-time clinical queue mediator, multi-physician workload balancer, patient records dossier, and financial ledger."
      badge="Administrative Master Workstation"
      actionButton={
        <div className="flex items-center gap-2">
          <button
            onClick={loadDashboardData}
            disabled={refreshing}
            className="btn-secondary text-xs flex items-center gap-1.5 !py-2 !px-3"
            title="Refresh All Database Streams"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? 'animate-spin' : ''}`} />
            <span>Sync Live DB</span>
          </button>
          <Link href="/appointments/book" className="btn-primary text-xs flex items-center gap-1.5 !py-2 !px-3">
            <Plus className="h-3.5 w-3.5" /> Book Walk-In
          </Link>
        </div>
      }
    >
      {/* Toast Alert */}
      {toastMessage && (
        <div className="mb-6 p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm flex items-center gap-2 animate-in fade-in">
          <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0" />
          <span className="font-medium">{toastMessage}</span>
        </div>
      )}

      {/* Doctor Leave Conflict Alert Banner */}
      {metrics?.leaveConflictedAppointments && metrics.leaveConflictedAppointments.length > 0 && (
        <div className="mb-8 p-5 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 shadow-sm animate-in fade-in">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <div className="font-bold text-sm">
                  Schedule Conflict Detected: {metrics.leaveConflictedAppointments.length} Patient Appointment(s) during Physician Leave
                </div>
                <div className="text-xs text-amber-800 mt-0.5">
                  Dr. {metrics.leaveConflictedAppointments[0].doctorName} has leave scheduled on{' '}
                  <span className="font-semibold">{metrics.leaveConflictedAppointments[0].appointmentDate}</span> (Reason: {metrics.leaveConflictedAppointments[0].leaveReason || 'Leave'}). Reassign to an available colleague to prevent patient delays.
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={() => {
                  const target = appointments.find((a) => a.id === metrics.leaveConflictedAppointments[0].appointmentId);
                  if (target) {
                    setReassignAppt(target);
                    setReassignDoctorId('');
                    setReassignReason('Physician on scheduled leave');
                  } else {
                    setActiveTab('APPOINTMENTS');
                  }
                }}
                className="px-3.5 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold shadow-sm transition flex items-center gap-1.5"
              >
                <ArrowRightLeft className="h-3.5 w-3.5" /> Resolve & Reassign Now
              </button>
              <button
                onClick={() => setActiveTab('APPOINTMENTS')}
                className="px-3 py-1.5 rounded-lg bg-white border border-amber-300 text-amber-800 hover:bg-amber-100 text-xs font-semibold transition"
              >
                View in Queue
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Operational Master KPI Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
        {/* Metric 1: Patients */}
        <div className="card-institutional !p-4">
          <div className="flex items-center justify-between text-muted text-xs font-semibold uppercase">
            <span>Patients</span>
            <Users className="h-4 w-4 text-brand" />
          </div>
          <div className="text-2xl font-bold text-ink number-mono mt-2">{metrics?.totalPatients ?? 0}</div>
          <div className="text-[11px] text-emerald-600 font-medium mt-1">
            {metrics?.activePatients ?? 0} Active EMRs
          </div>
        </div>

        {/* Metric 2: Doctors Active / On Duty */}
        <div className="card-institutional !p-4">
          <div className="flex items-center justify-between text-muted text-xs font-semibold uppercase">
            <span>Doctors</span>
            <Stethoscope className="h-4 w-4 text-sky-600" />
          </div>
          <div className="text-2xl font-bold text-ink number-mono mt-2">{metrics?.totalDoctors ?? 0}</div>
          <div className="text-[11px] text-body font-medium mt-1 flex items-center gap-1.5">
            <span className="text-emerald-600 font-bold">{metrics?.doctorsAvailableToday ?? 0} On Duty</span>
            {metrics?.doctorsOnLeave ? (
              <span className="text-amber-600 font-semibold">• {metrics.doctorsOnLeave} Leave</span>
            ) : null}
          </div>
        </div>

        {/* Metric 3: Today's Appointments */}
        <div className="card-institutional !p-4">
          <div className="flex items-center justify-between text-muted text-xs font-semibold uppercase">
            <span>Today Visits</span>
            <Calendar className="h-4 w-4 text-purple-600" />
          </div>
          <div className="text-2xl font-bold text-ink number-mono mt-2">{metrics?.todayAppointmentsCount ?? 0}</div>
          <div className="text-[11px] text-purple-700 font-medium mt-1">
            {metrics?.todayCompletedCount ?? 0} Done • {metrics?.todayPendingCount ?? 0} In Queue
          </div>
        </div>

        {/* Metric 4: Upcoming Bookings */}
        <div className="card-institutional !p-4">
          <div className="flex items-center justify-between text-muted text-xs font-semibold uppercase">
            <span>Upcoming</span>
            <Clock className="h-4 w-4 text-indigo-600" />
          </div>
          <div className="text-2xl font-bold text-ink number-mono mt-2">{metrics?.upcomingAppointmentsCount ?? 0}</div>
          <div className="text-[11px] text-muted font-medium mt-1">Future Confirmed Slots</div>
        </div>

        {/* Metric 5: Today's Revenue */}
        <div className="card-institutional !p-4">
          <div className="flex items-center justify-between text-muted text-xs font-semibold uppercase">
            <span>Today Income</span>
            <DollarSign className="h-4 w-4 text-emerald-600" />
          </div>
          <div className="text-2xl font-bold text-emerald-600 number-mono mt-2">
            {formatCurrency(metrics?.todayRevenue ?? 0)}
          </div>
          <div className="text-[11px] text-muted font-medium mt-1">Total: {formatCurrency(metrics?.totalRevenue ?? 0)}</div>
        </div>

        {/* Metric 6: Outstanding Invoices */}
        <div className="card-institutional !p-4">
          <div className="flex items-center justify-between text-muted text-xs font-semibold uppercase">
            <span>Receivables</span>
            <Receipt className="h-4 w-4 text-amber-600" />
          </div>
          <div className="text-2xl font-bold text-amber-600 number-mono mt-2">
            {formatCurrency(metrics?.pendingBillsAmount ?? 0)}
          </div>
          <div className="text-[11px] text-amber-700 font-medium mt-1">{metrics?.pendingBillsCount ?? 0} Unpaid Invoices</div>
        </div>
      </div>

      {/* Primary Operational Navigation Tabs */}
      <div className="flex items-center gap-1 border-b border-hairline mb-8 overflow-x-auto">
        <button
          onClick={() => setActiveTab('OPERATIONS')}
          className={`px-4 py-3 text-xs font-semibold border-b-2 transition flex items-center gap-2 whitespace-nowrap ${
            activeTab === 'OPERATIONS'
              ? 'border-brand text-brand'
              : 'border-transparent text-body hover:text-ink'
          }`}
        >
          <Activity className="h-4 w-4" /> Operational Command & Quick Answers
        </button>

        <button
          onClick={() => setActiveTab('APPOINTMENTS')}
          className={`px-4 py-3 text-xs font-semibold border-b-2 transition flex items-center gap-2 whitespace-nowrap ${
            activeTab === 'APPOINTMENTS'
              ? 'border-brand text-brand'
              : 'border-transparent text-body hover:text-ink'
          }`}
        >
          <Calendar className="h-4 w-4" /> Centralized Appointments ({apptTotal})
        </button>

        <button
          onClick={() => setActiveTab('DOCTORS')}
          className={`px-4 py-3 text-xs font-semibold border-b-2 transition flex items-center gap-2 whitespace-nowrap ${
            activeTab === 'DOCTORS'
              ? 'border-brand text-brand'
              : 'border-transparent text-body hover:text-ink'
          }`}
        >
          <Stethoscope className="h-4 w-4" /> Doctor Operations & Workload ({doctorsList.length})
        </button>

        <button
          onClick={() => setActiveTab('PATIENTS')}
          className={`px-4 py-3 text-xs font-semibold border-b-2 transition flex items-center gap-2 whitespace-nowrap ${
            activeTab === 'PATIENTS'
              ? 'border-brand text-brand'
              : 'border-transparent text-body hover:text-ink'
          }`}
        >
          <Users className="h-4 w-4" /> Patient Central & 360° Dossier
        </button>

        <button
          onClick={() => setActiveTab('FINANCE')}
          className={`px-4 py-3 text-xs font-semibold border-b-2 transition flex items-center gap-2 whitespace-nowrap ${
            activeTab === 'FINANCE'
              ? 'border-brand text-brand'
              : 'border-transparent text-body hover:text-ink'
          }`}
        >
          <Receipt className="h-4 w-4" /> Billing & Invoicing Desk
        </button>

        <button
          onClick={() => setActiveTab('ANALYTICS')}
          className={`px-4 py-3 text-xs font-semibold border-b-2 transition flex items-center gap-2 whitespace-nowrap ${
            activeTab === 'ANALYTICS'
              ? 'border-brand text-brand'
              : 'border-transparent text-body hover:text-ink'
          }`}
        >
          <BarChart3 className="h-4 w-4" /> Live Analytics & Audit Logs
        </button>
      </div>

      {/* TAB 1: OPERATIONS & QUICK ANSWERS */}
      {activeTab === 'OPERATIONS' && (
        <div className="space-y-8">
          {/* Quick Answers Cards (Section 4 requirements) */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="bg-white rounded-xl border border-hairline p-5 shadow-soft">
              <div className="text-xs uppercase font-semibold text-muted flex items-center gap-1.5">
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" /> Which doctors are available now?
              </div>
              <div className="mt-3 space-y-1.5">
                {availableDoctorsNow.length === 0 ? (
                  <div className="text-xs text-muted">No doctors on active shift right now.</div>
                ) : (
                  availableDoctorsNow.map((doc) => (
                    <div key={doc.doctorId} className="flex items-center justify-between text-xs py-1 border-b border-hairline last:border-none">
                      <span className="font-semibold text-ink">{doc.doctorName}</span>
                      <span className="text-[11px] px-2 py-0.5 rounded-pill bg-emerald-50 text-emerald-700 font-bold">
                        {doc.departmentName}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="bg-white rounded-xl border border-hairline p-5 shadow-soft">
              <div className="text-xs uppercase font-semibold text-muted flex items-center gap-1.5">
                <TrendingUp className="h-3.5 w-3.5 text-purple-600" /> Busiest doctor today?
              </div>
              <div className="mt-3">
                {busiestDoctorToday ? (
                  <div>
                    <div className="text-base font-bold text-ink">{busiestDoctorToday.doctorName}</div>
                    <div className="text-xs text-purple-700 font-medium mt-0.5">
                      {busiestDoctorToday.todayAppointments} scheduled appointment(s) today
                    </div>
                    <div className="text-[11px] text-muted mt-2">
                      Department: {busiestDoctorToday.departmentName} • Total handled: {busiestDoctorToday.completedTotal}
                    </div>
                  </div>
                ) : (
                  <div className="text-xs text-muted">No consultations scheduled today yet.</div>
                )}
              </div>
            </div>

            <div className="bg-white rounded-xl border border-hairline p-5 shadow-soft">
              <div className="text-xs uppercase font-semibold text-muted flex items-center gap-1.5">
                <AlertCircle className="h-3.5 w-3.5 text-amber-600" /> Doctors currently on leave?
              </div>
              <div className="mt-3 space-y-1.5">
                {doctorsOnLeaveList.length === 0 ? (
                  <div className="text-xs text-emerald-600 font-medium">All clinical physicians are active (0 on leave today).</div>
                ) : (
                  doctorsOnLeaveList.map((doc) => (
                    <div key={doc.doctorId} className="flex items-center justify-between text-xs py-1 border-b border-hairline last:border-none">
                      <span className="font-semibold text-amber-900">{doc.doctorName}</span>
                      <span className="text-[11px] px-2 py-0.5 rounded-pill bg-amber-50 text-amber-700 font-bold">
                        On Leave
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="bg-white rounded-xl border border-hairline p-5 shadow-soft">
              <div className="text-xs uppercase font-semibold text-muted flex items-center gap-1.5">
                <Receipt className="h-3.5 w-3.5 text-emerald-600" /> Financial Settlement Rate
              </div>
              <div className="mt-3">
                <div className="text-2xl font-bold text-ink number-mono">
                  {metrics?.totalRevenue && metrics?.totalRevenue + (metrics?.pendingBillsAmount || 0) > 0
                    ? `${Math.round((metrics.totalRevenue / (metrics.totalRevenue + metrics.pendingBillsAmount)) * 100)}%`
                    : '100%'}
                </div>
                <div className="text-xs text-muted mt-1">
                  Collected {formatCurrency(metrics?.totalRevenue ?? 0)} of{' '}
                  {formatCurrency((metrics?.totalRevenue ?? 0) + (metrics?.pendingBillsAmount ?? 0))} billed
                </div>
              </div>
            </div>
          </div>

          {/* Today's Active Clinical Queue */}
          <div className="bg-white rounded-xl border border-hairline overflow-hidden shadow-soft">
            <div className="p-6 border-b border-hairline flex items-center justify-between">
              <div>
                <h3 className="text-base font-semibold text-ink flex items-center gap-2">
                  <Activity className="h-4 w-4 text-brand" /> Today's Live Clinical Queue
                </h3>
                <p className="text-xs text-muted mt-0.5">Real-time status changes propagate across patient and doctor screens.</p>
              </div>
              <button
                onClick={() => setActiveTab('APPOINTMENTS')}
                className="text-xs font-semibold text-brand hover:underline flex items-center gap-1"
              >
                Open Full Appointments Hub &rarr;
              </button>
            </div>

            <div className="divide-y divide-hairline">
              {appointments.filter((a) => {
                const aDate = new Date(a.appointmentDate).toISOString().split('T')[0];
                const nowStr = new Date().toISOString().split('T')[0];
                return aDate === nowStr;
              }).length === 0 ? (
                <div className="p-8 text-center text-xs text-muted">
                  No appointments scheduled for today's active date. Check upcoming appointments in the Appointments Hub.
                </div>
              ) : (
                appointments
                  .filter((a) => new Date(a.appointmentDate).toISOString().split('T')[0] === new Date().toISOString().split('T')[0])
                  .map((appt) => (
                    <div key={appt.id} className="p-4 sm:p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:bg-surface-soft/60 transition">
                      <div className="flex items-start gap-3">
                        <div className="h-9 w-9 rounded-full bg-surface-strong text-ink font-bold flex items-center justify-center text-xs shrink-0 mt-0.5">
                          {appt.timeSlot}
                        </div>
                        <div>
                          <div className="text-sm font-semibold text-ink flex items-center gap-2">
                            <span>{appt.patient?.user?.name}</span>
                            <span className="text-xs text-muted font-normal">• Dr. {appt.doctor?.user?.name} ({appt.doctor?.department?.name})</span>
                          </div>
                          <div className="text-xs text-muted mt-0.5">
                            Reason: {appt.reason || 'Routine consultation'}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={`px-2.5 py-1 rounded-pill text-xs font-semibold uppercase tracking-wider ${
                          appt.status === 'CHECKED_IN'
                            ? 'bg-amber-50 text-amber-700 border border-amber-200'
                            : appt.status === 'IN_PROGRESS'
                            ? 'bg-purple-50 text-purple-700 border border-purple-200'
                            : appt.status === 'COMPLETED'
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : appt.status === 'CONFIRMED'
                            ? 'bg-blue-50 text-blue-700 border border-blue-200'
                            : 'bg-surface-strong text-muted'
                        }`}>
                          {appt.status.replace('_', ' ')}
                        </span>

                        {appt.status === 'CONFIRMED' && (
                          <button
                            onClick={() => handleCheckIn(appt.id)}
                            className="btn-secondary !py-1 !px-2.5 !text-xs font-semibold"
                            title="Patient arrived at front desk"
                          >
                            Check In
                          </button>
                        )}

                        {appt.status === 'CHECKED_IN' && (
                          <button
                            onClick={() => handleStartConsultation(appt.id)}
                            className="px-2.5 py-1 rounded-lg bg-purple-600 hover:bg-purple-700 text-white text-xs font-semibold transition"
                            title="Call patient into examination room"
                          >
                            Start Consultation
                          </button>
                        )}

                        <button
                          onClick={() => {
                            setReassignAppt(appt);
                            setReassignDoctorId('');
                            setReassignReason('');
                          }}
                          className="btn-secondary !py-1 !px-2.5 !text-xs"
                          title="Reassign to another physician"
                        >
                          <ArrowRightLeft className="h-3 w-3" /> Reassign
                        </button>
                      </div>
                    </div>
                  ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: CENTRALIZED APPOINTMENTS (CALENDAR + LIST VIEW) */}
      {activeTab === 'APPOINTMENTS' && (
        <div className="space-y-6">
          {/* Controls & Filter Bar */}
          <div className="bg-white rounded-xl border border-hairline p-5 shadow-soft space-y-4">
            <div className="flex flex-col md:flex-row items-center justify-between gap-4">
              {/* Search Box */}
              <div className="relative flex-1 w-full">
                <Search className="h-4 w-4 text-muted absolute left-3.5 top-3 pointer-events-none" />
                <input
                  type="text"
                  value={apptSearch}
                  onChange={(e) => setApptSearch(e.target.value)}
                  placeholder="Search by Patient, Doctor, Department, Reason..."
                  className="search-pill w-full pl-10 !text-xs"
                />
              </div>

              {/* View Mode Toggle */}
              <div className="flex items-center gap-1 p-1 bg-surface-soft rounded-lg border border-hairline shrink-0">
                <button
                  onClick={() => setAppointmentsViewMode('LIST')}
                  className={`px-3 py-1.5 rounded text-xs font-semibold flex items-center gap-1.5 transition ${
                    appointmentsViewMode === 'LIST' ? 'bg-white shadow-sm text-ink' : 'text-body hover:text-ink'
                  }`}
                >
                  <List className="h-3.5 w-3.5" /> List View
                </button>
                <button
                  onClick={() => setAppointmentsViewMode('CALENDAR')}
                  className={`px-3 py-1.5 rounded text-xs font-semibold flex items-center gap-1.5 transition ${
                    appointmentsViewMode === 'CALENDAR' ? 'bg-white shadow-sm text-ink' : 'text-body hover:text-ink'
                  }`}
                >
                  <Calendar className="h-3.5 w-3.5" /> Calendar View
                </button>
              </div>
            </div>

            {/* Filter Dropdowns */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 border-t border-hairline">
              <select
                value={apptStatusFilter}
                onChange={(e) => setApptStatusFilter(e.target.value)}
                className="search-pill bg-white border border-hairline text-xs font-semibold"
              >
                <option value="ALL">All Statuses ({apptTotal})</option>
                <option value="CONFIRMED">Confirmed</option>
                <option value="CHECKED_IN">Checked-In (Waiting)</option>
                <option value="IN_PROGRESS">In Progress (Exam Room)</option>
                <option value="COMPLETED">Completed</option>
                <option value="CANCELLED">Cancelled</option>
                <option value="NO_SHOW">No Show</option>
              </select>

              <select
                value={apptDoctorFilter}
                onChange={(e) => setApptDoctorFilter(e.target.value)}
                className="search-pill bg-white border border-hairline text-xs font-semibold"
              >
                <option value="ALL">All Doctors</option>
                {doctorsList.map((d) => (
                  <option key={d.id} value={d.id}>
                    Dr. {d.user.name} ({d.department.name})
                  </option>
                ))}
              </select>

              <input
                type="date"
                value={apptDateFilter}
                onChange={(e) => setApptDateFilter(e.target.value)}
                className="search-pill bg-white border border-hairline text-xs font-semibold"
                placeholder="Filter by Date"
              />
            </div>
          </div>

          {/* View Mode: CALENDAR VIEW */}
          {appointmentsViewMode === 'CALENDAR' && (
            <div className="bg-white rounded-xl border border-hairline p-6 shadow-soft">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h3 className="text-base font-semibold text-ink">Physician Clinical Schedules & Slots</h3>
                  <p className="text-xs text-muted">Daily distribution of patient slots across specialist doctors.</p>
                </div>
                <div className="text-xs text-brand font-semibold number-mono">
                  {apptDateFilter || new Date().toISOString().split('T')[0]}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {doctorsList.map((doc) => {
                  const docAppts = appointments.filter((a) => a.doctorId === doc.id);
                  return (
                    <div key={doc.id} className="rounded-xl border border-hairline bg-surface-soft/40 p-4 space-y-3">
                      <div className="flex items-center justify-between pb-3 border-b border-hairline">
                        <div>
                          <div className="font-semibold text-ink text-sm">Dr. {doc.user.name}</div>
                          <div className="text-[11px] text-muted">{doc.department.name}</div>
                        </div>
                        <span className={`text-[10px] px-2 py-0.5 rounded-pill font-bold ${
                          doc.isActive ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'
                        }`}>
                          {doc.isActive ? 'ACTIVE' : 'INACTIVE'}
                        </span>
                      </div>

                      {docAppts.length === 0 ? (
                        <div className="py-6 text-center text-xs text-muted">No appointments booked.</div>
                      ) : (
                        <div className="space-y-2">
                          {docAppts.map((appt) => (
                            <div key={appt.id} className="p-2.5 rounded-lg bg-white border border-hairline shadow-2xs text-xs space-y-1">
                              <div className="flex items-center justify-between font-semibold">
                                <span className="text-brand number-mono">{appt.timeSlot}</span>
                                <span className={`text-[9px] uppercase px-1.5 py-0.2 rounded font-bold ${
                                  appt.status === 'COMPLETED' ? 'bg-emerald-100 text-emerald-800' :
                                  appt.status === 'IN_PROGRESS' ? 'bg-purple-100 text-purple-800' :
                                  appt.status === 'CHECKED_IN' ? 'bg-amber-100 text-amber-800' : 'bg-blue-100 text-blue-800'
                                }`}>
                                  {appt.status.replace('_', ' ')}
                                </span>
                              </div>
                              <div className="font-medium text-ink truncate">{appt.patient?.user?.name}</div>
                              {appt.reason && <div className="text-[11px] text-muted truncate">{appt.reason}</div>}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* View Mode: LIST VIEW */}
          {appointmentsViewMode === 'LIST' && (
            <div className="bg-white rounded-xl border border-hairline overflow-hidden shadow-soft">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-surface-soft border-b border-hairline text-xs uppercase font-semibold text-muted tracking-wider">
                    <tr>
                      <th className="px-6 py-4">Patient</th>
                      <th className="px-6 py-4">Physician & Dept</th>
                      <th className="px-6 py-4">Date & Slot</th>
                      <th className="px-6 py-4">Status</th>
                      <th className="px-6 py-4">Billing & Rx</th>
                      <th className="px-6 py-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-hairline">
                    {appointments.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="px-6 py-8 text-center text-xs text-muted">
                          No appointments found for the specified filters.
                        </td>
                      </tr>
                    ) : (
                      appointments.map((appt) => {
                        const dateStr = new Date(appt.appointmentDate).toISOString().split('T')[0];
                        return (
                          <tr key={appt.id} className="hover:bg-surface-soft/60 transition">
                            <td className="px-6 py-4">
                              <div className="font-semibold text-ink">{appt.patient?.user?.name}</div>
                              <div className="text-xs text-muted flex items-center gap-1 mt-0.5">
                                <Phone className="h-3 w-3" /> {appt.patient?.user?.phone || 'No phone'}
                              </div>
                            </td>

                            <td className="px-6 py-4">
                              <div className="font-semibold text-ink">Dr. {appt.doctor?.user?.name}</div>
                              <div className="text-xs text-muted">{appt.doctor?.department?.name}</div>
                            </td>

                            <td className="px-6 py-4">
                              <div className="text-brand font-medium number-mono">{dateStr}</div>
                              <div className="text-xs text-muted number-mono">{appt.timeSlot}</div>
                            </td>

                            <td className="px-6 py-4">
                              <span className={`px-2.5 py-1 rounded-pill text-[11px] font-bold uppercase tracking-wider ${
                                appt.status === 'COMPLETED' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' :
                                appt.status === 'IN_PROGRESS' ? 'bg-purple-50 text-purple-700 border border-purple-200' :
                                appt.status === 'CHECKED_IN' ? 'bg-amber-50 text-amber-700 border border-amber-200' :
                                appt.status === 'CANCELLED' ? 'bg-red-50 text-red-700 border border-red-200' :
                                appt.status === 'NO_SHOW' ? 'bg-gray-100 text-gray-700 border border-gray-200' :
                                'bg-blue-50 text-blue-700 border border-blue-200'
                              }`}>
                                {appt.status.replace('_', ' ')}
                              </span>
                            </td>

                            <td className="px-6 py-4 text-xs">
                              {appt.bill ? (
                                <span className={`px-2 py-0.5 rounded font-semibold ${
                                  appt.bill.status === 'PAID' ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'
                                }`}>
                                  Bill {formatCurrency(appt.bill.totalAmount)} ({appt.bill.status})
                                </span>
                              ) : (
                                <span className="text-muted text-xs">Pending consult</span>
                              )}
                            </td>

                            <td className="px-6 py-4 text-right">
                              <div className="inline-flex items-center gap-1.5">
                                {appt.status === 'CONFIRMED' && (
                                  <button
                                    onClick={() => handleCheckIn(appt.id)}
                                    className="btn-secondary !py-1 !px-2.5 !text-xs font-semibold"
                                  >
                                    Check In
                                  </button>
                                )}
                                {appt.status === 'CHECKED_IN' && (
                                  <button
                                    onClick={() => handleStartConsultation(appt.id)}
                                    className="px-2.5 py-1 rounded bg-purple-600 text-white text-xs font-semibold hover:bg-purple-700 transition"
                                  >
                                    Start
                                  </button>
                                )}
                                {appt.status !== 'COMPLETED' && appt.status !== 'CANCELLED' && (
                                  <>
                                    <button
                                      onClick={() => {
                                        setReassignAppt(appt);
                                        setReassignDoctorId('');
                                        setReassignReason('');
                                      }}
                                      className="btn-secondary !py-1 !px-2 !text-xs"
                                      title="Reassign to another doctor"
                                    >
                                      <ArrowRightLeft className="h-3 w-3" />
                                    </button>
                                    <button
                                      onClick={() => handleCancelAppt(appt.id)}
                                      className="p-1.5 rounded hover:bg-red-50 text-muted hover:text-red-600 transition"
                                      title="Cancel Appointment"
                                    >
                                      <XCircle className="h-4 w-4" />
                                    </button>
                                  </>
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 3: DOCTOR OPERATIONS & WORKLOAD */}
      {activeTab === 'DOCTORS' && (
        <div className="space-y-6">
          <div className="bg-white rounded-xl border border-hairline p-6 shadow-soft">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-base font-semibold text-ink">Clinical Staff Directory & Workload Metrics</h3>
                <p className="text-xs text-muted">Manage active status, leave dates, weekly shifts, and revenue generated.</p>
              </div>
              <Link href="/doctors" className="btn-primary text-xs flex items-center gap-1.5 !py-2 !px-3">
                <Plus className="h-3.5 w-3.5" /> Add Specialist
              </Link>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-surface-soft border-b border-hairline text-xs uppercase font-semibold text-muted tracking-wider">
                  <tr>
                    <th className="px-6 py-4">Physician</th>
                    <th className="px-6 py-4">Department & Fee</th>
                    <th className="px-6 py-4">Availability Today</th>
                    <th className="px-6 py-4">Today Visits</th>
                    <th className="px-6 py-4">Total Handled</th>
                    <th className="px-6 py-4">Revenue Generated</th>
                    <th className="px-6 py-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-hairline">
                  {metrics?.doctorWorkload?.map((doc) => (
                    <tr key={doc.doctorId} className="hover:bg-surface-soft/60 transition">
                      <td className="px-6 py-4">
                        <div className="font-semibold text-ink flex items-center gap-2">
                          <span>{doc.doctorName}</span>
                          <span className={`text-[9px] uppercase px-1.5 py-0.2 rounded font-bold ${
                            doc.isActive ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'
                          }`}>
                            {doc.isActive ? 'ACTIVE' : 'INACTIVE'}
                          </span>
                        </div>
                        <div className="text-xs text-muted mt-0.5">{doc.specialization}</div>
                      </td>

                      <td className="px-6 py-4">
                        <div className="font-semibold text-ink">{doc.departmentName}</div>
                      </td>

                      <td className="px-6 py-4">
                        {doc.isOnLeaveToday ? (
                          <span className="px-2.5 py-1 rounded-pill bg-amber-50 text-amber-800 text-xs font-semibold flex items-center gap-1 w-fit">
                            <AlertCircle className="h-3.5 w-3.5 text-amber-600" /> On Leave Today
                          </span>
                        ) : doc.isActive ? (
                          <span className="px-2.5 py-1 rounded-pill bg-emerald-50 text-emerald-700 text-xs font-semibold flex items-center gap-1 w-fit">
                            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" /> On Duty
                          </span>
                        ) : (
                          <span className="px-2.5 py-1 rounded-pill bg-gray-100 text-gray-700 text-xs font-semibold">
                            Inactive
                          </span>
                        )}
                      </td>

                      <td className="px-6 py-4">
                        <span className="font-bold number-mono text-ink">{doc.todayAppointments}</span>
                        <span className="text-xs text-muted"> visits</span>
                      </td>

                      <td className="px-6 py-4">
                        <span className="font-bold number-mono text-ink">{doc.completedTotal}</span>
                        <span className="text-xs text-muted"> completed</span>
                      </td>

                      <td className="px-6 py-4">
                        <span className="font-bold number-mono text-emerald-600">
                          {formatCurrency(doc.revenueTotal)}
                        </span>
                      </td>

                      <td className="px-6 py-4 text-right">
                        <div className="inline-flex items-center gap-2">
                          <button
                            onClick={() => {
                              const found = doctorsList.find((d) => d.id === doc.doctorId);
                              if (found) handleOpenDoctorLeaveModal(found);
                            }}
                            className="btn-secondary !py-1 !px-2.5 !text-xs"
                            title="Manage Vacation & Leave Schedule"
                          >
                            <Calendar className="h-3.5 w-3.5 mr-1" /> Leave
                          </button>

                          <button
                            onClick={() => handleToggleDoctorActive(doc.doctorId)}
                            className={`p-1.5 rounded transition ${
                              doc.isActive ? 'hover:bg-red-50 text-muted hover:text-red-600' : 'hover:bg-emerald-50 text-muted hover:text-emerald-600'
                            }`}
                            title={doc.isActive ? 'Deactivate Doctor' : 'Reactivate Doctor'}
                          >
                            {doc.isActive ? <UserX className="h-4 w-4" /> : <UserCheck className="h-4 w-4" />}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: PATIENT CENTRAL & 360° DOSSIER */}
      {activeTab === 'PATIENTS' && (
        <div className="space-y-6">
          <div className="bg-white rounded-xl border border-hairline p-6 shadow-soft">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mb-6">
              <div>
                <h3 className="text-base font-semibold text-ink">Patient Electronic Records Directory</h3>
                <p className="text-xs text-muted">Click any patient to open their comprehensive 360° healthcare dossier.</p>
              </div>
              <div className="w-full sm:w-72 relative">
                <Search className="h-4 w-4 text-muted absolute left-3.5 top-3 pointer-events-none" />
                <input
                  type="text"
                  value={patientSearch}
                  onChange={(e) => setPatientSearch(e.target.value)}
                  placeholder="Search by name, phone, email..."
                  className="search-pill w-full pl-10 !text-xs"
                />
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-surface-soft border-b border-hairline text-xs uppercase font-semibold text-muted tracking-wider">
                  <tr>
                    <th className="px-6 py-4">Patient Name & ID</th>
                    <th className="px-6 py-4">Blood Group</th>
                    <th className="px-6 py-4">Gender / DOB</th>
                    <th className="px-6 py-4">Status</th>
                    <th className="px-6 py-4">Total Visits</th>
                    <th className="px-6 py-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-hairline">
                  {patientsList.map((pat) => (
                    <tr key={pat.id} className="hover:bg-surface-soft/60 transition">
                      <td className="px-6 py-4">
                        <div className="font-semibold text-ink">{pat.user.name}</div>
                        <div className="text-xs text-muted flex items-center gap-2 mt-0.5">
                          <span>{pat.user.email}</span>
                          <span>•</span>
                          <span>{pat.user.phone || 'No phone'}</span>
                        </div>
                      </td>

                      <td className="px-6 py-4">
                        <span className="px-2 py-0.5 rounded-pill bg-red-50 text-red-700 text-xs font-bold border border-red-200">
                          {pat.bloodGroup || 'N/A'}
                        </span>
                      </td>

                      <td className="px-6 py-4 text-xs text-body">
                        <div>{pat.gender}</div>
                        <div className="text-muted">{new Date(pat.dateOfBirth).toLocaleDateString()}</div>
                      </td>

                      <td className="px-6 py-4">
                        <span className={`text-[10px] px-2 py-0.5 rounded-pill font-bold ${
                          pat.user.isActive ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'
                        }`}>
                          {pat.user.isActive ? 'ACTIVE' : 'DEACTIVATED'}
                        </span>
                      </td>

                      <td className="px-6 py-4 text-xs font-semibold number-mono">
                        {pat._count?.appointments || 0} visits
                      </td>

                      <td className="px-6 py-4 text-right">
                        <div className="inline-flex items-center gap-2">
                          <button
                            onClick={() => handleOpenPatientDossier(pat.id)}
                            className="btn-primary !py-1.5 !px-3 !text-xs flex items-center gap-1.5"
                          >
                            <Eye className="h-3.5 w-3.5" /> 360° Dossier
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 5: BILLING & INVOICING DESK */}
      {activeTab === 'FINANCE' && (
        <div className="space-y-6">
          <div className="bg-white rounded-xl border border-hairline p-6 shadow-soft">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mb-6">
              <div>
                <h3 className="text-base font-semibold text-ink">Hospital Accounts & Invoicing Desk</h3>
                <p className="text-xs text-muted">All itemized invoices generated exclusively from completed physician consultations.</p>
              </div>
              <div className="flex items-center gap-3">
                <select
                  value={billStatusFilter}
                  onChange={(e) => setBillStatusFilter(e.target.value)}
                  className="search-pill bg-white border border-hairline text-xs font-semibold"
                >
                  <option value="ALL">All Invoices</option>
                  <option value="UNPAID">Unpaid / Outstanding</option>
                  <option value="PAID">Paid</option>
                  <option value="PARTIALLY_PAID">Partially Paid</option>
                </select>
                <Link href="/billing" className="btn-secondary !text-xs">
                  Open Billing Desk &rarr;
                </Link>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-surface-soft border-b border-hairline text-xs uppercase font-semibold text-muted tracking-wider">
                  <tr>
                    <th className="px-6 py-4">Invoice #</th>
                    <th className="px-6 py-4">Patient</th>
                    <th className="px-6 py-4">Attending Physician</th>
                    <th className="px-6 py-4">Total Amount</th>
                    <th className="px-6 py-4">Paid / Balance</th>
                    <th className="px-6 py-4">Payment Status</th>
                    <th className="px-6 py-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-hairline">
                  {billsList.map((bill) => {
                    const balance = Math.max(0, Number(bill.totalAmount) - Number(bill.paidAmount));
                    return (
                      <tr key={bill.id} className="hover:bg-surface-soft/60 transition">
                        <td className="px-6 py-4 font-mono text-xs font-semibold text-brand">
                          #{bill.id.slice(-8)}
                        </td>

                        <td className="px-6 py-4">
                          <div className="font-semibold text-ink">{bill.patient?.user?.name}</div>
                        </td>

                        <td className="px-6 py-4 text-xs">
                          Dr. {bill.appointment?.doctor?.user?.name || 'Physician'}
                        </td>

                        <td className="px-6 py-4 font-bold number-mono text-ink">
                          {formatCurrency(bill.totalAmount)}
                        </td>

                        <td className="px-6 py-4 text-xs number-mono">
                          <span className="text-emerald-600 font-semibold">{formatCurrency(bill.paidAmount)}</span>
                          {balance > 0 && (
                            <span className="text-amber-700 ml-1">({formatCurrency(balance)} due)</span>
                          )}
                        </td>

                        <td className="px-6 py-4">
                          <span className={`px-2.5 py-1 rounded-pill text-[11px] font-bold uppercase tracking-wider ${
                            bill.status === 'PAID' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' :
                            bill.status === 'UNPAID' ? 'bg-amber-50 text-amber-700 border border-amber-200' :
                            'bg-blue-50 text-blue-700 border border-blue-200'
                          }`}>
                            {bill.status}
                          </span>
                        </td>

                        <td className="px-6 py-4 text-right">
                          {bill.status !== 'PAID' && (
                            <button
                              onClick={() => handleOpenRecordPayment(bill)}
                              className="btn-primary !py-1 !px-2.5 !text-xs font-semibold"
                            >
                              Collect Payment
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 6: ANALYTICS & AUDIT TRAIL */}
      {activeTab === 'ANALYTICS' && (
        <div className="space-y-8">
          {/* Visual Status Breakdown */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white rounded-xl border border-hairline p-6 shadow-soft">
              <h3 className="text-base font-semibold text-ink mb-4">Appointment Status Distribution</h3>
              <div className="space-y-3">
                {Object.entries(metrics?.statusDistribution || {}).map(([st, count]) => {
                  const pct = Math.round((count / (apptTotal || 1)) * 100);
                  return (
                    <div key={st}>
                      <div className="flex items-center justify-between text-xs mb-1">
                        <span className="font-semibold text-ink">{st.replace('_', ' ')}</span>
                        <span className="number-mono text-muted">{count} visits ({pct}%)</span>
                      </div>
                      <div className="w-full h-2 rounded-full bg-surface-strong overflow-hidden">
                        <div
                          className={`h-full ${
                            st === 'COMPLETED' ? 'bg-emerald-500' :
                            st === 'IN_PROGRESS' ? 'bg-purple-500' :
                            st === 'CHECKED_IN' ? 'bg-amber-500' :
                            st === 'CANCELLED' ? 'bg-red-500' : 'bg-brand'
                          }`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Doctor Load Breakdown */}
            <div className="bg-white rounded-xl border border-hairline p-6 shadow-soft">
              <h3 className="text-base font-semibold text-ink mb-4">Physician Workload Breakdown</h3>
              <div className="space-y-3">
                {metrics?.doctorWorkload?.map((doc) => {
                  const totalHandled = doc.completedTotal + doc.todayAppointments;
                  return (
                    <div key={doc.doctorId} className="p-3 rounded-lg bg-surface-soft border border-hairline text-xs">
                      <div className="flex items-center justify-between font-semibold">
                        <span className="text-ink">{doc.doctorName}</span>
                        <span className="text-emerald-600 number-mono">{formatCurrency(doc.revenueTotal)} generated</span>
                      </div>
                      <div className="text-[11px] text-muted mt-1 flex items-center gap-3">
                        <span>Today Queue: {doc.todayAppointments}</span>
                        <span>•</span>
                        <span>Completed: {doc.completedTotal}</span>
                        <span>•</span>
                        <span>Dept: {doc.departmentName}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Audit Logs Stream */}
          <div className="bg-white rounded-xl border border-hairline overflow-hidden shadow-soft">
            <div className="p-6 border-b border-hairline">
              <h3 className="text-base font-semibold text-ink">System Audit & Workflow Trail</h3>
              <p className="text-xs text-muted">Audited chronological stream of clinical actions, state changes, and settlements.</p>
            </div>
            <div className="divide-y divide-hairline">
              {auditLogs.map((log) => (
                <div key={log.id} className="p-4 sm:p-5 flex items-start justify-between gap-4 hover:bg-surface-soft transition text-xs">
                  <div className="flex items-start gap-3">
                    <div className="h-7 w-7 rounded-full bg-brand/10 text-brand flex items-center justify-center shrink-0 mt-0.5">
                      <ShieldCheck className="h-3.5 w-3.5" />
                    </div>
                    <div>
                      <div className="font-semibold text-ink">{log.action}</div>
                      <div className="text-body mt-0.5">{log.details}</div>
                      {log.user && (
                        <div className="text-[11px] text-muted mt-1">
                          Actor: {log.user.name} ({log.user.role})
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="text-right number-mono text-muted shrink-0">
                    <div>{new Date(log.createdAt).toLocaleTimeString()}</div>
                    <div className="text-[10px] text-muted-soft">{new Date(log.createdAt).toLocaleDateString()}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* MODAL 1: REASSIGN DOCTOR */}
      <Modal
        isOpen={!!reassignAppt}
        onClose={() => setReassignAppt(null)}
        title="Reassign Appointment Physician"
        subtitle={`Reassign visit on ${reassignAppt?.appointmentDate ? new Date(reassignAppt.appointmentDate).toISOString().split('T')[0] : ''} at ${reassignAppt?.timeSlot}`}
        maxWidth="md"
      >
        <form onSubmit={handleSubmitReassign} className="space-y-4 text-xs">
          {reassignError && (
            <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-xs">
              {reassignError}
            </div>
          )}

          <div>
            <label className="block font-semibold text-ink mb-1">Select New Physician</label>
            <select
              value={reassignDoctorId}
              onChange={(e) => setReassignDoctorId(e.target.value)}
              required
              className="search-pill w-full bg-white border border-hairline text-xs font-medium"
            >
              <option value="">-- Choose Available Doctor --</option>
              {doctorsList
                .filter((d) => d.id !== reassignAppt?.doctorId && d.isActive)
                .map((d) => (
                  <option key={d.id} value={d.id}>
                    Dr. {d.user.name} ({d.department.name})
                  </option>
                ))}
            </select>
          </div>

          <div>
            <label className="block font-semibold text-ink mb-1">Reason for Reassignment</label>
            <input
              type="text"
              value={reassignReason}
              onChange={(e) => setReassignReason(e.target.value)}
              placeholder="e.g. Attending physician on leave / emergency coverage"
              className="search-pill w-full !text-xs"
            />
          </div>

          <div className="pt-4 border-t border-hairline flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={() => setReassignAppt(null)}
              className="btn-secondary !py-2 !px-4 text-xs"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submittingReassign}
              className="btn-primary !py-2 !px-4 text-xs flex items-center gap-1.5"
            >
              {submittingReassign ? 'Reassigning...' : 'Confirm Reassignment'}
            </button>
          </div>
        </form>
      </Modal>

      {/* MODAL 2: MANAGE DOCTOR LEAVE */}
      <Modal
        isOpen={isLeaveModalOpen}
        onClose={() => setIsLeaveModalOpen(false)}
        title={`Doctor Leave Management • Dr. ${selectedDoctorForLeave?.user?.name || ''}`}
        subtitle="Schedule vacation or unavailability. Any overlapping bookings will be flagged."
        maxWidth="lg"
      >
        <div className="space-y-6 text-xs">
          {leaveError && (
            <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-700">
              {leaveError}
            </div>
          )}

          {/* New Leave Form */}
          <form onSubmit={handleSaveDoctorLeave} className="p-4 rounded-xl bg-surface-soft border border-hairline space-y-3">
            <div className="font-semibold text-ink text-xs uppercase">Schedule New Time-Off / Leave</div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block font-medium text-muted mb-1">Start Date</label>
                <input
                  type="date"
                  value={newLeaveStart}
                  onChange={(e) => setNewLeaveStart(e.target.value)}
                  required
                  className="search-pill w-full bg-white border border-hairline !text-xs"
                />
              </div>

              <div>
                <label className="block font-medium text-muted mb-1">End Date</label>
                <input
                  type="date"
                  value={newLeaveEnd}
                  onChange={(e) => setNewLeaveEnd(e.target.value)}
                  required
                  className="search-pill w-full bg-white border border-hairline !text-xs"
                />
              </div>
            </div>

            <div>
              <label className="block font-medium text-muted mb-1">Reason for Absence</label>
              <input
                type="text"
                value={newLeaveReason}
                onChange={(e) => setNewLeaveReason(e.target.value)}
                placeholder="e.g. Conference, Medical emergency, Annual vacation"
                className="search-pill w-full bg-white border border-hairline !text-xs"
              />
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="submit"
                disabled={submittingLeave}
                className="btn-primary !py-1.5 !px-3 text-xs"
              >
                {submittingLeave ? 'Scheduling...' : 'Save Leave & Flag Conflicts'}
              </button>
            </div>
          </form>

          {/* Existing Leaves List */}
          <div>
            <div className="font-semibold text-ink text-xs uppercase mb-2">Scheduled Leaves on File</div>
            {doctorLeaves.length === 0 ? (
              <div className="p-4 text-center text-muted bg-surface-soft rounded-lg">No active leaves scheduled.</div>
            ) : (
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {doctorLeaves.map((l) => (
                  <div key={l.id} className="p-3 rounded-lg border border-hairline bg-white flex items-center justify-between">
                    <div>
                      <div className="font-semibold text-ink">
                        {new Date(l.startDate).toISOString().split('T')[0]} to {new Date(l.endDate).toISOString().split('T')[0]}
                      </div>
                      <div className="text-muted text-[11px] mt-0.5">{l.reason || 'Personal Leave'}</div>
                    </div>
                    <button
                      onClick={() => handleDeleteDoctorLeave(l.id)}
                      className="px-2 py-1 rounded hover:bg-red-50 text-red-600 font-semibold"
                    >
                      Delete
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </Modal>

      {/* MODAL 3: PATIENT 360° DOSSIER */}
      <Modal
        isOpen={!!selectedPatientDossier}
        onClose={() => setSelectedPatientDossier(null)}
        title={`Patient 360° Electronic Dossier • ${selectedPatientDossier?.user?.name || ''}`}
        subtitle={`Patient ID: ${selectedPatientDossier?.id || ''} • Linked User: ${selectedPatientDossier?.user?.email || ''}`}
        maxWidth="xl"
      >
        {selectedPatientDossier && (
          <div className="space-y-6 text-xs max-h-[75vh] overflow-y-auto p-1">
            {/* Demographics Strip */}
            <div className="p-4 rounded-xl bg-surface-soft border border-hairline grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div>
                <div className="text-[10px] uppercase font-bold text-muted">Blood Group</div>
                <div className="text-sm font-bold text-red-700 mt-0.5">{selectedPatientDossier.bloodGroup || 'N/A'}</div>
              </div>
              <div>
                <div className="text-[10px] uppercase font-bold text-muted">Gender / Age</div>
                <div className="text-sm font-semibold text-ink mt-0.5">
                  {selectedPatientDossier.gender} (DOB: {new Date(selectedPatientDossier.dateOfBirth).toLocaleDateString()})
                </div>
              </div>
              <div>
                <div className="text-[10px] uppercase font-bold text-muted">Emergency Contact</div>
                <div className="text-xs text-ink mt-0.5">{selectedPatientDossier.emergencyContact || 'None'}</div>
              </div>
              <div>
                <div className="text-[10px] uppercase font-bold text-muted">Account Status</div>
                <button
                  onClick={() => handleTogglePatientActive(selectedPatientDossier.id)}
                  className={`mt-1 px-2.5 py-0.5 rounded-pill font-bold text-[10px] ${
                    selectedPatientDossier.user?.isActive ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'
                  }`}
                >
                  {selectedPatientDossier.user?.isActive ? 'ACTIVE (Click to Deactivate)' : 'DEACTIVATED (Click to Activate)'}
                </button>
              </div>
            </div>

            {/* Medical Summary */}
            <div>
              <div className="text-xs uppercase font-semibold text-muted mb-1.5">Medical History Summary</div>
              <div className="p-3 rounded-lg bg-surface-soft border border-hairline text-body leading-relaxed">
                {selectedPatientDossier.medicalHistorySummary || 'No chronic conditions reported.'}
              </div>
            </div>

            {/* Full Appointment History */}
            <div>
              <div className="text-xs uppercase font-semibold text-muted mb-2">Appointment Journey History</div>
              <div className="border border-hairline rounded-lg overflow-hidden">
                <table className="w-full text-left text-xs">
                  <thead className="bg-surface-soft border-b border-hairline text-[10px] uppercase font-semibold text-muted">
                    <tr>
                      <th className="p-2.5">Date & Slot</th>
                      <th className="p-2.5">Doctor</th>
                      <th className="p-2.5">Status</th>
                      <th className="p-2.5">Reason</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-hairline">
                    {selectedPatientDossier.appointments?.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="p-4 text-center text-muted">No appointments recorded.</td>
                      </tr>
                    ) : (
                      selectedPatientDossier.appointments.map((a: any) => (
                        <tr key={a.id}>
                          <td className="p-2.5 font-mono text-brand font-medium">
                            {new Date(a.appointmentDate).toISOString().split('T')[0]} ({a.timeSlot})
                          </td>
                          <td className="p-2.5">Dr. {a.doctor?.user?.name}</td>
                          <td className="p-2.5 font-bold uppercase">{a.status}</td>
                          <td className="p-2.5 text-muted truncate max-w-xs">{a.reason || '—'}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Prescriptions on File */}
            <div>
              <div className="text-xs uppercase font-semibold text-muted mb-2">Electronic Prescriptions & Diagnoses</div>
              {selectedPatientDossier.prescriptions?.length === 0 ? (
                <div className="p-3 text-center text-muted bg-surface-soft rounded-lg">No prescriptions issued yet.</div>
              ) : (
                <div className="space-y-2">
                  {selectedPatientDossier.prescriptions.map((rx: any) => (
                    <div key={rx.id} className="p-3 rounded-lg border border-hairline bg-surface-soft space-y-1">
                      <div className="flex items-center justify-between font-semibold">
                        <span className="text-ink">Diagnosis: {rx.diagnosis}</span>
                        <span className="text-muted text-[11px]">{new Date(rx.createdAt).toLocaleDateString()}</span>
                      </div>
                      {rx.symptoms && <div className="text-[11px] text-body"><span className="font-semibold">Symptoms:</span> {rx.symptoms}</div>}
                      {rx.notes && <div className="text-[11px] text-body"><span className="font-semibold">Advice:</span> {rx.notes}</div>}
                      {rx.followUpDate && (
                        <div className="text-[11px] text-purple-700 font-semibold">
                          Follow-up scheduled: {new Date(rx.followUpDate).toISOString().split('T')[0]}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Invoices Ledger */}
            <div>
              <div className="text-xs uppercase font-semibold text-muted mb-2">Billing & Payment Ledger</div>
              {selectedPatientDossier.bills?.length === 0 ? (
                <div className="p-3 text-center text-muted bg-surface-soft rounded-lg">No invoices generated yet.</div>
              ) : (
                <div className="border border-hairline rounded-lg overflow-hidden">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-surface-soft border-b border-hairline text-[10px] uppercase font-semibold text-muted">
                      <tr>
                        <th className="p-2.5">Invoice #</th>
                        <th className="p-2.5">Total</th>
                        <th className="p-2.5">Paid</th>
                        <th className="p-2.5">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-hairline">
                      {selectedPatientDossier.bills.map((b: any) => (
                        <tr key={b.id}>
                          <td className="p-2.5 font-mono text-brand">#{b.id.slice(-6)}</td>
                          <td className="p-2.5 font-bold number-mono">{formatCurrency(b.totalAmount)}</td>
                          <td className="p-2.5 font-bold number-mono text-emerald-600">{formatCurrency(b.paidAmount)}</td>
                          <td className="p-2.5 font-bold uppercase">{b.status}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}
      </Modal>

      {/* MODAL 4: RECORD PAYMENT */}
      <Modal
        isOpen={!!selectedBillForPayment}
        onClose={() => setSelectedBillForPayment(null)}
        title="Record Payment Settlement"
        subtitle={`Invoice #${selectedBillForPayment?.id?.slice(-8) || ''} • Patient: ${selectedBillForPayment?.patient?.user?.name || ''}`}
        maxWidth="md"
      >
        <form onSubmit={handleSubmitRecordPayment} className="space-y-4 text-xs">
          {payError && (
            <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-700">
              {payError}
            </div>
          )}

          <div className="p-3 rounded-lg bg-surface-soft border border-hairline flex items-center justify-between">
            <span className="text-muted font-medium">Total Bill Amount:</span>
            <span className="font-bold number-mono text-ink">{formatCurrency(selectedBillForPayment?.totalAmount || 0)}</span>
          </div>

          <div>
            <label className="block font-semibold text-ink mb-1">Payment Amount (INR)</label>
            <input
              type="number"
              step="0.01"
              value={payAmount}
              onChange={(e) => setPayAmount(e.target.value)}
              required
              className="search-pill w-full !text-xs font-mono"
            />
          </div>

          <div>
            <label className="block font-semibold text-ink mb-1">Payment Method</label>
            <select
              value={payMethod}
              onChange={(e) => setPayMethod(e.target.value as PaymentMethod)}
              className="search-pill w-full bg-white border border-hairline !text-xs font-medium"
            >
              <option value="CASH">Cash Settlement</option>
              <option value="CARD">Debit / Credit Card</option>
              <option value="UPI">UPI (GooglePay / PhonePe / Paytm)</option>
              <option value="NET_BANKING">Net Banking</option>
              <option value="INSURANCE">Health Insurance</option>
            </select>
          </div>

          <div>
            <label className="block font-semibold text-ink mb-1">Transaction Reference</label>
            <input
              type="text"
              value={payRef}
              onChange={(e) => setPayRef(e.target.value)}
              placeholder="e.g. UPI-REF-12345 or Cash Slip"
              className="search-pill w-full !text-xs font-mono"
            />
          </div>

          <div className="pt-4 border-t border-hairline flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={() => setSelectedBillForPayment(null)}
              className="btn-secondary !py-2 !px-4 text-xs"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submittingPay}
              className="btn-primary !py-2 !px-4 text-xs flex items-center gap-1.5"
            >
              {submittingPay ? 'Recording...' : 'Record Payment'}
            </button>
          </div>
        </form>
      </Modal>
    </DashboardShell>
  );
}
