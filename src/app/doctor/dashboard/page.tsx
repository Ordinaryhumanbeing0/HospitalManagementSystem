'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Stethoscope,
  Building2,
  Calendar,
  DollarSign,
  Clock,
  Search,
  Users,
  CheckCircle2,
  GraduationCap,
  Pill,
  ArrowRight,
  FileText,
} from 'lucide-react';
import { DashboardShell } from '@/components/ui/DashboardShell';
import { getAuthUserAction } from '@/actions/auth';
import { getDoctorByIdAction } from '@/actions/doctor';
import { getAppointmentsAction } from '@/actions/appointment';
import { getPatientsAction } from '@/actions/patient';
import { SessionUser } from '@/types';

const DAYS_OF_WEEK = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

export default function DoctorDashboardPage() {
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState<SessionUser | null>(null);
  const [doctorProfile, setDoctorProfile] = useState<any | null>(null);
  const [appointments, setAppointments] = useState<any[]>([]);
  const [patients, setPatients] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getAuthUserAction().then(async (res) => {
      if (res.data && (res.data.role === 'DOCTOR' || res.data.role === 'ADMIN')) {
        setCurrentUser(res.data);
        if (res.data.doctorId) {
          const [docRes, apptRes] = await Promise.all([
            getDoctorByIdAction(res.data.doctorId),
            getAppointmentsAction({ status: 'CONFIRMED', limit: 5 }),
          ]);
          if (docRes.success && docRes.data) setDoctorProfile(docRes.data);
          if (apptRes.success && apptRes.data) setAppointments(apptRes.data.appointments);
        }
      } else {
        router.push('/login?callbackUrl=/doctor/dashboard');
      }
    });

    getPatientsAction({ limit: 5 }).then((res) => {
      if (res.success && res.data) {
        setPatients(res.data.patients);
      }
      setLoading(false);
    });
  }, [router]);

  if (!currentUser) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white text-body">
        Loading clinical portal...
      </div>
    );
  }

  return (
    <DashboardShell
      user={currentUser}
      title={`Welcome, ${currentUser.name}`}
      subtitle="Physician Workspace • Clinical schedules, patient consultations, and digital prescriptions."
      badge="Doctor Clinical Dashboard"
      actionButton={
        <Link href="/appointments" className="btn-primary flex items-center gap-2">
          <Calendar className="h-4 w-4" /> View All Consultations
        </Link>
      }
    >
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column: Doctor Profile & Shifts */}
        <div className="lg:col-span-2 space-y-6">
          {/* Physician Card */}
          <div className="bg-surface-dark text-white rounded-xl p-8 shadow-soft">
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
                  {doctorProfile?.specialization || 'Clinical Specialist'}
                </p>
              </div>

              <div className="h-12 w-12 rounded-full bg-surface-dark-elevated flex items-center justify-center text-brand">
                <Stethoscope className="h-6 w-6" />
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mt-8 pt-6 border-t border-surface-dark-elevated">
              <div>
                <div className="text-[11px] font-semibold uppercase text-muted tracking-wider">
                  Qualification
                </div>
                <div className="text-sm font-semibold text-white mt-0.5">
                  {doctorProfile?.qualification || 'MD'}
                </div>
              </div>

              <div>
                <div className="text-[11px] font-semibold uppercase text-muted tracking-wider">
                  Consultation Fee
                </div>
                <div className="text-sm font-semibold text-semantic-up number-mono mt-0.5">
                  ${Number(doctorProfile?.consultationFee || 0).toFixed(2)}
                </div>
              </div>

              <div>
                <div className="text-[11px] font-semibold uppercase text-muted tracking-wider">
                  Assigned Department
                </div>
                <div className="text-sm font-semibold text-white mt-0.5">
                  {doctorProfile?.department?.name || 'N/A'}
                </div>
              </div>
            </div>
          </div>

          {/* Today's Confirmed Consultations Queue */}
          <div className="bg-white rounded-xl border border-hairline p-6 shadow-soft">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-semibold text-ink flex items-center gap-2">
                <Calendar className="h-4 w-4 text-brand" /> Pending Consultations Queue
              </h3>
              <Link href="/appointments" className="text-xs font-semibold text-brand hover:underline">
                Manage All &rarr;
              </Link>
            </div>

            {appointments.length === 0 ? (
              <div className="p-6 bg-surface-soft rounded-xl text-center text-xs text-muted">
                No pending patient consultations in queue.
              </div>
            ) : (
              <div className="space-y-3">
                {appointments.map((appt) => (
                  <div
                    key={appt.id}
                    className="p-4 rounded-xl bg-surface-soft border border-hairline flex items-center justify-between"
                  >
                    <div>
                      <div className="text-sm font-semibold text-ink">
                        {appt.patient?.user?.name}{' '}
                        <span className="text-xs text-muted font-normal">
                          (Blood Group: {appt.patient?.bloodGroup || 'N/A'})
                        </span>
                      </div>
                      <div className="text-xs text-brand font-medium number-mono mt-0.5">
                        {new Date(appt.appointmentDate).toISOString().split('T')[0]} at {appt.timeSlot}
                      </div>
                    </div>
                    <Link
                      href="/appointments"
                      className="btn-primary !py-1.5 !px-3 !text-xs flex items-center gap-1"
                    >
                      <Pill className="h-3.5 w-3.5" /> Start & Prescribe
                    </Link>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Weekly Duty Hours */}
          <div className="bg-white rounded-xl border border-hairline p-6 shadow-soft">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-semibold text-ink flex items-center gap-2">
                <Clock className="h-4 w-4 text-brand" /> Weekly Working Shifts
              </h3>
              <Link href="/doctors" className="text-xs font-semibold text-brand hover:underline">
                Configure Shifts &rarr;
              </Link>
            </div>

            {doctorProfile?.schedules && doctorProfile.schedules.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {doctorProfile.schedules.map((schedule: any) => (
                  <div
                    key={schedule.id}
                    className="p-4 rounded-xl bg-surface-soft border border-hairline flex items-center justify-between"
                  >
                    <div>
                      <div className="text-sm font-semibold text-ink">
                        {DAYS_OF_WEEK[schedule.dayOfWeek]}
                      </div>
                      <div className="text-xs text-muted number-mono mt-0.5">
                        {schedule.slotDuration || 30} min interval slots
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-xs font-semibold text-ink number-mono">
                        {schedule.startTime} - {schedule.endTime}
                      </div>
                      <span className="inline-block mt-0.5 px-2 py-0.5 rounded-pill bg-emerald-50 text-semantic-up text-[10px] font-semibold">
                        Active Shift
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-6 rounded-xl bg-surface-soft text-center text-xs text-muted">
                No active schedule shifts configured. Set your shift timings in the Doctors directory.
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Quick Links & Patient Directory */}
        <div className="space-y-6">
          <div className="bg-white rounded-xl border border-hairline p-6 shadow-soft">
            <h3 className="text-base font-semibold text-ink mb-4">Clinical Quick Links</h3>
            <div className="space-y-3">
              <Link
                href="/appointments"
                className="p-4 rounded-xl bg-surface-soft hover:bg-surface-strong border border-hairline flex items-center justify-between transition group"
              >
                <div className="flex items-center gap-3">
                  <div className="h-9 w-9 rounded-full bg-brand text-white flex items-center justify-center">
                    <Calendar className="h-4 w-4" />
                  </div>
                  <div>
                    <div className="text-sm font-semibold text-ink group-hover:text-brand">
                      Appointments & Prescriptions
                    </div>
                    <div className="text-xs text-muted">Consultation list & Rx writer</div>
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
                      Patient EHR Timelines
                    </div>
                    <div className="text-xs text-muted">Lab reports & medical history</div>
                  </div>
                </div>
                <ArrowRight className="h-4 w-4 text-muted group-hover:text-brand" />
              </Link>
            </div>
          </div>
        </div>
      </div>
    </DashboardShell>
  );
}
