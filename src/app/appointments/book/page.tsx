'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import {
  Calendar,
  Clock,
  Stethoscope,
  Building2,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  ArrowLeft,
  DollarSign,
  User,
  Shield,
  HeartPulse,
} from 'lucide-react';
import { DashboardShell } from '@/components/ui/DashboardShell';
import { getDoctorsAction } from '@/actions/doctor';
import { getDepartmentsAction } from '@/actions/department';
import { getPatientsAction } from '@/actions/patient';
import { getAvailableSlotsAction, bookAppointmentAction } from '@/actions/appointment';
import { getAuthUserAction } from '@/actions/auth';
import { SessionUser, SlotInfo, DoctorDailyAvailability } from '@/types';
import { formatCurrency } from '@/lib/config/currency';

function BookAppointmentContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const preselectedDoctorId = searchParams.get('doctorId');

  const [currentUser, setCurrentUser] = useState<SessionUser | null>(null);
  const [loadingUser, setLoadingUser] = useState(true);

  // Wizard state
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);

  // Data collections
  const [departments, setDepartments] = useState<any[]>([]);
  const [doctors, setDoctors] = useState<any[]>([]);
  const [patients, setPatients] = useState<any[]>([]);

  // Selection states
  const [selectedDeptId, setSelectedDeptId] = useState<string>('ALL');
  const [selectedDoctor, setSelectedDoctor] = useState<any | null>(null);
  const [selectedDate, setSelectedDate] = useState<string>(() => {
    const tmrw = new Date();
    tmrw.setDate(tmrw.getDate() + 1);
    return tmrw.toISOString().split('T')[0];
  });
  const [availability, setAvailability] = useState<DoctorDailyAvailability | null>(null);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null);

  // Patient selection (for staff/admin)
  const [selectedPatientId, setSelectedPatientId] = useState<string>('');
  const [reason, setReason] = useState<string>('');

  // Submission
  const [submitting, setSubmitting] = useState(false);
  const [bookingError, setBookingError] = useState<string | null>(null);
  const [bookingSuccess, setBookingSuccess] = useState<any | null>(null);

  // 1. Authenticate user
  useEffect(() => {
    getAuthUserAction().then((res) => {
      if (res.data) {
        setCurrentUser(res.data);
        if (res.data.patientId) {
          setSelectedPatientId(res.data.patientId);
        }
      } else {
        router.push('/login?callbackUrl=/appointments/book');
      }
      setLoadingUser(false);
    });

    getDepartmentsAction().then((res) => {
      if (res.success && res.data) setDepartments(res.data);
    });

    getDoctorsAction({ limit: 50 }).then((res) => {
      if (res.success && res.data) {
        setDoctors(res.data.doctors);
        if (preselectedDoctorId) {
          const found = res.data.doctors.find((d: any) => d.id === preselectedDoctorId);
          if (found) {
            setSelectedDoctor(found);
            setStep(2);
          }
        }
      }
    });
  }, [router, preselectedDoctorId]);

  // Load patients list if staff/admin
  useEffect(() => {
    if (currentUser && (currentUser.role === 'ADMIN' || currentUser.role === 'RECEPTIONIST' || currentUser.role === 'DOCTOR')) {
      getPatientsAction({ limit: 100 }).then((res) => {
        if (res.success && res.data) {
          setPatients(res.data.patients);
          if (!selectedPatientId && res.data.patients.length > 0) {
            setSelectedPatientId(res.data.patients[0].id);
          }
        }
      });
    }
  }, [currentUser]);

  // 2. Fetch slots when doctor and date change
  useEffect(() => {
    if (selectedDoctor && selectedDate) {
      setLoadingSlots(true);
      setSelectedSlot(null);
      getAvailableSlotsAction(selectedDoctor.id, selectedDate).then((res) => {
        if (res.success && res.data) {
          setAvailability(res.data);
        } else {
          setAvailability(null);
        }
        setLoadingSlots(false);
      });
    }
  }, [selectedDoctor, selectedDate]);

  const filteredDoctors = doctors.filter((doc) => {
    if (selectedDeptId === 'ALL') return true;
    return doc.departmentId === selectedDeptId;
  });

  const handleConfirmBooking = async () => {
    const effectivePatientId = selectedPatientId || currentUser?.patientId || '';
    if (!selectedDoctor || !selectedDate || !selectedSlot || !effectivePatientId) {
      setBookingError('Please complete all booking selections.');
      return;
    }

    setSubmitting(true);
    setBookingError(null);

    const res = await bookAppointmentAction({
      patientId: effectivePatientId,
      doctorId: selectedDoctor.id,
      appointmentDate: selectedDate,
      timeSlot: selectedSlot,
      reason: reason || undefined,
    });

    if (!res.success) {
      setBookingError(res.message || 'Failed to book appointment.');
      setSubmitting(false);
      return;
    }

    setBookingSuccess(res.data);
    setSubmitting(false);
  };

  if (loadingUser || !currentUser) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white text-body">
        Loading booking portal...
      </div>
    );
  }

  // Success Confirmation Screen
  if (bookingSuccess) {
    return (
      <DashboardShell
        user={currentUser}
        title="Appointment Confirmed"
        subtitle="Your clinical consultation has been reserved successfully in the PostgreSQL registry."
        badge="Zero Double-Booking Verified"
      >
        <div className="max-w-2xl mx-auto bg-white rounded-xl border border-hairline p-8 shadow-soft text-center space-y-6">
          <div className="h-16 w-16 rounded-full bg-emerald-50 text-semantic-up flex items-center justify-center mx-auto border border-emerald-200">
            <CheckCircle2 className="h-8 w-8" />
          </div>

          <div>
            <span className="badge-pill !bg-emerald-100 !text-emerald-800 text-xs mb-2">
              Status: CONFIRMED
            </span>
            <h2 className="text-2xl font-normal text-ink mt-2">
              Appointment Successfully Booked
            </h2>
            <p className="text-sm text-body mt-1">
              A slot confirmation has been issued with transaction isolation.
            </p>
          </div>

          {/* Details Card */}
          <div className="bg-surface-soft rounded-xl p-6 text-left space-y-3 border border-hairline text-sm">
            <div className="flex justify-between py-1 border-b border-hairline-soft">
              <span className="text-muted font-medium">Physician</span>
              <span className="font-semibold text-ink">Dr. {bookingSuccess.doctor.user.name}</span>
            </div>
            <div className="flex justify-between py-1 border-b border-hairline-soft">
              <span className="text-muted font-medium">Department</span>
              <span className="font-semibold text-ink">{bookingSuccess.doctor.department.name}</span>
            </div>
            <div className="flex justify-between py-1 border-b border-hairline-soft">
              <span className="text-muted font-medium">Date & Time</span>
              <span className="font-semibold text-ink number-mono">
                {selectedDate} at {selectedSlot}
              </span>
            </div>
            <div className="flex justify-between py-1 border-b border-hairline-soft">
              <span className="text-muted font-medium">Patient</span>
              <span className="font-semibold text-ink">{bookingSuccess.patient.user.name}</span>
            </div>
            {bookingSuccess.reason && (
              <div className="flex justify-between py-1">
                <span className="text-muted font-medium">Reason for Visit</span>
                <span className="font-normal text-body">{bookingSuccess.reason}</span>
              </div>
            )}
          </div>

          <div className="flex items-center justify-center gap-4 pt-4">
            <Link href="/appointments" className="btn-primary">
              View My Appointments
            </Link>
            <button
              onClick={() => {
                setBookingSuccess(null);
                setStep(1);
                setSelectedSlot(null);
                setReason('');
              }}
              className="btn-secondary"
            >
              Book Another Visit
            </button>
          </div>
        </div>
      </DashboardShell>
    );
  }

  return (
    <DashboardShell
      user={currentUser}
      title="Book a Consultation"
      subtitle="Select specialist, choose an available date, and lock your 30-minute time slot."
      badge="Step-by-Step Scheduling Wizard"
    >
      {/* Wizard Progress Stepper */}
      <div className="max-w-4xl mx-auto mb-8">
        <div className="grid grid-cols-4 gap-2 text-center text-xs font-semibold">
          {[
            { stepNum: 1, label: '1. Select Doctor' },
            { stepNum: 2, label: '2. Choose Date' },
            { stepNum: 3, label: '3. Pick Slot' },
            { stepNum: 4, label: '4. Confirm Visit' },
          ].map((s) => (
            <div
              key={s.stepNum}
              onClick={() => s.stepNum < step && setStep(s.stepNum as any)}
              className={`p-3 rounded-xl border transition cursor-pointer ${
                step === s.stepNum
                  ? 'bg-brand text-white border-brand shadow-sm'
                  : step > s.stepNum
                  ? 'bg-emerald-50 text-semantic-up border-emerald-200'
                  : 'bg-surface-soft text-muted border-hairline'
              }`}
            >
              {s.label}
            </div>
          ))}
        </div>
      </div>

      <div className="max-w-4xl mx-auto">
        {/* STEP 1: Select Department & Doctor */}
        {step === 1 && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-normal text-ink">Choose a Medical Specialist</h2>
              {/* Department Filter */}
              <div className="flex items-center gap-2">
                <span className="text-xs font-medium text-muted">Department:</span>
                <select
                  value={selectedDeptId}
                  onChange={(e) => setSelectedDeptId(e.target.value)}
                  className="text-input-sm !w-auto"
                >
                  <option value="ALL">All Clinical Divisions</option>
                  {departments.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredDoctors.map((doc) => (
                <div
                  key={doc.id}
                  onClick={() => {
                    setSelectedDoctor(doc);
                    setStep(2);
                  }}
                  className={`p-6 rounded-xl border transition cursor-pointer hover:shadow-soft ${
                    selectedDoctor?.id === doc.id
                      ? 'border-brand ring-2 ring-brand/20 bg-brand/5'
                      : 'border-hairline bg-white'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <span className="badge-pill text-[11px] mb-2">
                        {doc.department?.name || 'Department'}
                      </span>
                      <h3 className="text-lg font-semibold text-ink">
                        Dr. {doc.user.name}
                      </h3>
                      <p className="text-xs text-body mt-0.5">{doc.specialization}</p>
                      <p className="text-xs text-muted mt-0.5">{doc.qualification}</p>
                    </div>
                    <div className="h-10 w-10 rounded-full bg-surface-strong text-brand flex items-center justify-center">
                      <Stethoscope className="h-5 w-5" />
                    </div>
                  </div>

                  <div className="mt-4 pt-4 border-t border-hairline flex items-center justify-between text-xs">
                    <div className="flex items-center gap-1 font-semibold text-ink number-mono">
                      {formatCurrency(doc.consultationFee)}{' '}
                      <span className="font-normal text-muted">/ consultation</span>
                    </div>
                    <span className="text-brand font-medium flex items-center gap-1">
                      Select Doctor <ArrowRight className="h-3 w-3" />
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* STEP 2: Choose Date */}
        {step === 2 && selectedDoctor && (
          <div className="bg-white rounded-xl border border-hairline p-8 shadow-soft space-y-6">
            <div className="flex items-center justify-between border-b border-hairline pb-4">
              <div>
                <span className="badge-pill text-xs mb-1">Step 2 of 4</span>
                <h2 className="text-xl font-normal text-ink">Select Appointment Date</h2>
                <p className="text-xs text-body mt-0.5">
                  Consulting with <span className="font-semibold text-ink">Dr. {selectedDoctor.user.name}</span> ({selectedDoctor.department.name})
                </p>
              </div>
              <button onClick={() => setStep(1)} className="btn-secondary !text-xs !py-1.5">
                Change Doctor
              </button>
            </div>

            <div className="max-w-md space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-body mb-2">
                  Pick a Date
                </label>
                <div className="relative">
                  <input
                    type="date"
                    min={new Date().toISOString().split('T')[0]}
                    value={selectedDate}
                    onChange={(e) => setSelectedDate(e.target.value)}
                    className="text-input-md w-full pl-10 number-mono"
                  />
                  <Calendar className="h-4 w-4 text-muted absolute left-3.5 top-3.5 pointer-events-none" />
                </div>
              </div>

              {/* Working shifts notice */}
              <div className="p-4 rounded-xl bg-surface-soft border border-hairline text-xs space-y-2">
                <div className="font-semibold text-ink flex items-center gap-1.5">
                  <Clock className="h-3.5 w-3.5 text-brand" /> Doctor Weekly Schedule:
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {selectedDoctor.schedules?.map((s: any) => {
                    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
                    return (
                      <span key={s.dayOfWeek} className="px-2.5 py-1 rounded-pill bg-white border border-hairline text-body text-[11px] font-medium">
                        {dayNames[s.dayOfWeek]}: {s.startTime} - {s.endTime}
                      </span>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="pt-4 flex justify-between">
              <button onClick={() => setStep(1)} className="btn-secondary flex items-center gap-2">
                <ArrowLeft className="h-4 w-4" /> Back
              </button>
              <button
                onClick={() => setStep(3)}
                className="btn-primary flex items-center gap-2"
              >
                Proceed to Available Slots <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}

        {/* STEP 3: Pick Available Slot */}
        {step === 3 && selectedDoctor && (
          <div className="bg-white rounded-xl border border-hairline p-8 shadow-soft space-y-6">
            <div className="flex items-center justify-between border-b border-hairline pb-4">
              <div>
                <span className="badge-pill text-xs mb-1">Step 3 of 4</span>
                <h2 className="text-xl font-normal text-ink">Choose a Time Slot</h2>
                <p className="text-xs text-body mt-0.5">
                  Available 30-minute consultation slots on{' '}
                  <span className="font-semibold text-ink number-mono">{selectedDate}</span>
                </p>
              </div>
              <button onClick={() => setStep(2)} className="btn-secondary !text-xs !py-1.5">
                Change Date
              </button>
            </div>

            {loadingSlots ? (
              <div className="py-12 text-center text-body text-sm">
                Checking real-time doctor availability...
              </div>
            ) : availability && !availability.isOnDuty ? (
              <div className="p-6 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-sm text-center">
                <AlertCircle className="h-6 w-6 mx-auto mb-2 text-amber-600" />
                <div className="font-semibold">Doctor is Off-Duty on {availability.dayName}s</div>
                <p className="text-xs text-amber-700 mt-1">
                  Please choose another date when Dr. {selectedDoctor.user.name} is on duty.
                </p>
                <button
                  onClick={() => setStep(2)}
                  className="mt-4 btn-secondary !bg-white !text-xs"
                >
                  Pick Another Date
                </button>
              </div>
            ) : availability && availability.slots.length > 0 ? (
              <div className="space-y-4">
                <div className="flex items-center gap-6 text-xs text-muted">
                  <div className="flex items-center gap-1.5">
                    <span className="h-3 w-3 rounded-full bg-white border-2 border-brand"></span>
                    <span>Available</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="h-3 w-3 rounded-full bg-surface-strong"></span>
                    <span>Booked / Past</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="h-3 w-3 rounded-full bg-brand"></span>
                    <span>Selected</span>
                  </div>
                </div>

                <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-3 pt-2">
                  {availability.slots.map((slot) => {
                    const isSelected = selectedSlot === slot.timeSlot;
                    return (
                      <button
                        key={slot.timeSlot}
                        disabled={!slot.isAvailable}
                        onClick={() => setSelectedSlot(slot.timeSlot)}
                        className={`p-3 rounded-xl border text-center font-medium transition ${
                          isSelected
                            ? 'bg-brand text-white border-brand shadow-sm ring-2 ring-brand/30'
                            : slot.isAvailable
                            ? 'bg-white hover:bg-surface-soft text-ink border-hairline'
                            : 'bg-surface-strong text-muted border-hairline-soft cursor-not-allowed opacity-50 line-through'
                        }`}
                      >
                        <div className="text-xs number-mono font-semibold">
                          {slot.displayTime}
                        </div>
                        <div className="text-[10px] mt-0.5">
                          {slot.isAvailable ? 'Open' : slot.bookedReason || 'Unavailable'}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            ) : (
              <div className="py-8 text-center text-body text-sm">
                No slots configured for this date.
              </div>
            )}

            <div className="pt-4 flex justify-between border-t border-hairline">
              <button onClick={() => setStep(2)} className="btn-secondary flex items-center gap-2">
                <ArrowLeft className="h-4 w-4" /> Back
              </button>
              <button
                disabled={!selectedSlot}
                onClick={() => setStep(4)}
                className="btn-primary flex items-center gap-2 disabled:opacity-40"
              >
                Continue to Review <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}

        {/* STEP 4: Confirm & Visit Reason */}
        {step === 4 && selectedDoctor && selectedSlot && (
          <div className="bg-white rounded-xl border border-hairline p-8 shadow-soft space-y-6">
            <div>
              <span className="badge-pill text-xs mb-1">Step 4 of 4</span>
              <h2 className="text-xl font-normal text-ink">Review & Confirm Appointment</h2>
              <p className="text-xs text-body mt-0.5">
                Verify consultation details and submit to lock slot.
              </p>
            </div>

            {bookingError && (
              <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-semantic-down text-sm flex items-start gap-3">
                <AlertCircle className="h-5 w-5 shrink-0 mt-0.5" />
                <span>{bookingError}</span>
              </div>
            )}

            {/* Summary Box */}
            <div className="p-6 rounded-xl bg-surface-dark text-white space-y-4">
              <div className="flex items-center justify-between border-b border-surface-dark-elevated pb-3">
                <div>
                  <span className="text-xs text-muted-soft uppercase font-semibold">
                    Doctor & Department
                  </span>
                  <div className="text-base font-semibold text-white mt-0.5">
                    Dr. {selectedDoctor.user.name}
                  </div>
                  <div className="text-xs text-muted-soft">{selectedDoctor.department.name}</div>
                </div>
                <div className="text-right">
                  <span className="text-xs text-muted-soft uppercase font-semibold">
                    Consultation Fee
                  </span>
                  <div className="text-lg font-bold text-semantic-up number-mono">
                    {formatCurrency(selectedDoctor.consultationFee)}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 text-xs pt-1">
                <div>
                  <span className="text-muted-soft uppercase font-semibold">Date</span>
                  <div className="text-sm font-semibold text-white number-mono mt-0.5">
                    {selectedDate}
                  </div>
                </div>
                <div>
                  <span className="text-muted-soft uppercase font-semibold">Time Slot</span>
                  <div className="text-sm font-semibold text-white number-mono mt-0.5">
                    {selectedSlot} (30 mins)
                  </div>
                </div>
              </div>
            </div>

            {/* Patient selection if Staff / Admin */}
            {(currentUser.role === 'ADMIN' || currentUser.role === 'RECEPTIONIST' || currentUser.role === 'DOCTOR') && (
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-body mb-2">
                  Select Patient Record (Walk-In / Staff Booking)
                </label>
                <select
                  value={selectedPatientId}
                  onChange={(e) => setSelectedPatientId(e.target.value)}
                  className="text-input-md w-full"
                >
                  {patients.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.user.name} ({p.user.email} • {p.bloodGroup || 'Blood Group N/A'})
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Reason for visit */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-body mb-2">
                Reason for Consultation (Optional)
              </label>
              <textarea
                rows={3}
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Describe your symptoms or reason for scheduling (e.g. Routine checkup, chest discomfort, follow-up)..."
                className="text-input-md w-full"
              />
            </div>

            <div className="pt-4 flex justify-between border-t border-hairline">
              <button onClick={() => setStep(3)} className="btn-secondary flex items-center gap-2">
                <ArrowLeft className="h-4 w-4" /> Back
              </button>
              <button
                disabled={submitting}
                onClick={handleConfirmBooking}
                className="btn-pill-cta flex items-center gap-2"
              >
                {submitting ? 'Locking Slot in DB...' : 'Confirm & Reserve Slot'}
              </button>
            </div>
          </div>
        )}
      </div>
    </DashboardShell>
  );
}

export default function BookAppointmentPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-white text-body text-sm">
          Loading appointment booking portal...
        </div>
      }
    >
      <BookAppointmentContent />
    </Suspense>
  );
}
