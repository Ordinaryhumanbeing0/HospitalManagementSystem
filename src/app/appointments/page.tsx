'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Calendar,
  Clock,
  Search,
  Plus,
  Filter,
  CheckCircle2,
  AlertCircle,
  XCircle,
  Stethoscope,
  Building2,
  User,
  FileText,
  Trash2,
  Edit2,
  Eye,
  RefreshCw,
  Pill,
  CreditCard,
  UserCheck,
} from 'lucide-react';
import { DashboardShell } from '@/components/ui/DashboardShell';
import { Modal } from '@/components/ui/Modal';
import {
  getAppointmentsAction,
  rescheduleAppointmentAction,
  cancelAppointmentAction,
  getAvailableSlotsAction,
  checkInAppointmentAction,
} from '@/actions/appointment';
import { createPrescriptionAction } from '@/actions/medical-record';
import { getAuthUserAction } from '@/actions/auth';
import { SessionUser, SlotInfo } from '@/types';

export default function AppointmentsPage() {
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState<SessionUser | null>(null);
  const [loadingUser, setLoadingUser] = useState(true);

  // Appointments List
  const [appointments, setAppointments] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);

  // Modals
  const [rescheduleModalAppt, setRescheduleModalAppt] = useState<any | null>(null);
  const [rescheduleDate, setRescheduleDate] = useState('');
  const [rescheduleSlot, setRescheduleSlot] = useState<string | null>(null);
  const [rescheduleSlots, setRescheduleSlots] = useState<SlotInfo[]>([]);
  const [loadingRescheduleSlots, setLoadingRescheduleSlots] = useState(false);
  const [rescheduleLoading, setRescheduleLoading] = useState(false);
  const [rescheduleError, setRescheduleError] = useState<string | null>(null);

  const [cancelModalAppt, setCancelModalAppt] = useState<any | null>(null);
  const [cancelReason, setCancelReason] = useState('');
  const [cancelLoading, setCancelLoading] = useState(false);

  // Prescription Modal (Doctor / Admin)
  const [prescriptionModalAppt, setPrescriptionModalAppt] = useState<any | null>(null);
  const [rxDiagnosis, setRxDiagnosis] = useState('');
  const [rxNotes, setRxNotes] = useState('');
  const [rxMedications, setRxMedications] = useState<
    Array<{ name: string; dosage: string; frequency: string; duration: string; instructions: string }>
  >([
    { name: '', dosage: '', frequency: 'Twice daily after meals', duration: '5 days', instructions: '' },
  ]);
  const [rxLoading, setRxLoading] = useState(false);
  const [rxError, setRxError] = useState<string | null>(null);

  // View Prescription Modal
  const [viewRxModalAppt, setViewRxModalAppt] = useState<any | null>(null);

  // Toast / notification message
  const [successToast, setSuccessToast] = useState<string | null>(null);

  // 1. Authenticate user
  useEffect(() => {
    getAuthUserAction().then((res) => {
      if (res.data) {
        setCurrentUser(res.data);
      } else {
        router.push('/login?callbackUrl=/appointments');
      }
      setLoadingUser(false);
    });
  }, [router]);

  // 2. Fetch appointments
  const loadAppointments = async (status = statusFilter, search = searchQuery, p = page) => {
    setLoading(true);
    const res = await getAppointmentsAction({
      status: status !== 'ALL' ? (status as any) : undefined,
      search: search || undefined,
      page: p,
      limit: 15,
    });
    if (res.success && res.data) {
      setAppointments(res.data.appointments);
      setTotal(res.data.total);
    }
    setLoading(false);
  };

  useEffect(() => {
    if (currentUser) {
      loadAppointments();
    }
  }, [currentUser, statusFilter, page]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    loadAppointments(statusFilter, searchQuery, 1);
  };

  // Reschedule Slot fetch
  useEffect(() => {
    if (rescheduleModalAppt && rescheduleDate) {
      setLoadingRescheduleSlots(true);
      setRescheduleSlot(null);
      getAvailableSlotsAction(rescheduleModalAppt.doctorId, rescheduleDate).then((res) => {
        if (res.success && res.data) {
          setRescheduleSlots(res.data.slots);
        } else {
          setRescheduleSlots([]);
        }
        setLoadingRescheduleSlots(false);
      });
    }
  }, [rescheduleModalAppt, rescheduleDate]);

  const handleRescheduleSubmit = async () => {
    if (!rescheduleModalAppt || !rescheduleDate || !rescheduleSlot) {
      setRescheduleError('Please select both a new date and an available slot.');
      return;
    }
    setRescheduleLoading(true);
    setRescheduleError(null);

    const res = await rescheduleAppointmentAction({
      appointmentId: rescheduleModalAppt.id,
      newDate: rescheduleDate,
      newTimeSlot: rescheduleSlot,
    });

    if (!res.success) {
      setRescheduleError(res.message || 'Failed to reschedule appointment.');
      setRescheduleLoading(false);
      return;
    }

    setRescheduleLoading(false);
    setRescheduleModalAppt(null);
    setSuccessToast('Appointment rescheduled successfully.');
    loadAppointments();
  };

  const handleCancelSubmit = async () => {
    if (!cancelModalAppt) return;
    setCancelLoading(true);

    const res = await cancelAppointmentAction({
      appointmentId: cancelModalAppt.id,
      reason: cancelReason || undefined,
    });

    if (res.success) {
      setCancelLoading(false);
      setCancelModalAppt(null);
      setCancelReason('');
      setSuccessToast('Appointment cancelled successfully.');
      loadAppointments();
    } else {
      setCancelLoading(false);
      alert(res.message || 'Error cancelling appointment.');
    }
  };

  const handleCheckIn = async (apptId: string) => {
    const res = await checkInAppointmentAction(apptId);
    if (res.success) {
      setSuccessToast('Check-in confirmed! You are queued in the clinical waiting room.');
      loadAppointments();
    } else {
      alert(res.message || 'Check-in failed.');
    }
  };

  // Prescription Handlers
  const handleAddMedication = () => {
    setRxMedications((prev) => [
      ...prev,
      { name: '', dosage: '', frequency: 'Twice daily', duration: '5 days', instructions: '' },
    ]);
  };

  const handleRemoveMedication = (idx: number) => {
    setRxMedications((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleMedicationChange = (idx: number, field: string, value: string) => {
    setRxMedications((prev) =>
      prev.map((item, i) => (i === idx ? { ...item, [field]: value } : item))
    );
  };

  const handlePrescriptionSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!prescriptionModalAppt) return;

    if (!rxDiagnosis.trim()) {
      setRxError('Please enter a clinical diagnosis.');
      return;
    }

    const invalidMed = rxMedications.some((m) => !m.name.trim() || !m.dosage.trim());
    if (invalidMed) {
      setRxError('Please fill in at least the Medicine Name and Dosage for all listed medications.');
      return;
    }

    setRxLoading(true);
    setRxError(null);

    const res = await createPrescriptionAction({
      appointmentId: prescriptionModalAppt.id,
      patientId: prescriptionModalAppt.patientId,
      doctorId: prescriptionModalAppt.doctorId,
      diagnosis: rxDiagnosis,
      notes: rxNotes || undefined,
      medications: rxMedications,
    });

    if (!res.success) {
      setRxError(res.message || 'Failed to submit prescription.');
      setRxLoading(false);
      return;
    }

    setRxLoading(false);
    setPrescriptionModalAppt(null);
    setRxDiagnosis('');
    setRxNotes('');
    setRxMedications([
      { name: '', dosage: '', frequency: 'Twice daily after meals', duration: '5 days', instructions: '' },
    ]);
    setSuccessToast('Prescription saved and consultation marked COMPLETED.');
    loadAppointments();
  };

  if (loadingUser || !currentUser) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white text-body">
        Loading appointments...
      </div>
    );
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'CHECKED_IN':
        return <span className="badge-pill !bg-amber-100 !text-amber-800 !border-amber-300 font-bold">WAITING IN CLINIC</span>;
      case 'IN_PROGRESS':
        return <span className="badge-pill !bg-blue-100 !text-blue-800 !border-blue-300 font-bold">IN EXAMINATION</span>;
      case 'CONFIRMED':
        return <span className="badge-pill !bg-emerald-50 !text-emerald-700 !border-emerald-200">CONFIRMED</span>;
      case 'SCHEDULED':
        return <span className="badge-pill !bg-slate-100 !text-slate-700 !border-slate-300">SCHEDULED</span>;
      case 'COMPLETED':
        return <span className="badge-pill !bg-emerald-100 !text-emerald-800 !border-emerald-300">COMPLETED</span>;
      case 'RESCHEDULED':
        return <span className="badge-pill !bg-purple-50 !text-purple-700 !border-purple-200">RESCHEDULED</span>;
      case 'NO_SHOW':
        return <span className="badge-pill !bg-orange-50 !text-orange-700 !border-orange-200">NO SHOW</span>;
      case 'CANCELLED':
        return <span className="badge-pill !bg-red-50 !text-semantic-down !border-red-200">CANCELLED</span>;
      default:
        return <span className="badge-pill">{status}</span>;
    }
  };

  return (
    <DashboardShell
      user={currentUser}
      title="Appointment Management Portal"
      subtitle="Track upcoming patient visits, review clinical consultations, and manage schedules."
      badge="Centralized Appointment Command"
      actionButton={
        <Link href="/appointments/book" className="btn-primary flex items-center gap-2">
          <Plus className="h-4 w-4" /> Book New Appointment
        </Link>
      }
    >
      {/* Success Toast */}
      {successToast && (
        <div className="mb-6 p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-semantic-up text-sm flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5" />
            <span>{successToast}</span>
          </div>
          <button onClick={() => setSuccessToast(null)} className="text-xs font-semibold hover:underline">
            Dismiss
          </button>
        </div>
      )}

      {/* Filter Tabs & Search Bar */}
      <div className="bg-white rounded-xl border border-hairline p-4 sm:p-6 mb-8 shadow-soft space-y-4">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
          {/* Status Tabs */}
          <div className="flex flex-wrap items-center gap-1.5 p-1 rounded-xl bg-surface-soft border border-hairline">
            {[
              { key: 'ALL', label: 'All' },
              { key: 'CHECKED_IN', label: 'Waiting Room' },
              { key: 'IN_PROGRESS', label: 'In Progress' },
              { key: 'CONFIRMED', label: 'Upcoming' },
              { key: 'COMPLETED', label: 'Completed' },
              { key: 'CANCELLED', label: 'Cancelled' },
            ].map((tab) => (
              <button
                key={tab.key}
                onClick={() => {
                  setStatusFilter(tab.key);
                  setPage(1);
                }}
                className={`px-3.5 py-1.5 rounded-pill text-xs font-semibold transition ${
                  statusFilter === tab.key
                    ? 'bg-white text-ink shadow-sm border border-hairline'
                    : 'text-muted hover:text-ink'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Search Input */}
          <form onSubmit={handleSearchSubmit} className="flex gap-2">
            <div className="relative flex-1 sm:w-72">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search patient, doctor, or reason..."
                className="search-pill w-full pl-10 !py-2 text-xs"
              />
              <Search className="h-3.5 w-3.5 text-muted absolute left-3.5 top-3 pointer-events-none" />
            </div>
            <button type="submit" className="btn-secondary !px-4 !py-2 !text-xs">
              Search
            </button>
          </form>
        </div>
      </div>

      {/* Appointments List */}
      <div className="bg-white rounded-xl border border-hairline shadow-soft overflow-hidden">
        <div className="p-5 border-b border-hairline flex items-center justify-between">
          <h3 className="text-base font-semibold text-ink flex items-center gap-2">
            <Calendar className="h-4 w-4 text-brand" /> Registered Consultations
          </h3>
          <span className="text-xs text-muted number-mono">Total: {total} record(s)</span>
        </div>

        {loading ? (
          <div className="py-16 text-center text-body text-sm">
            Retrieving appointment records...
          </div>
        ) : appointments.length === 0 ? (
          <div className="py-16 text-center text-body text-sm space-y-3">
            <Calendar className="h-8 w-8 mx-auto text-muted" />
            <div className="font-semibold text-ink">No appointments found matching this view.</div>
            <Link href="/appointments/book" className="btn-primary inline-flex !text-xs mt-2">
              Book First Appointment
            </Link>
          </div>
        ) : (
          <div className="divide-y divide-hairline">
            {appointments.map((appt) => {
              const apptDateStr = new Date(appt.appointmentDate).toISOString().split('T')[0];
              const isDoctor = currentUser.role === 'DOCTOR' || currentUser.role === 'ADMIN';
              const isConfirmed = appt.status === 'CONFIRMED';
              const isCompleted = appt.status === 'COMPLETED';

              return (
                <div key={appt.id} className="p-6 hover:bg-surface-soft transition space-y-4">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    {/* Left: Info */}
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        {getStatusBadge(appt.status)}
                        <span className="text-xs font-semibold text-ink number-mono">
                          {apptDateStr} at {appt.timeSlot}
                        </span>
                        <span className="text-xs text-muted">•</span>
                        <span className="text-xs text-muted font-medium">
                          {appt.doctor?.department?.name || 'Department'}
                        </span>
                      </div>

                      <div className="flex items-center gap-6 pt-1 flex-wrap">
                        <div className="text-sm font-semibold text-ink flex items-center gap-1.5">
                          <User className="h-4 w-4 text-brand" />
                          <span>Patient: {appt.patient?.user?.name || 'Patient'}</span>
                        </div>
                        <div className="text-sm text-body flex items-center gap-1.5">
                          <Stethoscope className="h-4 w-4 text-brand" />
                          <span>Doctor: Dr. {appt.doctor?.user?.name || 'Physician'}</span>
                        </div>
                      </div>

                      {appt.reason && (
                        <p className="text-xs text-body pt-1">
                          <span className="font-semibold text-ink">Reason:</span> {appt.reason}
                        </p>
                      )}
                    </div>

                    {/* Right: Actions */}
                    <div className="flex items-center gap-2 shrink-0 flex-wrap">
                      {/* Check In Action if Confirmed / Scheduled */}
                      {(appt.status === 'CONFIRMED' || appt.status === 'SCHEDULED') && (
                        <button
                          onClick={() => handleCheckIn(appt.id)}
                          className="btn-primary !py-2 !px-3 !text-xs flex items-center gap-1.5 shadow-sm"
                        >
                          <UserCheck className="h-3.5 w-3.5" /> Check In
                        </button>
                      )}

                      {/* Doctor Write Prescription */}
                      {isDoctor && (appt.status === 'CONFIRMED' || appt.status === 'CHECKED_IN' || appt.status === 'IN_PROGRESS') && (
                        <button
                          onClick={() => {
                            setPrescriptionModalAppt(appt);
                            setRxDiagnosis('');
                            setRxNotes('');
                          }}
                          className="btn-primary !py-2 !px-4 !text-xs flex items-center gap-1.5"
                        >
                          <Pill className="h-3.5 w-3.5" /> Consult & Prescribe
                        </button>
                      )}

                      {/* View Prescription if completed */}
                      {appt.prescription && (
                        <button
                          onClick={() => setViewRxModalAppt(appt)}
                          className="btn-secondary !py-2 !px-3 !text-xs flex items-center gap-1.5"
                        >
                          <FileText className="h-3.5 w-3.5 text-brand" /> Prescription
                        </button>
                      )}

                      {/* View Hospital Bill if generated */}
                      {appt.bill && (
                        <Link
                          href="/billing"
                          className="btn-secondary !py-2 !px-3 !text-xs flex items-center gap-1.5"
                        >
                          <CreditCard className="h-3.5 w-3.5 text-brand" /> View Bill
                        </Link>
                      )}

                      {/* Reschedule Button */}
                      {(appt.status === 'CONFIRMED' || appt.status === 'SCHEDULED') && (
                        <button
                          onClick={() => {
                            setRescheduleModalAppt(appt);
                            setRescheduleDate(apptDateStr);
                            setRescheduleSlot(null);
                          }}
                          className="btn-secondary !py-2 !px-3 !text-xs flex items-center gap-1.5"
                        >
                          <RefreshCw className="h-3.5 w-3.5" /> Reschedule
                        </button>
                      )}

                      {/* Cancel Button */}
                      {(appt.status === 'CONFIRMED' || appt.status === 'SCHEDULED') && (
                        <button
                          onClick={() => setCancelModalAppt(appt)}
                          className="px-3 py-2 rounded-pill border border-red-200 text-semantic-down hover:bg-red-50 text-xs font-semibold transition flex items-center gap-1.5"
                        >
                          <XCircle className="h-3.5 w-3.5" /> Cancel
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* 1. RESCHEDULE MODAL */}
      {rescheduleModalAppt && (
        <Modal
          isOpen={true}
          onClose={() => setRescheduleModalAppt(null)}
          title="Reschedule Appointment Slot"
          subtitle={`Dr. ${rescheduleModalAppt.doctor.user.name} • ${rescheduleModalAppt.doctor.department.name}`}
          maxWidth="lg"
        >
          <div className="space-y-6">
            {rescheduleError && (
              <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-semantic-down text-xs">
                {rescheduleError}
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-body mb-2">
                Select New Date
              </label>
              <input
                type="date"
                min={new Date().toISOString().split('T')[0]}
                value={rescheduleDate}
                onChange={(e) => setRescheduleDate(e.target.value)}
                className="text-input-md w-full number-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-body mb-2">
                Choose Available Time Slot
              </label>
              {loadingRescheduleSlots ? (
                <div className="py-6 text-center text-xs text-body">
                  Checking open slots...
                </div>
              ) : rescheduleSlots.length > 0 ? (
                <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
                  {rescheduleSlots.map((slot) => {
                    const isSelected = rescheduleSlot === slot.timeSlot;
                    return (
                      <button
                        key={slot.timeSlot}
                        disabled={!slot.isAvailable}
                        onClick={() => setRescheduleSlot(slot.timeSlot)}
                        className={`p-2 rounded-lg border text-center text-xs number-mono font-medium transition ${
                          isSelected
                            ? 'bg-brand text-white border-brand'
                            : slot.isAvailable
                            ? 'bg-white hover:bg-surface-soft text-ink border-hairline'
                            : 'bg-surface-strong text-muted border-hairline-soft opacity-50 cursor-not-allowed line-through'
                        }`}
                      >
                        {slot.displayTime}
                      </button>
                    );
                  })}
                </div>
              ) : (
                <div className="p-4 bg-surface-soft text-body text-xs text-center rounded-xl">
                  No slots available on this date.
                </div>
              )}
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-hairline">
              <button onClick={() => setRescheduleModalAppt(null)} className="btn-secondary">
                Cancel
              </button>
              <button
                disabled={rescheduleLoading || !rescheduleSlot}
                onClick={handleRescheduleSubmit}
                className="btn-primary"
              >
                {rescheduleLoading ? 'Updating Slot...' : 'Confirm Reschedule'}
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* 2. CANCEL MODAL */}
      {cancelModalAppt && (
        <Modal
          isOpen={true}
          onClose={() => setCancelModalAppt(null)}
          title="Cancel Appointment"
          subtitle="Are you sure you want to cancel this scheduled consultation? The slot will be released."
          maxWidth="sm"
        >
          <div className="space-y-4">
            <div className="p-4 rounded-xl bg-surface-soft border border-hairline text-xs space-y-1">
              <div>
                <span className="font-semibold text-ink">Patient:</span>{' '}
                {cancelModalAppt.patient?.user?.name}
              </div>
              <div>
                <span className="font-semibold text-ink">Physician:</span> Dr.{' '}
                {cancelModalAppt.doctor?.user?.name}
              </div>
              <div>
                <span className="font-semibold text-ink">Scheduled:</span>{' '}
                {new Date(cancelModalAppt.appointmentDate).toISOString().split('T')[0]} at{' '}
                {cancelModalAppt.timeSlot}
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-body mb-2">
                Cancellation Reason (Optional)
              </label>
              <textarea
                rows={3}
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                placeholder="Reason for cancelling (e.g. Patient requested, schedule conflict)..."
                className="text-input-md w-full text-xs"
              />
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-hairline">
              <button onClick={() => setCancelModalAppt(null)} className="btn-secondary">
                Keep Appointment
              </button>
              <button
                disabled={cancelLoading}
                onClick={handleCancelSubmit}
                className="px-5 py-2.5 rounded-pill bg-semantic-down text-white font-semibold text-sm hover:opacity-90 transition"
              >
                {cancelLoading ? 'Cancelling...' : 'Confirm Cancellation'}
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* 3. WRITE PRESCRIPTION MODAL (DOCTOR) */}
      {prescriptionModalAppt && (
        <Modal
          isOpen={true}
          onClose={() => setPrescriptionModalAppt(null)}
          title="Digital Prescription & Consultation Room"
          subtitle={`Patient: ${prescriptionModalAppt.patient?.user?.name} • Blood Group: ${prescriptionModalAppt.patient?.bloodGroup || 'N/A'}`}
          maxWidth="xl"
        >
          <form onSubmit={handlePrescriptionSubmit} className="space-y-6">
            {rxError && (
              <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-semantic-down text-xs">
                {rxError}
              </div>
            )}

            {/* Diagnosis */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-body mb-2">
                Clinical Diagnosis *
              </label>
              <input
                type="text"
                required
                value={rxDiagnosis}
                onChange={(e) => setRxDiagnosis(e.target.value)}
                placeholder="e.g. Acute Bronchitis, Essential Hypertension, Type 2 Diabetes..."
                className="text-input-md w-full"
              />
            </div>

            {/* Itemized Medications */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <label className="block text-xs font-semibold uppercase tracking-wider text-body">
                  Prescribed Medications ({rxMedications.length})
                </label>
                <button
                  type="button"
                  onClick={handleAddMedication}
                  className="btn-secondary !py-1 !px-3 !text-xs flex items-center gap-1"
                >
                  <Plus className="h-3 w-3" /> Add Medicine
                </button>
              </div>

              <div className="space-y-3">
                {rxMedications.map((med, idx) => (
                  <div
                    key={idx}
                    className="p-4 rounded-xl bg-surface-soft border border-hairline space-y-3 relative"
                  >
                    <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                      <div className="sm:col-span-2">
                        <label className="block text-[10px] font-semibold uppercase text-muted mb-1">
                          Medicine Name *
                        </label>
                        <input
                          type="text"
                          required
                          value={med.name}
                          onChange={(e) => handleMedicationChange(idx, 'name', e.target.value)}
                          placeholder="e.g. Amoxicillin 500mg, Lisinopril"
                          className="text-input-sm w-full"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-semibold uppercase text-muted mb-1">
                          Dosage *
                        </label>
                        <input
                          type="text"
                          required
                          value={med.dosage}
                          onChange={(e) => handleMedicationChange(idx, 'dosage', e.target.value)}
                          placeholder="e.g. 1 Tab, 5ml"
                          className="text-input-sm w-full"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-semibold uppercase text-muted mb-1">
                          Duration *
                        </label>
                        <input
                          type="text"
                          required
                          value={med.duration}
                          onChange={(e) => handleMedicationChange(idx, 'duration', e.target.value)}
                          placeholder="e.g. 5 days, 1 month"
                          className="text-input-sm w-full"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[10px] font-semibold uppercase text-muted mb-1">
                          Frequency
                        </label>
                        <input
                          type="text"
                          value={med.frequency}
                          onChange={(e) => handleMedicationChange(idx, 'frequency', e.target.value)}
                          placeholder="e.g. Once daily morning, Twice daily after meals"
                          className="text-input-sm w-full"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-semibold uppercase text-muted mb-1">
                          Special Instructions
                        </label>
                        <div className="flex gap-2">
                          <input
                            type="text"
                            value={med.instructions}
                            onChange={(e) => handleMedicationChange(idx, 'instructions', e.target.value)}
                            placeholder="e.g. Take with plenty of water"
                            className="text-input-sm w-full"
                          />
                          {rxMedications.length > 1 && (
                            <button
                              type="button"
                              onClick={() => handleRemoveMedication(idx)}
                              className="p-2 text-semantic-down hover:bg-red-50 rounded-lg transition"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Clinical Advice / Notes */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-body mb-2">
                Clinical Advice & Dietary Guidelines (Optional)
              </label>
              <textarea
                rows={3}
                value={rxNotes}
                onChange={(e) => setRxNotes(e.target.value)}
                placeholder="Additional instructions for patient recovery, lab test recommendations, follow-up in 2 weeks..."
                className="text-input-md w-full"
              />
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-hairline">
              <button
                type="button"
                onClick={() => setPrescriptionModalAppt(null)}
                className="btn-secondary"
              >
                Cancel
              </button>
              <button disabled={rxLoading} type="submit" className="btn-primary">
                {rxLoading ? 'Recording Prescription...' : 'Issue Prescription & Complete'}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* 4. VIEW PRESCRIPTION MODAL */}
      {viewRxModalAppt && viewRxModalAppt.prescription && (
        <Modal
          isOpen={true}
          onClose={() => setViewRxModalAppt(null)}
          title="Digital Prescription Summary"
          subtitle={`Consultation ID: ${viewRxModalAppt.id} • ${new Date(viewRxModalAppt.appointmentDate).toISOString().split('T')[0]}`}
          maxWidth="lg"
        >
          <div className="space-y-6">
            {/* Formal Rx Header */}
            <div className="p-6 rounded-xl bg-surface-dark text-white space-y-4">
              <div className="flex items-center justify-between border-b border-surface-dark-elevated pb-3">
                <div>
                  <div className="text-lg font-semibold text-white">
                    Dr. {viewRxModalAppt.doctor?.user?.name}
                  </div>
                  <div className="text-xs text-muted-soft">
                    {viewRxModalAppt.doctor?.department?.name || 'Department'}
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-2xl font-bold text-brand font-serif">Rx</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 text-xs">
                <div>
                  <span className="text-muted-soft uppercase font-semibold">Patient Name</span>
                  <div className="text-sm font-semibold text-white mt-0.5">
                    {viewRxModalAppt.patient?.user?.name}
                  </div>
                </div>
                <div>
                  <span className="text-muted-soft uppercase font-semibold">Diagnosis</span>
                  <div className="text-sm font-semibold text-white mt-0.5">
                    {viewRxModalAppt.prescription.diagnosis}
                  </div>
                </div>
              </div>
            </div>

            {/* Medicines list */}
            <div>
              <h4 className="text-xs font-semibold uppercase tracking-wider text-body mb-3">
                Prescribed Medicines
              </h4>
              <div className="space-y-2">
                {((viewRxModalAppt.prescription.medications as any[]) || []).map((med, idx) => (
                  <div
                    key={idx}
                    className="p-4 rounded-xl bg-surface-soft border border-hairline flex items-center justify-between"
                  >
                    <div>
                      <div className="text-sm font-semibold text-ink flex items-center gap-2">
                        <Pill className="h-4 w-4 text-brand" /> {med.name}
                        <span className="px-2 py-0.5 rounded-pill bg-white border border-hairline text-xs number-mono font-medium text-body">
                          {med.dosage}
                        </span>
                      </div>
                      <div className="text-xs text-muted mt-1">
                        Frequency: <span className="text-body font-medium">{med.frequency}</span> • Duration:{' '}
                        <span className="text-body font-medium">{med.duration}</span>
                      </div>
                    </div>
                    {med.instructions && (
                      <span className="text-xs text-body italic max-w-xs text-right">
                        &quot;{med.instructions}&quot;
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {viewRxModalAppt.prescription.notes && (
              <div className="p-4 rounded-xl bg-blue-50 border border-blue-200 text-xs text-blue-900">
                <span className="font-semibold">Physician Notes: </span>
                {viewRxModalAppt.prescription.notes}
              </div>
            )}

            <div className="flex justify-end pt-4 border-t border-hairline">
              <button onClick={() => setViewRxModalAppt(null)} className="btn-secondary">
                Close
              </button>
            </div>
          </div>
        </Modal>
      )}
    </DashboardShell>
  );
}
