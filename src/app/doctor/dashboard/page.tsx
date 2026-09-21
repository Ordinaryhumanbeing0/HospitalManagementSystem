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
} from 'lucide-react';
import { DashboardShell } from '@/components/ui/DashboardShell';
import { Modal } from '@/components/ui/Modal';
import { getAuthUserAction } from '@/actions/auth';
import { getDoctorByIdAction, updateDoctorScheduleAction } from '@/actions/doctor';
import { getAppointmentsAction, updateAppointmentStatusAction } from '@/actions/appointment';
import { createPrescriptionAction } from '@/actions/medical-record';
import { SessionUser, MedicationItemType } from '@/types';
import { AppointmentStatus } from '@prisma/client';

const DAYS_OF_WEEK = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

export default function DoctorDashboardPage() {
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState<SessionUser | null>(null);
  const [doctorProfile, setDoctorProfile] = useState<any | null>(null);
  const [appointments, setAppointments] = useState<any[]>([]);
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'CONFIRMED' | 'COMPLETED' | 'CANCELLED'>('CONFIRMED');
  const [loading, setLoading] = useState(true);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // 1. Schedule Configuration Modal State
  const [isScheduleModalOpen, setIsScheduleModalOpen] = useState(false);
  const [editingSchedules, setEditingSchedules] = useState<
    Array<{ dayOfWeek: number; startTime: string; endTime: string; slotDuration: number; isActive: boolean }>
  >([]);
  const [savingSchedule, setSavingSchedule] = useState(false);
  const [scheduleError, setScheduleError] = useState<string | null>(null);

  // 2. Consultation & Prescription Modal State
  const [isRxModalOpen, setIsRxModalOpen] = useState(false);
  const [activeConsultationAppt, setActiveConsultationAppt] = useState<any | null>(null);
  const [rxDiagnosis, setRxDiagnosis] = useState('');
  const [rxNotes, setRxNotes] = useState('');
  const [rxMedications, setRxMedications] = useState<MedicationItemType[]>([
    { name: '', dosage: '', frequency: 'Twice daily after meals', duration: '5 days', instructions: '' },
  ]);
  const [issuingRx, setIssuingRx] = useState(false);
  const [rxError, setRxError] = useState<string | null>(null);

  // 3. View Prescription Modal State
  const [viewRxModalAppt, setViewRxModalAppt] = useState<any | null>(null);

  const loadData = async (userDocId: string, filter: string) => {
    setLoading(true);
    const [docRes, apptRes] = await Promise.all([
      getDoctorByIdAction(userDocId),
      getAppointmentsAction({
        status: filter !== 'ALL' ? (filter as any) : undefined,
        doctorId: userDocId,
        limit: 20,
      }),
    ]);
    if (docRes.success && docRes.data) {
      setDoctorProfile(docRes.data);
      if (docRes.data.schedules) {
        setEditingSchedules(
          docRes.data.schedules.map((s: any) => ({
            dayOfWeek: s.dayOfWeek,
            startTime: s.startTime,
            endTime: s.endTime,
            slotDuration: s.slotDuration || 30,
            isActive: s.isActive ?? true,
          }))
        );
      }
    }
    if (apptRes.success && apptRes.data) {
      setAppointments(apptRes.data.appointments);
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

  const handleFilterChange = (filter: 'ALL' | 'CONFIRMED' | 'COMPLETED' | 'CANCELLED') => {
    setStatusFilter(filter);
    if (currentUser?.doctorId) {
      loadData(currentUser.doctorId, filter);
    }
  };

  // --- Schedule Handlers ---
  const handleAddScheduleDay = () => {
    setEditingSchedules((prev) => [
      ...prev,
      { dayOfWeek: 1, startTime: '09:00', endTime: '17:00', slotDuration: 30, isActive: true },
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

    setToastMessage('Weekly working shifts successfully updated!');
    setIsScheduleModalOpen(false);
    setSavingSchedule(false);
    loadData(currentUser.doctorId, statusFilter);
  };

  // --- Consultation & Prescription Handlers ---
  const handleOpenConsultation = (appt: any) => {
    setActiveConsultationAppt(appt);
    setRxDiagnosis('');
    setRxNotes('');
    setRxMedications([
      { name: '', dosage: '', frequency: 'Twice daily after meals', duration: '5 days', instructions: '' },
    ]);
    setRxError(null);
    setIsRxModalOpen(true);
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
      setRxError('Diagnosis is required to complete consultation.');
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
      diagnosis: rxDiagnosis.trim(),
      notes: rxNotes.trim() || undefined,
      medications: validMeds,
    });

    if (!res.success) {
      setRxError(res.message || 'Failed to issue prescription.');
      setIssuingRx(false);
      return;
    }

    setToastMessage(
      `Consultation completed! Prescription issued for patient ${activeConsultationAppt.patient?.user?.name || 'record'}.`
    );
    setIsRxModalOpen(false);
    setIssuingRx(false);
    loadData(currentUser.doctorId, statusFilter);
  };

  // --- Mark Appointment Status Handler ---
  const handleUpdateStatus = async (apptId: string, status: AppointmentStatus) => {
    const res = await updateAppointmentStatusAction(apptId, status);
    if (res.success) {
      setToastMessage(`Appointment marked as ${status}.`);
      if (currentUser?.doctorId) {
        loadData(currentUser.doctorId, statusFilter);
      }
    } else {
      setToastMessage(res.message || 'Failed to update appointment status.');
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
      title={`Clinical Workstation • ${currentUser.name}`}
      subtitle="Shift scheduling, patient intake queue, consultation room, and digital prescription issuance."
      badge="Doctor Portal"
      actionButton={
        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsScheduleModalOpen(true)}
            className="btn-secondary flex items-center gap-2 text-xs !py-2 !px-3"
          >
            <Clock className="h-4 w-4 text-brand" /> Configure My Schedule
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

      {/* Physician Info & Shift Timing Banner */}
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
                  {currentUser.name}
                </h2>
                <p className="text-sm text-muted-soft mt-1">
                  {doctorProfile?.specialization || 'Clinical Specialist'} •{' '}
                  {doctorProfile?.qualification || 'MD'}
                </p>
              </div>

              <div className="h-12 w-12 rounded-full bg-surface-dark-elevated flex items-center justify-center text-brand">
                <Stethoscope className="h-6 w-6" />
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mt-8 pt-6 border-t border-surface-dark-elevated text-xs">
              <div>
                <div className="text-[10px] font-semibold uppercase text-muted tracking-wider">
                  Consultation Fee
                </div>
                <div className="text-lg font-bold text-semantic-up number-mono mt-0.5">
                  ${Number(doctorProfile?.consultationFee || 0).toFixed(2)}
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
                  Department
                </div>
                <div className="text-sm font-semibold text-white mt-0.5 truncate">
                  {doctorProfile?.department?.name || 'General Medicine'}
                </div>
              </div>
            </div>
          </div>

          <div className="pt-6 mt-6 border-t border-surface-dark-elevated flex items-center justify-between">
            <span className="text-xs text-muted-soft">
              Weekly shift slots: 30-min intervals with concurrency lock
            </span>
            <button
              onClick={() => setIsScheduleModalOpen(true)}
              className="text-xs font-semibold text-brand hover:underline"
            >
              Modify Working Shifts &rarr;
            </button>
          </div>
        </div>

        {/* Quick Shift Summary Card */}
        <div className="bg-white rounded-xl border border-hairline p-6 shadow-soft space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-semibold text-ink flex items-center gap-2">
              <Clock className="h-4 w-4 text-brand" /> Duty Timetable
            </h3>
            <button
              onClick={() => setIsScheduleModalOpen(true)}
              className="text-xs text-brand font-semibold hover:underline"
            >
              Edit
            </button>
          </div>

          {doctorProfile?.schedules && doctorProfile.schedules.length > 0 ? (
            <div className="space-y-2 text-xs">
              {doctorProfile.schedules.map((s: any) => (
                <div
                  key={s.id}
                  className="p-2.5 rounded-lg bg-surface-soft border border-hairline flex items-center justify-between"
                >
                  <span className="font-semibold text-ink">{DAYS_OF_WEEK[s.dayOfWeek]}</span>
                  <span className="number-mono text-muted">
                    {s.startTime} - {s.endTime} ({s.slotDuration}m)
                  </span>
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

      {/* Main Consultation Management & Queue */}
      <div className="bg-white rounded-xl border border-hairline shadow-soft overflow-hidden mb-10">
        <div className="p-6 border-b border-hairline flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h3 className="text-lg font-semibold text-ink flex items-center gap-2">
              <Calendar className="h-5 w-5 text-brand" /> Patient Consultation Queue
            </h3>
            <p className="text-xs text-muted mt-0.5">
              Review assigned patient visits, launch consultations, and record electronic prescriptions.
            </p>
          </div>

          {/* Status Filter Tabs */}
          <div className="flex items-center gap-1.5 p-1 rounded-pill bg-surface-soft border border-hairline">
            {(['ALL', 'CONFIRMED', 'COMPLETED', 'CANCELLED'] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => handleFilterChange(tab)}
                className={`px-3.5 py-1.5 rounded-pill text-xs font-semibold transition ${
                  statusFilter === tab
                    ? 'bg-white text-ink shadow-sm border border-hairline'
                    : 'text-muted hover:text-ink'
                }`}
              >
                {tab === 'CONFIRMED' ? 'Confirmed Queue' : tab}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="py-16 text-center text-sm text-muted">
            Loading consultations queue...
          </div>
        ) : appointments.length === 0 ? (
          <div className="py-16 text-center text-sm text-body space-y-2">
            <Calendar className="h-8 w-8 text-muted mx-auto" />
            <div className="font-semibold text-ink">No appointments in this category.</div>
            <p className="text-xs text-muted">
              {statusFilter === 'CONFIRMED'
                ? 'All consultations are up-to-date! No pending patient visits waiting.'
                : 'No appointment records found.'}
            </p>
          </div>
        ) : (
          <div className="divide-y divide-hairline">
            {appointments.map((appt) => {
              const apptDateStr = new Date(appt.appointmentDate).toISOString().split('T')[0];
              const isConfirmed = appt.status === 'CONFIRMED';
              const isCompleted = appt.status === 'COMPLETED';

              return (
                <div
                  key={appt.id}
                  className="p-6 hover:bg-surface-soft transition flex flex-col md:flex-row md:items-center justify-between gap-6"
                >
                  {/* Left: Patient & Appointment Details */}
                  <div className="space-y-2 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span
                        className={`badge-pill text-[10px] ${
                          appt.status === 'CONFIRMED'
                            ? '!bg-emerald-50 !text-emerald-700 !border-emerald-200'
                            : appt.status === 'COMPLETED'
                            ? '!bg-blue-50 !text-brand !border-blue-200'
                            : '!bg-red-50 !text-semantic-down !border-red-200'
                        }`}
                      >
                        {appt.status}
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

                  {/* Right: Clinical Action Buttons */}
                  <div className="flex items-center gap-2 shrink-0 flex-wrap">
                    {/* Launch Consultation & Write Rx */}
                    {isConfirmed && (
                      <button
                        onClick={() => handleOpenConsultation(appt)}
                        className="btn-primary !py-2 !px-4 !text-xs flex items-center gap-1.5 shadow-sm"
                      >
                        <Pill className="h-3.5 w-3.5" /> Start & Prescribe
                      </button>
                    )}

                    {/* View Prescription */}
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
                    {isConfirmed && (
                      <button
                        onClick={() => handleUpdateStatus(appt.id, 'NO_SHOW')}
                        className="px-3 py-2 rounded-pill border border-hairline text-muted hover:text-ink text-xs font-semibold transition"
                      >
                        No Show
                      </button>
                    )}

                    {/* Cancel consultation */}
                    {isConfirmed && (
                      <button
                        onClick={() => handleUpdateStatus(appt.id, 'CANCELLED')}
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

      {/* MODAL 1: Schedule Configuration Modal */}
      <Modal
        isOpen={isScheduleModalOpen}
        onClose={() => setIsScheduleModalOpen(false)}
        title="Configure Weekly Working Shifts"
        subtitle="Set active consultation days, shift timings, and slot duration intervals."
        maxWidth="lg"
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
                  className="p-4 rounded-xl border border-hairline bg-surface-soft grid grid-cols-1 sm:grid-cols-12 gap-3 items-center"
                >
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
                      Start Time
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
                      End Time
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
                {savingSchedule ? 'Saving Schedule...' : 'Save Shifts'}
              </button>
            </div>
          </div>
        </div>
      </Modal>

      {/* MODAL 2: Interactive Consultation & Digital Prescription Builder */}
      <Modal
        isOpen={isRxModalOpen}
        onClose={() => setIsRxModalOpen(false)}
        title="Clinical Consultation & Prescription"
        subtitle={`Recording diagnosis and electronic prescription for ${activeConsultationAppt?.patient?.user?.name || 'Patient'}.`}
        maxWidth="xl"
      >
        <form onSubmit={handleSubmitPrescription} className="space-y-6">
          {rxError && (
            <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-semantic-down text-xs flex items-center gap-2">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{rxError}</span>
            </div>
          )}

          {/* Patient Quick Medical Summary Banner */}
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

          {/* Clinical Observations & Advice */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-ink mb-1.5">
              Physician Notes & Clinical Advice
            </label>
            <textarea
              rows={2}
              value={rxNotes}
              onChange={(e) => setRxNotes(e.target.value)}
              placeholder="Dietary instructions, follow-up recommendations, or clinical observations..."
              className="text-input-md w-full resize-none"
            />
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
          <div className="pt-4 border-t border-hairline flex items-center justify-between">
            <span className="text-xs text-muted">
              Issuing prescription will automatically mark consultation as COMPLETED.
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
                {issuingRx ? 'Issuing Prescription...' : 'Complete & Issue Prescription'}
              </button>
            </div>
          </div>
        </form>
      </Modal>

      {/* MODAL 3: View Prescription Modal */}
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
