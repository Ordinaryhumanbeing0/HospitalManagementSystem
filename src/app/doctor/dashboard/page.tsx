'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Stethoscope,
  Building2,
  Calendar,
  Clock,
  Search,
  Users,
  CheckCircle2,
  Pill,
  ArrowRight,
  FileText,
  Plus,
  Trash2,
  Eye,
  AlertCircle,
  XCircle,
  Activity,
  User,
  ShieldCheck,
  RefreshCw,
  Coffee,
  CalendarOff,
  PlayCircle,
  UserCheck,
  History,
  AlertTriangle,
} from 'lucide-react';
import { DashboardShell } from '@/components/ui/DashboardShell';
import { Modal } from '@/components/ui/Modal';
import { getAuthUserAction } from '@/actions/auth';
import {
  getDoctorByIdAction,
  updateDoctorScheduleAction,
  getDoctorLeavesAction,
  addDoctorLeaveAction,
  deleteDoctorLeaveAction,
} from '@/actions/doctor';
import { formatCurrency } from '@/lib/config/currency';
import {
  getAppointmentsAction,
  checkInAppointmentAction,
  startConsultationAction,
  markNoShowAction,
  cancelAppointmentAction,
} from '@/actions/appointment';
import { createPrescriptionAction, getPatientMedicalHistoryAction } from '@/actions/medical-record';
import { SessionUser, MedicationItemType } from '@/types';
import { AppointmentStatus } from '@prisma/client';

const DAYS_OF_WEEK = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

