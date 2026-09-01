'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Users,
  Search,
  UserPlus,
  Stethoscope,
  Building2,
  Clock,
  ArrowRight,
  Shield,
  Activity,
  Calendar,
  PlusCircle,
  FileText,
} from 'lucide-react';
import { DashboardShell } from '@/components/ui/DashboardShell';
import { getAuthUserAction } from '@/actions/auth';
import { getPatientsAction } from '@/actions/patient';
import { getDoctorsAction } from '@/actions/doctor';
import { getAppointmentsAction } from '@/actions/appointment';
import { SessionUser } from '@/types';

export default function ReceptionistDashboardPage() {
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState<SessionUser | null>(null);
  const [patients, setPatients] = useState<any[]>([]);
  const [doctors, setDoctors] = useState<any[]>([]);
  const [todayAppointments, setTodayAppointments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getAuthUserAction().then((res) => {
      if (res.data && (res.data.role === 'RECEPTIONIST' || res.data.role === 'ADMIN')) {
        setCurrentUser(res.data);
      } else {
        router.push('/login?callbackUrl=/receptionist/dashboard');
      }
    });

    Promise.all([
      getPatientsAction({ limit: 5 }),
      getDoctorsAction({ limit: 5 }),
      getAppointmentsAction({ status: 'CONFIRMED', limit: 5 }),
    ]).then(([patRes, docRes, apptRes]) => {
      if (patRes.success && patRes.data) setPatients(patRes.data.patients);
      if (docRes.success && docRes.data) setDoctors(docRes.data.doctors);
      if (apptRes.success && apptRes.data) setTodayAppointments(apptRes.data.appointments);
      setLoading(false);
    });
  }, [router]);

  if (!currentUser) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white text-body">
        Loading reception desk...
      </div>
    );
  }

  return (
    <DashboardShell
      user={currentUser}
      title="Front Desk & Reception Command"
      subtitle="Patient intake, walk-in appointment scheduling, doctor on-duty lookup, and coordination."
      badge="Receptionist Workstation"
      actionButton={
        <div className="flex items-center gap-2">
          <Link href="/appointments/book" className="btn-primary flex items-center gap-2">
            <Calendar className="h-4 w-4" /> Book Walk-In Slot
          </Link>
          <Link href="/patients" className="btn-secondary flex items-center gap-2">
            <UserPlus className="h-4 w-4" /> Register Patient
          </Link>
        </div>
      }
    >
      {/* Search & Onboarding Hero Card */}
      <div className="bg-surface-dark text-white rounded-xl p-8 mb-8 shadow-soft">
        <div className="max-w-2xl">
          <span className="badge-pill !bg-white/10 !text-white mb-3">
            <Activity className="h-3.5 w-3.5 text-brand" /> Front Desk Intake & Scheduling
          </span>
          <h2 className="text-2xl font-normal tracking-tight text-white">
            Walk-In Registration & Slot Reservation
          </h2>
          <p className="text-sm text-muted-soft mt-1.5">
            Instantly check doctor schedules, register walk-in patients, and lock appointment slots without scheduling conflicts.
          </p>

          <div className="mt-6 flex items-center gap-3 flex-wrap">
            <Link href="/appointments/book" className="btn-pill-cta !h-11">
              <Calendar className="h-4 w-4 mr-2" /> Book Walk-In Appointment
            </Link>
            <Link href="/patients" className="btn-secondary !h-11 !bg-white/10 !text-white !border-white/10 hover:!bg-white/20">
              <Search className="h-4 w-4 mr-2" /> Search Patient Database
            </Link>
            <Link
              href="/doctors"
              className="inline-flex items-center justify-center bg-surface-dark-elevated hover:bg-white/10 text-white font-medium text-sm rounded-pill px-5 py-2.5 h-11 transition"
            >
              <Stethoscope className="h-4 w-4 mr-2" /> View Doctor Schedule
            </Link>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Left: Active Appointments Stream */}
        <div className="bg-white rounded-xl border border-hairline p-6 shadow-soft">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-base font-semibold text-ink flex items-center gap-2">
              <Calendar className="h-4 w-4 text-brand" /> Scheduled Appointments
            </h3>
            <Link href="/appointments" className="text-xs font-semibold text-brand hover:underline">
              View All &rarr;
            </Link>
          </div>

          {todayAppointments.length === 0 ? (
            <div className="p-8 text-center text-xs text-muted">
              No appointments scheduled currently.
            </div>
          ) : (
            <div className="space-y-3">
              {todayAppointments.map((appt) => (
                <div
                  key={appt.id}
                  className="p-4 rounded-xl bg-surface-soft border border-hairline flex items-center justify-between"
                >
                  <div>
                    <div className="text-sm font-semibold text-ink">
                      {appt.patient?.user?.name}{' '}
                      <span className="text-xs text-muted font-normal">
                        &rarr; Dr. {appt.doctor?.user?.name}
                      </span>
                    </div>
                    <div className="text-xs text-brand font-medium number-mono mt-0.5">
                      {new Date(appt.appointmentDate).toISOString().split('T')[0]} at {appt.timeSlot}
                    </div>
                  </div>
                  <span className="badge-pill !bg-emerald-50 !text-semantic-up text-[10px]">
                    CONFIRMED
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Right: Recent Registered Patients */}
        <div className="bg-white rounded-xl border border-hairline p-6 shadow-soft">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-base font-semibold text-ink flex items-center gap-2">
              <Users className="h-4 w-4 text-brand" /> Recent Patient Intakes
            </h3>
            <Link href="/patients" className="text-xs font-semibold text-brand hover:underline">
              View All Patients &rarr;
            </Link>
          </div>

          <div className="space-y-3">
            {patients.map((pat) => (
              <div
                key={pat.id}
                className="p-4 rounded-xl bg-surface-soft border border-hairline flex items-center justify-between"
              >
                <div>
                  <div className="text-sm font-semibold text-ink">{pat.user?.name}</div>
                  <div className="text-xs text-muted mt-0.5">
                    {pat.user?.email} • {pat.user?.phone || 'No phone'}
                  </div>
                </div>
                <div className="text-right">
                  <span className="px-2.5 py-0.5 rounded-pill bg-white border border-hairline text-xs font-bold number-mono text-semantic-down">
                    {pat.bloodGroup || 'N/A'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </DashboardShell>
  );
}