export default function DoctorDashboardPage() {
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState<SessionUser | null>(null);
  const [doctorProfile, setDoctorProfile] = useState<any | null>(null);
  const [appointments, setAppointments] = useState<any[]>([]);
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'CHECKED_IN' | 'IN_PROGRESS' | 'CONFIRMED' | 'COMPLETED' | 'CANCELLED'>('CHECKED_IN');
  const [loading, setLoading] = useState(true);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Statistics
  const [queueMetrics, setQueueMetrics] = useState({
    waitingRoom: 0,
    inProgress: 0,
    upcoming: 0,
    completedToday: 0,
    totalToday: 0,
  });

  // 1. Schedule & Break Times Modal State
  const [isScheduleModalOpen, setIsScheduleModalOpen] = useState(false);
  const [editingSchedules, setEditingSchedules] = useState<
    Array<{
      dayOfWeek: number;
      startTime: string;
      endTime: string;
      breakStartTime?: string;
      breakEndTime?: string;
      slotDuration: number;
      isActive: boolean;
    }>
  >([]);
  const [savingSchedule, setSavingSchedule] = useState(false);
  const [scheduleError, setScheduleError] = useState<string | null>(null);

  // 2. Doctor Leave Management State
  const [isLeaveModalOpen, setIsLeaveModalOpen] = useState(false);
  const [leavesList, setLeavesList] = useState<any[]>([]);
  const [leaveStartDate, setLeaveStartDate] = useState('');
  const [leaveEndDate, setLeaveEndDate] = useState('');
  const [leaveReason, setLeaveReason] = useState('');
  const [savingLeave, setSavingLeave] = useState(false);
  const [leaveError, setLeaveError] = useState<string | null>(null);
  const [leaveConflictWarning, setLeaveConflictWarning] = useState<string | null>(null);

  // 3. Consultation & Prescription Modal State
  const [isRxModalOpen, setIsRxModalOpen] = useState(false);
  const [activeConsultationAppt, setActiveConsultationAppt] = useState<any | null>(null);
  const [rxSymptoms, setRxSymptoms] = useState('');
  const [rxDiagnosis, setRxDiagnosis] = useState('');
  const [rxNotes, setRxNotes] = useState('');
  const [rxFollowUpDate, setRxFollowUpDate] = useState('');
  const [rxMedications, setRxMedications] = useState<MedicationItemType[]>([
    { name: '', dosage: '', frequency: 'Twice daily after meals', duration: '5 days', instructions: '' },
  ]);
  const [patientPastHistory, setPatientPastHistory] = useState<any | null>(null);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [issuingRx, setIssuingRx] = useState(false);
  const [rxError, setRxError] = useState<string | null>(null);

  // 4. View Prescription Modal State
  const [viewRxModalAppt, setViewRxModalAppt] = useState<any | null>(null);

  const loadData = async (userDocId: string, filter: string) => {
    setLoading(true);
    const [docRes, apptRes, allApptRes, leavesRes] = await Promise.all([
      getDoctorByIdAction(userDocId),
      getAppointmentsAction({
        status: filter !== 'ALL' ? (filter as any) : undefined,
        doctorId: userDocId,
        limit: 50,
      }),
      // Fetch all for local queue counters
      getAppointmentsAction({
        doctorId: userDocId,
        limit: 100,
      }),
      getDoctorLeavesAction(userDocId),
    ]);

    if (docRes.success && docRes.data) {
      setDoctorProfile(docRes.data);
      if (docRes.data.schedules) {
        setEditingSchedules(
          docRes.data.schedules.map((s: any) => ({
            dayOfWeek: s.dayOfWeek,
            startTime: s.startTime,
            endTime: s.endTime,
            breakStartTime: s.breakStartTime || '',
            breakEndTime: s.breakEndTime || '',
            slotDuration: s.slotDuration || 30,
            isActive: s.isActive ?? true,
          }))
        );
      }
    }

    if (apptRes.success && apptRes.data) {
      setAppointments(apptRes.data.appointments);
    }

    if (allApptRes.success && allApptRes.data) {
      const all = allApptRes.data.appointments;
      const todayStr = new Date().toISOString().split('T')[0];

      const waiting = all.filter((a: any) => a.status === AppointmentStatus.CHECKED_IN).length;
      const inProg = all.filter((a: any) => a.status === AppointmentStatus.IN_PROGRESS).length;
      const upcoming = all.filter(
        (a: any) =>
          a.status === AppointmentStatus.CONFIRMED || a.status === AppointmentStatus.SCHEDULED
      ).length;
      const compToday = all.filter((a: any) => {
        const dStr = new Date(a.appointmentDate).toISOString().split('T')[0];
        return a.status === AppointmentStatus.COMPLETED && dStr === todayStr;
      }).length;
      const totToday = all.filter((a: any) => {
        const dStr = new Date(a.appointmentDate).toISOString().split('T')[0];
        return dStr === todayStr;
      }).length;

      setQueueMetrics({
        waitingRoom: waiting,
        inProgress: inProg,
        upcoming,
        completedToday: compToday,
        totalToday: totToday,
      });
    }

    if (leavesRes.success && leavesRes.data) {
      setLeavesList(leavesRes.data);
    }

    setLoading(false);
  };

  useEffect(() => {
    getAuthUserAction().then(async (res) => {
      if (res.data && (res.data.role === 'DOCTOR' || res.data.role === 'ADMIN')) {
        setCurrentUser(res.data);
        if (res.data.doctorId) {
          loadData(res.data.doctorId, statusFilter);
        } else {
          setLoading(false);
        }
      } else {
        router.push('/login?role=DOCTOR&callbackUrl=/doctor/dashboard');
      }
    });
  }, [router]);

  const handleFilterChange = (filter: 'ALL' | 'CHECKED_IN' | 'IN_PROGRESS' | 'CONFIRMED' | 'COMPLETED' | 'CANCELLED') => {
    setStatusFilter(filter);
    if (currentUser?.doctorId) {
      loadData(currentUser.doctorId, filter);
    }
  };

  // --- Schedule Handlers ---
  const handleAddScheduleDay = () => {
    setEditingSchedules((prev) => [
      ...prev,
      {
        dayOfWeek: 1,
        startTime: '09:00',
        endTime: '17:00',
        breakStartTime: '13:00',
        breakEndTime: '14:00',
        slotDuration: 30,
        isActive: true,
      },
    ]);
  };

  const handleRemoveScheduleDay = (index: number) => {
    setEditingSchedules((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSaveSchedules = async () => {
    if (!currentUser?.doctorId) return;
    setSavingSchedule(true);
    setScheduleError(null);

    const res = await updateDoctorScheduleAction(currentUser.doctorId, editingSchedules);
    if (!res.success) {
      setScheduleError(res.message || 'Failed to update schedule.');
      setSavingSchedule(false);
      return;
    }

    setToastMessage('Weekly working shifts and break times updated successfully!');
    setIsScheduleModalOpen(false);
    setSavingSchedule(false);
    loadData(currentUser.doctorId, statusFilter);
  };

  // --- Doctor Leave Handlers ---
  const handleAddLeave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser?.doctorId) return;
    if (!leaveStartDate || !leaveEndDate) {
      setLeaveError('Start date and end date are required.');
      return;
    }

    setSavingLeave(true);
    setLeaveError(null);
    setLeaveConflictWarning(null);

    const res = await addDoctorLeaveAction({
      doctorId: currentUser.doctorId,
      startDate: leaveStartDate,
      endDate: leaveEndDate,
      reason: leaveReason.trim() || 'Medical / Personal Leave',
    });

    if (!res.success) {
      setLeaveError(res.message || 'Failed to record leave.');
      setSavingLeave(false);
      return;
    }

    if (res.data?.conflictedCount > 0) {
      setLeaveConflictWarning(
        `Leave scheduled! ${res.data.conflictedCount} conflicting appointment(s) were flagged and patients notified.`
      );
    } else {
      setToastMessage('Leave scheduled successfully. Consultation slots have been temporarily blocked.');
    }

    setLeaveStartDate('');
    setLeaveEndDate('');
    setLeaveReason('');
    setSavingLeave(false);
    loadData(currentUser.doctorId, statusFilter);
  };

  const handleDeleteLeave = async (leaveId: string) => {
    const res = await deleteDoctorLeaveAction(leaveId);
    if (res.success) {
      setToastMessage('Leave schedule cancelled.');
      if (currentUser?.doctorId) {
        loadData(currentUser.doctorId, statusFilter);
      }
    } else {
      alert(res.message || 'Failed to cancel leave.');
    }
  };

  // --- Clinical Consultation & Prescription Handlers ---
  const handleStartConsultation = async (appt: any) => {
    // 1. Transition status to IN_PROGRESS
    if (appt.status !== AppointmentStatus.IN_PROGRESS) {
      const res = await startConsultationAction(appt.id);
      if (!res.success) {
        setToastMessage(res.message || 'Could not start consultation.');
        return;
      }
    }

    // 2. Open Consultation modal with clinical findings & load history
    setActiveConsultationAppt(appt);
    setRxSymptoms(appt.reason || '');
    setRxDiagnosis('');
    setRxNotes('');
    setRxFollowUpDate('');
    setRxMedications([
      { name: '', dosage: '', frequency: 'Twice daily after meals', duration: '5 days', instructions: '' },
    ]);
    setRxError(null);
    setIsRxModalOpen(true);

    // Fetch patient past history for clinical context
    setLoadingHistory(true);
    const histRes = await getPatientMedicalHistoryAction(appt.patientId);
    if (histRes.success && histRes.data) {
      setPatientPastHistory(histRes.data);
    }
    setLoadingHistory(false);
  };

  const handleAddMedication = () => {
    setRxMedications((prev) => [
      ...prev,
      { name: '', dosage: '', frequency: 'Once daily in the morning', duration: '5 days', instructions: '' },
    ]);
  };

  const handleRemoveMedication = (index: number) => {
    setRxMedications((prev) => prev.filter((_, i) => i !== index));
  };

  const handleUpdateMedication = (index: number, field: keyof MedicationItemType, value: string) => {
    setRxMedications((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], [field]: value };
      return next;
    });
  };

  const handleSubmitPrescription = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeConsultationAppt || !currentUser?.doctorId) return;

    if (!rxDiagnosis.trim()) {
      setRxError('Clinical diagnosis is required to complete consultation.');
      return;
    }

    const validMeds = rxMedications.filter((m) => m.name.trim() !== '');
    if (validMeds.length === 0) {
      setRxError('Please specify at least one prescribed medication.');
      return;
    }

    setIssuingRx(true);
    setRxError(null);

    const res = await createPrescriptionAction({
      appointmentId: activeConsultationAppt.id,
      patientId: activeConsultationAppt.patientId,
      doctorId: currentUser.doctorId,
      symptoms: rxSymptoms.trim() || undefined,
      diagnosis: rxDiagnosis.trim(),
      notes: rxNotes.trim() || undefined,
      followUpDate: rxFollowUpDate || undefined,
      medications: validMeds,
    });

    if (!res.success) {
      setRxError(res.message || 'Failed to complete consultation and issue prescription.');
      setIssuingRx(false);
      return;
    }

    setToastMessage(
      `Consultation completed! Prescription issued and hospital invoice automatically generated for ${
        activeConsultationAppt.patient?.user?.name || 'patient'
      }.`
    );
    setIsRxModalOpen(false);
    setIssuingRx(false);
    loadData(currentUser.doctorId, statusFilter);
  };

  // --- Mark Check-In (Patient Arrived) ---
  const handleCheckIn = async (apptId: string) => {
    const res = await checkInAppointmentAction(apptId);
    if (res.success) {
      setToastMessage('Patient marked as Checked In. Queued in waiting room.');
      if (currentUser?.doctorId) {
        loadData(currentUser.doctorId, statusFilter);
      }
    } else {
      setToastMessage(res.message || 'Failed to check in patient.');
    }
  };

  // --- Mark No Show Handler ---
  const handleMarkNoShow = async (apptId: string) => {
    if (!confirm('Mark this patient appointment as No-Show?')) return;
    const res = await markNoShowAction(apptId);
    if (res.success) {
      setToastMessage('Appointment marked as No-Show.');
      if (currentUser?.doctorId) {
        loadData(currentUser.doctorId, statusFilter);
      }
    } else {
      setToastMessage(res.message || 'Failed to mark no-show.');
    }
  };

  // --- Cancel Consultation Handler ---
  const handleCancelAppt = async (apptId: string) => {
    const reason = prompt('Please enter cancellation reason:');
    if (reason === null) return;
    const res = await cancelAppointmentAction({ appointmentId: apptId, reason });
    if (res.success) {
      setToastMessage('Appointment cancelled.');
      if (currentUser?.doctorId) {
        loadData(currentUser.doctorId, statusFilter);
      }
    } else {
      setToastMessage(res.message || 'Failed to cancel.');
    }
  };

  if (!currentUser) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white text-body text-sm">
        Authenticating physician clinical credentials...
      </div>
    );
  }

  return (
    <DashboardShell
      user={currentUser}
      title={`Clinical Workstation • Dr. ${currentUser.name}`}
      subtitle="Shift scheduling, break management, patient waiting room queue, and electronic prescription issuance."
      badge="Physician Operations Desk"
      actionButton={
        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsLeaveModalOpen(true)}
            className="btn-secondary flex items-center gap-2 text-xs !py-2 !px-3"
          >
            <CalendarOff className="h-4 w-4 text-brand" /> Manage Leaves
          </button>
          <button
            onClick={() => setIsScheduleModalOpen(true)}
            className="btn-secondary flex items-center gap-2 text-xs !py-2 !px-3"
          >
            <Clock className="h-4 w-4 text-brand" /> Shifts & Breaks
          </button>
          <Link
            href="/medical-records"
            className="btn-primary flex items-center gap-2 text-xs !py-2 !px-3"
          >
            <FileText className="h-4 w-4" /> Patient EHR Records
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

      {/* Top Banner: Physician Profile & Live Queue Stat Pills */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
        <div className="lg:col-span-2 bg-surface-dark text-white rounded-xl p-8 shadow-soft flex flex-col justify-between">
          <div>
            <div className="flex items-start justify-between gap-4">
              <div>
                <span className="badge-pill !bg-white/10 !text-white mb-3">
                  <Building2 className="h-3.5 w-3.5 text-brand" />{' '}
                  {doctorProfile?.department?.name || 'Clinical Division'}
                </span>
                <h2 className="text-2xl font-normal tracking-tight text-white">
                  Dr. {currentUser.name}
                </h2>
                <p className="text-sm text-muted-soft mt-1">
                  {doctorProfile?.specialization || 'Clinical Specialist'} •{' '}
                  {doctorProfile?.qualification || 'MD / MBBS'}
                </p>
              </div>

              <div className="h-12 w-12 rounded-full bg-surface-dark-elevated flex items-center justify-center text-brand">
                <Stethoscope className="h-6 w-6" />
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-8 pt-6 border-t border-surface-dark-elevated text-xs">
              <div>
                <div className="text-[10px] font-semibold uppercase text-muted tracking-wider">
                  Consultation Fee
                </div>
                <div className="text-lg font-bold text-semantic-up number-mono mt-0.5">
                  {formatCurrency(doctorProfile?.consultationFee || 0)}
                </div>
              </div>

              <div>
                <div className="text-[10px] font-semibold uppercase text-muted tracking-wider">
                  Active Shifts
                </div>
                <div className="text-lg font-bold text-white number-mono mt-0.5">
                  {doctorProfile?.schedules?.length || 0} Day(s)/wk
                </div>
              </div>

              <div>
                <div className="text-[10px] font-semibold uppercase text-muted tracking-wider">
                  Waiting Room
                </div>
                <div className="text-lg font-bold text-amber-400 number-mono mt-0.5 flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full bg-amber-400 animate-pulse" />
                  {queueMetrics.waitingRoom} Patient(s)
                </div>
              </div>

              <div>
                <div className="text-[10px] font-semibold uppercase text-muted tracking-wider">
                  Completed Today
                </div>
                <div className="text-lg font-bold text-emerald-400 number-mono mt-0.5">
                  {queueMetrics.completedToday} Done
                </div>
              </div>
            </div>
          </div>

          <div className="pt-6 mt-6 border-t border-surface-dark-elevated flex items-center justify-between flex-wrap gap-2">
            <span className="text-xs text-muted-soft">
              Active clinic queue: {queueMetrics.waitingRoom} waiting • {queueMetrics.inProgress} in exam room
            </span>
            <div className="flex items-center gap-3">
              <button
                onClick={() => setIsLeaveModalOpen(true)}
                className="text-xs font-semibold text-brand hover:underline"
              >
                Upcoming Leaves ({leavesList.length}) &rarr;
              </button>
            </div>
          </div>
        </div>

        {/* Quick Shift & Break Timetable Card */}
        <div className="bg-white rounded-xl border border-hairline p-6 shadow-soft space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-semibold text-ink flex items-center gap-2">
              <Clock className="h-4 w-4 text-brand" /> Duty Shifts & Breaks
            </h3>
            <button
              onClick={() => setIsScheduleModalOpen(true)}
              className="text-xs text-brand font-semibold hover:underline"
            >
              Configure
            </button>
          </div>

          {doctorProfile?.schedules && doctorProfile.schedules.length > 0 ? (
            <div className="space-y-2 text-xs">
              {doctorProfile.schedules.map((s: any) => (
                <div
                  key={s.id}
                  className="p-2.5 rounded-lg bg-surface-soft border border-hairline flex flex-col gap-1"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-ink">{DAYS_OF_WEEK[s.dayOfWeek]}</span>
                    <span className="number-mono text-muted">
                      {s.startTime} - {s.endTime}
                    </span>
                  </div>
                  {s.breakStartTime && s.breakEndTime ? (
                    <div className="flex items-center gap-1.5 text-[11px] text-amber-700 bg-amber-50 px-2 py-0.5 rounded">
                      <Coffee className="h-3 w-3 shrink-0" />
                      <span>Break: {s.breakStartTime} - {s.breakEndTime}</span>
                    </div>
                  ) : (
                    <span className="text-[10px] text-muted">No break scheduled</span>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="p-4 rounded-xl bg-surface-soft text-center text-xs text-muted space-y-2">
              <div>No shift timetable configured yet.</div>
              <button
                onClick={() => setIsScheduleModalOpen(true)}
                className="btn-primary !text-xs"
              >
                Set Shift Schedule
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Main Clinical Queue & Patient Intake Management */}
      <div className="bg-white rounded-xl border border-hairline shadow-soft overflow-hidden mb-10">
        <div className="p-6 border-b border-hairline flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h3 className="text-lg font-semibold text-ink flex items-center gap-2">
              <Calendar className="h-5 w-5 text-brand" /> Clinical Patient Queue
            </h3>
            <p className="text-xs text-muted mt-0.5">
              Manage patient arrival check-ins, launch exam consultations, and record electronic prescriptions with auto-billing.
            </p>
          </div>

          {/* Operational Queue Filter Tabs */}
          <div className="flex items-center gap-1 p-1 rounded-pill bg-surface-soft border border-hairline flex-wrap">
            <button
              onClick={() => handleFilterChange('CHECKED_IN')}
              className={`px-3 py-1.5 rounded-pill text-xs font-semibold transition flex items-center gap-1.5 ${
                statusFilter === 'CHECKED_IN'
                  ? 'bg-amber-500 text-white shadow-sm'
                  : 'text-muted hover:text-ink'
              }`}
            >
              <span>Waiting Room</span>
              {queueMetrics.waitingRoom > 0 && (
                <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                  statusFilter === 'CHECKED_IN' ? 'bg-white text-amber-600' : 'bg-amber-100 text-amber-800'
                }`}>
                  {queueMetrics.waitingRoom}
                </span>
              )}
            </button>

            <button
              onClick={() => handleFilterChange('IN_PROGRESS')}
              className={`px-3 py-1.5 rounded-pill text-xs font-semibold transition flex items-center gap-1.5 ${
                statusFilter === 'IN_PROGRESS'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-muted hover:text-ink'
              }`}
            >
              <span>In Examination</span>
              {queueMetrics.inProgress > 0 && (
                <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                  statusFilter === 'IN_PROGRESS' ? 'bg-white text-blue-600' : 'bg-blue-100 text-blue-800'
                }`}>
                  {queueMetrics.inProgress}
                </span>
              )}
            </button>

            <button
              onClick={() => handleFilterChange('CONFIRMED')}
              className={`px-3 py-1.5 rounded-pill text-xs font-semibold transition ${
                statusFilter === 'CONFIRMED'
                  ? 'bg-white text-ink shadow-sm border border-hairline'
                  : 'text-muted hover:text-ink'
              }`}
            >
              Upcoming ({queueMetrics.upcoming})
            </button>

            <button
              onClick={() => handleFilterChange('COMPLETED')}
              className={`px-3 py-1.5 rounded-pill text-xs font-semibold transition ${
                statusFilter === 'COMPLETED'
                  ? 'bg-white text-ink shadow-sm border border-hairline'
                  : 'text-muted hover:text-ink'
              }`}
            >
              Completed
            </button>

            <button
              onClick={() => handleFilterChange('ALL')}
              className={`px-3 py-1.5 rounded-pill text-xs font-semibold transition ${
                statusFilter === 'ALL'
                  ? 'bg-white text-ink shadow-sm border border-hairline'
                  : 'text-muted hover:text-ink'
              }`}
            >
              All Appointments
            </button>
          </div>
        </div>

        {loading ? (
          <div className="py-16 text-center text-sm text-muted">
            Updating clinical patient queue...
          </div>
        ) : appointments.length === 0 ? (
          <div className="py-16 text-center text-sm text-body space-y-2">
            <Calendar className="h-8 w-8 text-muted mx-auto" />
            <div className="font-semibold text-ink">No appointments in this view.</div>
            <p className="text-xs text-muted">
              {statusFilter === 'CHECKED_IN'
                ? 'No patients waiting in the clinic lobby right now.'
                : statusFilter === 'IN_PROGRESS'
                ? 'No consultation is currently underway.'
                : 'No appointment records match the selected queue filter.'}
            </p>
          </div>
        ) : (
          <div className="divide-y divide-hairline">
            {appointments.map((appt) => {
              const apptDateStr = new Date(appt.appointmentDate).toISOString().split('T')[0];
              const isCheckedIn = appt.status === AppointmentStatus.CHECKED_IN;
              const isInProgress = appt.status === AppointmentStatus.IN_PROGRESS;
              const isConfirmed = appt.status === AppointmentStatus.CONFIRMED || appt.status === AppointmentStatus.SCHEDULED;
              const isCompleted = appt.status === AppointmentStatus.COMPLETED;

              return (
                <div
                  key={appt.id}
                  className={`p-6 hover:bg-surface-soft transition flex flex-col md:flex-row md:items-center justify-between gap-6 ${
                    isCheckedIn ? 'bg-amber-50/30 border-l-4 border-l-amber-500' : ''
                  } ${isInProgress ? 'bg-blue-50/30 border-l-4 border-l-blue-600' : ''}`}
                >
                  {/* Left: Patient & Clinical Info */}
                  <div className="space-y-2 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span
                        className={`badge-pill text-[10px] font-bold ${
                          isCheckedIn
                            ? '!bg-amber-100 !text-amber-800 !border-amber-300'
                            : isInProgress
                            ? '!bg-blue-100 !text-blue-800 !border-blue-300'
                            : isConfirmed
                            ? '!bg-slate-100 !text-slate-800 !border-slate-300'
                            : isCompleted
                            ? '!bg-emerald-100 !text-emerald-800 !border-emerald-300'
                            : '!bg-red-50 !text-semantic-down !border-red-200'
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

                    <div className="flex items-center gap-4 flex-wrap pt-1">
                      <div className="text-sm font-semibold text-ink flex items-center gap-1.5">
                        <User className="h-4 w-4 text-brand" />
                        <span>{appt.patient?.user?.name}</span>
                      </div>

                      {appt.patient?.bloodGroup && (
                        <span className="px-2 py-0.5 rounded-pill bg-red-100 text-red-800 text-[11px] font-bold number-mono">
                          Blood: {appt.patient.bloodGroup}
                        </span>
                      )}

                      {appt.patient?.user?.phone && (
                        <span className="text-xs text-muted number-mono">
                          Ph: {appt.patient.user.phone}
                        </span>
                      )}

                      {appt.patient?.gender && (
                        <span className="text-xs text-muted">Gender: {appt.patient.gender}</span>
                      )}
                    </div>

                    {appt.reason && (
                      <p className="text-xs text-body bg-surface-strong/60 p-2.5 rounded-lg border border-hairline max-w-xl">
                        <span className="font-semibold text-ink">Patient Chief Complaint:</span>{' '}
                        {appt.reason}
                      </p>
                    )}

                    {appt.prescription && (
                      <div className="text-xs text-brand font-medium flex items-center gap-1">
                        <CheckCircle2 className="h-3.5 w-3.5 text-semantic-up" />
                        <span>Prescription on file: &ldquo;{appt.prescription.diagnosis}&rdquo;</span>
                      </div>
                    )}
                  </div>

                  {/* Right: Operational Clinical Actions */}
                  <div className="flex items-center gap-2 shrink-0 flex-wrap">
                    {/* Patient Arrived: Check In */}
                    {isConfirmed && (
                      <button
                        onClick={() => handleCheckIn(appt.id)}
                        className="btn-secondary !py-2 !px-3 !text-xs flex items-center gap-1.5"
                      >
                        <UserCheck className="h-3.5 w-3.5 text-brand" /> Patient Arrived
                      </button>
                    )}

                    {/* Waiting Room Patient: Start Consultation */}
                    {isCheckedIn && (
                      <button
                        onClick={() => handleStartConsultation(appt)}
                        className="px-4 py-2 rounded-pill bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs flex items-center gap-1.5 shadow-sm transition"
                      >
                        <PlayCircle className="h-4 w-4" /> Start Consultation
                      </button>
                    )}

                    {/* In Progress Consultation: Complete or Resume */}
                    {isInProgress && (
                      <button
                        onClick={() => handleStartConsultation(appt)}
                        className="btn-primary !py-2 !px-4 !text-xs flex items-center gap-1.5 shadow-sm"
                      >
                        <Pill className="h-3.5 w-3.5" /> Resume & Prescribe
                      </button>
                    )}

                    {/* Confirmed Direct Consultation Launcher */}
                    {isConfirmed && (
                      <button
                        onClick={() => handleStartConsultation(appt)}
                        className="btn-primary !py-2 !px-4 !text-xs flex items-center gap-1.5 shadow-sm"
                      >
                        <PlayCircle className="h-3.5 w-3.5" /> Start Consultation
                      </button>
                    )}

                    {/* Completed: View Prescription */}
                    {appt.prescription && (
                      <button
                        onClick={() => setViewRxModalAppt(appt)}
                        className="btn-secondary !py-2 !px-3 !text-xs flex items-center gap-1.5"
                      >
                        <FileText className="h-3.5 w-3.5 text-brand" /> View Prescription
                      </button>
                    )}

                    {/* Patient EHR Timeline */}
                    <Link
                      href={`/medical-records?patientId=${appt.patientId}`}
                      className="btn-secondary !py-2 !px-3 !text-xs flex items-center gap-1.5"
                    >
                      <Eye className="h-3.5 w-3.5" /> View EHR
                    </Link>

                    {/* Mark No Show */}
                    {(isConfirmed || isCheckedIn) && (
                      <button
                        onClick={() => handleMarkNoShow(appt.id)}
                        className="px-3 py-2 rounded-pill border border-hairline text-muted hover:text-ink text-xs font-semibold transition"
                      >
                        No Show
                      </button>
                    )}

                    {/* Cancel consultation */}
                    {isConfirmed && (
                      <button
                        onClick={() => handleCancelAppt(appt.id)}
                        className="px-3 py-2 rounded-pill border border-red-200 text-semantic-down hover:bg-red-50 text-xs font-semibold transition"
                      >
                        Cancel
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* MODAL 1: Schedule & Break Times Configuration Modal */}
      <Modal
        isOpen={isScheduleModalOpen}
        onClose={() => setIsScheduleModalOpen(false)}
        title="Configure Shifts & Break Times"
        subtitle="Define active shift hours, daily break intervals (e.g. lunch hour), and slot duration."
        maxWidth="xl"
      >
        <div className="space-y-6">
          {scheduleError && (
            <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-semantic-down text-xs flex items-center gap-2">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{scheduleError}</span>
            </div>
          )}

          <div className="space-y-3">
            {editingSchedules.length === 0 ? (
              <div className="p-8 text-center text-xs text-muted bg-surface-soft rounded-xl">
                No active shifts defined. Click below to add working shift hours.
              </div>
            ) : (
              editingSchedules.map((schedule, idx) => (
                <div
                  key={idx}
                  className="p-4 rounded-xl border border-hairline bg-surface-soft space-y-3"
                >
                  <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-center">
                    <div className="sm:col-span-3">
                      <label className="block text-[10px] font-semibold uppercase text-muted mb-1">
                        Day of Week
                      </label>
                      <select
                        value={schedule.dayOfWeek}
                        onChange={(e) => {
                          const val = parseInt(e.target.value, 10);
                          setEditingSchedules((prev) => {
                            const next = [...prev];
                            next[idx].dayOfWeek = val;
                            return next;
                          });
                        }}
                        className="text-input-md w-full !py-1.5 text-xs font-medium"
                      >
                        {DAYS_OF_WEEK.map((day, dIdx) => (
                          <option key={dIdx} value={dIdx}>
                            {day}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="sm:col-span-3">
                      <label className="block text-[10px] font-semibold uppercase text-muted mb-1">
                        Shift Start
                      </label>
                      <input
                        type="time"
                        value={schedule.startTime}
                        onChange={(e) => {
                          const val = e.target.value;
                          setEditingSchedules((prev) => {
                            const next = [...prev];
                            next[idx].startTime = val;
                            return next;
                          });
                        }}
                        className="text-input-md w-full !py-1.5 text-xs font-medium number-mono"
                      />
                    </div>

                    <div className="sm:col-span-3">
                      <label className="block text-[10px] font-semibold uppercase text-muted mb-1">
                        Shift End
                      </label>
                      <input
                        type="time"
                        value={schedule.endTime}
                        onChange={(e) => {
                          const val = e.target.value;
                          setEditingSchedules((prev) => {
                            const next = [...prev];
                            next[idx].endTime = val;
                            return next;
                          });
                        }}
                        className="text-input-md w-full !py-1.5 text-xs font-medium number-mono"
                      />
                    </div>

                    <div className="sm:col-span-2">
                      <label className="block text-[10px] font-semibold uppercase text-muted mb-1">
                        Slot Duration
                      </label>
                      <select
                        value={schedule.slotDuration}
                        onChange={(e) => {
                          const val = parseInt(e.target.value, 10);
                          setEditingSchedules((prev) => {
                            const next = [...prev];
                            next[idx].slotDuration = val;
                            return next;
                          });
                        }}
                        className="text-input-md w-full !py-1.5 text-xs font-medium"
                      >
                        <option value={15}>15 min</option>
                        <option value={30}>30 min</option>
                        <option value={45}>45 min</option>
                        <option value={60}>60 min</option>
                      </select>
                    </div>

                    <div className="sm:col-span-1 flex justify-center pt-4 sm:pt-0">
                      <button
                        type="button"
                        onClick={() => handleRemoveScheduleDay(idx)}
                        title="Remove Shift"
                        className="p-1.5 text-muted hover:text-semantic-down rounded-lg transition"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>

                  {/* Break Time Inputs */}
                  <div className="pt-2 border-t border-hairline/60 grid grid-cols-1 sm:grid-cols-2 gap-3 bg-white/60 p-2.5 rounded-lg">
                    <div>
                      <label className="block text-[10px] font-semibold text-amber-800 uppercase flex items-center gap-1 mb-1">
                        <Coffee className="h-3 w-3" /> Break Start (e.g. Lunch)
                      </label>
                      <input
                        type="time"
                        value={schedule.breakStartTime || ''}
                        onChange={(e) => {
                          const val = e.target.value;
                          setEditingSchedules((prev) => {
                            const next = [...prev];
                            next[idx].breakStartTime = val;
                            return next;
                          });
                        }}
                        className="text-input-md w-full !py-1 text-xs number-mono"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-semibold text-amber-800 uppercase flex items-center gap-1 mb-1">
                        <Coffee className="h-3 w-3" /> Break End
                      </label>
                      <input
                        type="time"
                        value={schedule.breakEndTime || ''}
                        onChange={(e) => {
                          const val = e.target.value;
                          setEditingSchedules((prev) => {
                            const next = [...prev];
                            next[idx].breakEndTime = val;
                            return next;
                          });
                        }}
                        className="text-input-md w-full !py-1 text-xs number-mono"
                      />
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          <div className="flex items-center justify-between pt-2">
            <button
              type="button"
              onClick={handleAddScheduleDay}
              className="btn-secondary !py-2 !px-3 text-xs flex items-center gap-1.5"
            >
              <Plus className="h-3.5 w-3.5" /> Add Working Shift
            </button>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setIsScheduleModalOpen(false)}
                className="btn-secondary !py-2 !px-4 text-xs"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveSchedules}
                disabled={savingSchedule}
                className="btn-primary !py-2 !px-5 text-xs"
              >
                {savingSchedule ? 'Saving Schedule...' : 'Save Shifts & Breaks'}
              </button>
            </div>
          </div>
        </div>
      </Modal>

      {/* MODAL 2: Doctor Leave Management Modal */}
      <Modal
        isOpen={isLeaveModalOpen}
        onClose={() => setIsLeaveModalOpen(false)}
        title="Physician Leave & Unavailability Desk"
        subtitle="Schedule personal leave or conference absence. Conflicting booked patient slots will be automatically flagged."
        maxWidth="lg"
      >
        <div className="space-y-6">
          {leaveError && (
            <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-semantic-down text-xs flex items-center gap-2">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{leaveError}</span>
            </div>
          )}

          {leaveConflictWarning && (
            <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-300 text-amber-900 text-xs flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 shrink-0 text-amber-600" />
              <span>{leaveConflictWarning}</span>
            </div>
          )}

          {/* New Leave Schedule Form */}
          <form onSubmit={handleAddLeave} className="p-4 rounded-xl border border-hairline bg-surface-soft space-y-4">
            <h4 className="text-xs font-bold uppercase text-ink tracking-wider">
              Schedule New Leave Period
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[10px] font-semibold uppercase text-muted mb-1">
                  Start Date
                </label>
                <input
                  type="date"
                  required
                  value={leaveStartDate}
                  onChange={(e) => setLeaveStartDate(e.target.value)}
                  className="text-input-md w-full !py-1.5 text-xs font-medium number-mono"
                />
              </div>

              <div>
                <label className="block text-[10px] font-semibold uppercase text-muted mb-1">
                  End Date
                </label>
                <input
                  type="date"
                  required
                  value={leaveEndDate}
                  onChange={(e) => setLeaveEndDate(e.target.value)}
                  className="text-input-md w-full !py-1.5 text-xs font-medium number-mono"
                />
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-semibold uppercase text-muted mb-1">
                Reason / Note
              </label>
              <input
                type="text"
                placeholder="e.g. Annual Medical Conference, Personal Leave"
                value={leaveReason}
                onChange={(e) => setLeaveReason(e.target.value)}
                className="text-input-md w-full !py-1.5 text-xs font-medium"
              />
            </div>

            <div className="flex justify-end pt-1">
              <button
                type="submit"
                disabled={savingLeave}
                className="btn-primary !py-2 !px-4 text-xs flex items-center gap-1.5"
              >
                <Plus className="h-3.5 w-3.5" />
                {savingLeave ? 'Recording Leave...' : 'Apply Leave Period'}
              </button>
            </div>
          </form>

          {/* Existing Leaves List */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold uppercase text-ink tracking-wider">
              Active & Upcoming Leave Records
            </h4>

            {leavesList.length === 0 ? (
              <div className="p-6 text-center text-xs text-muted bg-surface-soft rounded-xl">
                No leave periods currently registered.
              </div>
            ) : (
              <div className="space-y-2">
                {leavesList.map((leave) => {
                  const sStr = new Date(leave.startDate).toISOString().split('T')[0];
                  const eStr = new Date(leave.endDate).toISOString().split('T')[0];

                  return (
                    <div
                      key={leave.id}
                      className="p-3.5 rounded-xl border border-hairline bg-white flex items-center justify-between gap-4"
                    >
                      <div>
                        <div className="text-xs font-semibold text-ink flex items-center gap-2">
                          <CalendarOff className="h-3.5 w-3.5 text-brand" />
                          <span className="number-mono">
                            {sStr} to {eStr}
                          </span>
                        </div>
                        <div className="text-[11px] text-muted mt-0.5">{leave.reason}</div>
                      </div>

                      <button
                        onClick={() => handleDeleteLeave(leave.id)}
                        className="p-1.5 text-muted hover:text-semantic-down rounded-lg transition"
                        title="Cancel this leave"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="pt-2 border-t border-hairline flex justify-end">
            <button
              onClick={() => setIsLeaveModalOpen(false)}
              className="btn-secondary !py-2 !px-4 text-xs"
            >
              Close
            </button>
          </div>
        </div>
      </Modal>

      {/* MODAL 3: Interactive Consultation & Clinical Findings Desk */}
      <Modal
        isOpen={isRxModalOpen}
        onClose={() => setIsRxModalOpen(false)}
        title="Clinical Consultation & Electronic Prescription"
        subtitle={`Examining ${activeConsultationAppt?.patient?.user?.name || 'Patient'} • Auto-generates itemized hospital bill upon completion.`}
        maxWidth="xl"
      >
        <form onSubmit={handleSubmitPrescription} className="space-y-6">
          {rxError && (
            <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-semantic-down text-xs flex items-center gap-2">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{rxError}</span>
            </div>
          )}

          {/* Patient Quick Summary Banner */}
          <div className="p-4 rounded-xl bg-surface-soft border border-hairline flex flex-wrap items-center justify-between gap-4 text-xs">
            <div>
              <span className="text-muted uppercase font-semibold text-[10px]">Patient Name</span>
              <div className="font-semibold text-ink text-sm">
                {activeConsultationAppt?.patient?.user?.name}
              </div>
            </div>
            <div>
              <span className="text-muted uppercase font-semibold text-[10px]">Blood Group</span>
              <div className="font-bold text-semantic-down">
                {activeConsultationAppt?.patient?.bloodGroup || 'Not specified'}
              </div>
            </div>
            <div>
              <span className="text-muted uppercase font-semibold text-[10px]">Appointment Time</span>
              <div className="number-mono text-ink">
                {activeConsultationAppt &&
                  new Date(activeConsultationAppt.appointmentDate).toISOString().split('T')[0]}{' '}
                at {activeConsultationAppt?.timeSlot}
              </div>
            </div>
            <div>
              <span className="text-muted uppercase font-semibold text-[10px]">Emergency Contact</span>
              <div className="text-body">{activeConsultationAppt?.patient?.emergencyContact || 'None'}</div>
            </div>
          </div>

          {/* Past EHR History Accordion */}
          {patientPastHistory && patientPastHistory.prescriptions?.length > 0 && (
            <div className="p-3.5 rounded-xl bg-blue-50/50 border border-blue-200 text-xs space-y-2">
              <div className="font-semibold text-ink flex items-center gap-1.5">
                <History className="h-4 w-4 text-brand" />
                <span>Patient Medical History ({patientPastHistory.prescriptions.length} past visits)</span>
              </div>
              <div className="max-h-28 overflow-y-auto space-y-1.5 pr-2">
                {patientPastHistory.prescriptions.slice(0, 3).map((p: any) => (
                  <div key={p.id} className="p-2 rounded bg-white border border-blue-100 flex items-center justify-between">
                    <div>
                      <span className="font-semibold text-ink">{p.diagnosis}</span>
                      <span className="text-muted ml-2">by Dr. {p.doctor?.user?.name}</span>
                    </div>
                    <span className="text-muted number-mono">
                      {new Date(p.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Symptoms & Chief Complaints */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-ink mb-1.5">
              Symptoms / Chief Complaints
            </label>
            <textarea
              rows={2}
              value={rxSymptoms}
              onChange={(e) => setRxSymptoms(e.target.value)}
              placeholder="e.g. High fever for 3 days, persistent dry cough, fatigue..."
              className="text-input-md w-full resize-none"
            />
          </div>

          {/* Clinical Diagnosis Input */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-ink mb-1.5">
              Clinical Diagnosis <span className="text-semantic-down">*</span>
            </label>
            <input
              type="text"
              required
              value={rxDiagnosis}
              onChange={(e) => setRxDiagnosis(e.target.value)}
              placeholder="e.g. Acute Bronchitis, Essential Hypertension Stage 1"
              className="text-input-md w-full"
            />
          </div>

          {/* Clinical Notes & Follow-Up Date in 2 columns */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold uppercase tracking-wider text-ink mb-1.5">
                Physician Notes & Clinical Advice
              </label>
              <input
                type="text"
                value={rxNotes}
                onChange={(e) => setRxNotes(e.target.value)}
                placeholder="Dietary instructions, rest recommendations, or special tests..."
                className="text-input-md w-full"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-ink mb-1.5">
                Follow-up Date
              </label>
              <input
                type="date"
                value={rxFollowUpDate}
                onChange={(e) => setRxFollowUpDate(e.target.value)}
                className="text-input-md w-full number-mono"
              />
            </div>
          </div>

          {/* Prescribed Medications Dynamic Array */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-semibold uppercase tracking-wider text-ink">
                Prescribed Medications <span className="text-semantic-down">*</span>
              </label>
              <button
                type="button"
                onClick={handleAddMedication}
                className="text-xs font-semibold text-brand hover:underline flex items-center gap-1"
              >
                <Plus className="h-3.5 w-3.5" /> Add Drug
              </button>
            </div>

            <div className="space-y-2.5">
              {rxMedications.map((med, idx) => (
                <div
                  key={idx}
                  className="p-3.5 rounded-xl border border-hairline bg-surface-soft grid grid-cols-1 sm:grid-cols-12 gap-2.5 items-center"
                >
                  <div className="sm:col-span-4">
                    <input
                      type="text"
                      required
                      placeholder="Medicine (e.g. Amoxicillin 500mg)"
                      value={med.name}
                      onChange={(e) => handleUpdateMedication(idx, 'name', e.target.value)}
                      className="text-input-md w-full !py-1.5 text-xs font-medium"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <input
                      type="text"
                      required
                      placeholder="Dosage (e.g. 1 tab)"
                      value={med.dosage}
                      onChange={(e) => handleUpdateMedication(idx, 'dosage', e.target.value)}
                      className="text-input-md w-full !py-1.5 text-xs"
                    />
                  </div>

                  <div className="sm:col-span-3">
                    <input
                      type="text"
                      required
                      placeholder="Frequency (e.g. 3x daily)"
                      value={med.frequency}
                      onChange={(e) => handleUpdateMedication(idx, 'frequency', e.target.value)}
                      className="text-input-md w-full !py-1.5 text-xs"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <input
                      type="text"
                      required
                      placeholder="Duration (e.g. 7 days)"
                      value={med.duration}
                      onChange={(e) => handleUpdateMedication(idx, 'duration', e.target.value)}
                      className="text-input-md w-full !py-1.5 text-xs"
                    />
                  </div>

                  <div className="sm:col-span-1 flex justify-center">
                    {rxMedications.length > 1 && (
                      <button
                        type="button"
                        onClick={() => handleRemoveMedication(idx)}
                        className="p-1 text-muted hover:text-semantic-down transition"
                        title="Remove Drug"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Modal Footer Actions */}
          <div className="pt-4 border-t border-hairline flex items-center justify-between flex-wrap gap-2">
            <span className="text-xs text-muted">
              Issuing prescription will automatically mark consultation as COMPLETED and generate hospital bill.
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setIsRxModalOpen(false)}
                className="btn-secondary !py-2 !px-4 text-xs"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={issuingRx}
                className="btn-primary !py-2 !px-5 text-xs flex items-center gap-1.5"
              >
                <CheckCircle2 className="h-4 w-4" />
                {issuingRx ? 'Finalizing Consultation...' : 'Complete Consultation & Generate Bill'}
              </button>
            </div>
          </div>
        </form>
      </Modal>

      {/* MODAL 4: View Prescription Modal */}
      <Modal
        isOpen={!!viewRxModalAppt}
        onClose={() => setViewRxModalAppt(null)}
        title="Electronic Prescription Record"
        subtitle={`Issued for ${viewRxModalAppt?.patient?.user?.name || 'Patient'} on ${
          viewRxModalAppt?.prescription?.createdAt
            ? new Date(viewRxModalAppt.prescription.createdAt).toLocaleDateString()
            : ''
        }`}
        maxWidth="lg"
      >
        {viewRxModalAppt?.prescription ? (
          <div className="space-y-6 text-sm">
            <div className="p-4 rounded-xl bg-surface-soft border border-hairline space-y-2">
              {viewRxModalAppt.prescription.symptoms && (
                <div className="text-xs text-body pb-2 border-b border-hairline">
                  <span className="font-semibold text-ink">Chief Complaints / Symptoms:</span>{' '}
                  {viewRxModalAppt.prescription.symptoms}
                </div>
              )}
              <div className="text-xs uppercase font-semibold text-muted">Clinical Diagnosis</div>
              <div className="text-base font-semibold text-ink">
                {viewRxModalAppt.prescription.diagnosis}
              </div>
              {viewRxModalAppt.prescription.notes && (
                <div className="text-xs text-body pt-1 border-t border-hairline">
                  <span className="font-semibold text-ink">Physician Advice:</span>{' '}
                  {viewRxModalAppt.prescription.notes}
                </div>
              )}
              {viewRxModalAppt.prescription.followUpDate && (
                <div className="text-xs text-brand font-medium pt-1">
                  Follow-up Consultation Recommended:{' '}
                  <span className="font-bold number-mono">
                    {new Date(viewRxModalAppt.prescription.followUpDate).toLocaleDateString()}
                  </span>
                </div>
              )}
            </div>

            <div>
              <div className="text-xs uppercase font-semibold text-muted mb-2">
                Prescribed Drug Regimen
              </div>
              <div className="space-y-2">
                {Array.isArray(viewRxModalAppt.prescription.medications) &&
                  viewRxModalAppt.prescription.medications.map((m: any, mIdx: number) => (
                    <div
                      key={mIdx}
                      className="p-3 rounded-lg border border-hairline bg-surface-soft flex items-center justify-between text-xs"
                    >
                      <div>
                        <div className="font-semibold text-ink">{m.name}</div>
                        <div className="text-muted">
                          {m.dosage} • {m.frequency}
                        </div>
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
                onClick={() => setViewRxModalAppt(null)}
                className="btn-secondary !py-2 !px-4 text-xs"
              >
                Close Prescription
              </button>
            </div>
          </div>
        ) : (
          <div className="py-8 text-center text-xs text-muted">No prescription details available.</div>
        )}
      </Modal>
    </DashboardShell>
  );
}
