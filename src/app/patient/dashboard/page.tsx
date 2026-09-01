'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Heart,
  Droplet,
  Phone,
  Calendar,
  Building2,
  Stethoscope,
  ShieldCheck,
  Activity,
  ArrowRight,
  FileText,
  User,
  Plus,
  Clock,
  Pill,
} from 'lucide-react';
import { DashboardShell } from '@/components/ui/DashboardShell';
import { getAuthUserAction } from '@/actions/auth';
import { getPatientByIdAction } from '@/actions/patient';
import { getAppointmentsAction } from '@/actions/appointment';
import { SessionUser } from '@/types';

export default function PatientDashboardPage() {
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState<SessionUser | null>(null);
  const [patientRecord, setPatientRecord] = useState<any | null>(null);
  const [upcomingAppointments, setUpcomingAppointments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getAuthUserAction().then(async (res) => {
      if (res.data) {
        setCurrentUser(res.data);
        if (res.data.patientId) {
          const [patRes, apptRes] = await Promise.all([
            getPatientByIdAction(res.data.patientId),
            getAppointmentsAction({ status: 'CONFIRMED', limit: 3 }),
          ]);
          if (patRes.success && patRes.data) setPatientRecord(patRes.data);
          if (apptRes.success && apptRes.data) setUpcomingAppointments(apptRes.data.appointments);
        }
      } else {
        router.push('/login?callbackUrl=/patient/dashboard');
      }
      setLoading(false);
    });
  }, [router]);

  if (!currentUser || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white text-body">
        Loading patient portal...
      </div>
    );
  }

  return (
    <DashboardShell
      user={currentUser}
      title="Patient Health Portal"
      subtitle={`Welcome back, ${currentUser.name}. Access your health records, blood profile, and scheduled consultations.`}
      badge="Electronic Health Identity"
      actionButton={
        <Link href="/appointments/book" className="btn-primary flex items-center gap-2">
          <Plus className="h-4 w-4" /> Book Consultation
        </Link>
      }
    >
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-10">
        {/* Left: Patient Digital Health Card */}
        <div className="lg:col-span-2 space-y-6">
          {/* Health ID Card */}
          <div className="bg-surface-dark text-white rounded-xl p-8 shadow-soft relative overflow-hidden">
            <div className="flex items-start justify-between gap-4">
              <div>
                <span className="badge-pill !bg-white/10 !text-white mb-3">
                  <ShieldCheck className="h-3.5 w-3.5 text-brand" /> Verified Patient ID
                </span>
                <h2 className="text-3xl font-normal tracking-tight text-white">
                  {currentUser.name}
                </h2>
                <div className="text-xs text-muted-soft number-mono mt-1">
                  Record ID: {patientRecord?.id || currentUser.patientId || 'PENDING'}
                </div>
              </div>

              {patientRecord?.bloodGroup && (
                <div className="px-4 py-2 rounded-xl bg-red-950/80 border border-red-800/60 text-white flex items-center gap-2">
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

          {/* Upcoming Consultations Widget */}
          <div className="bg-white rounded-xl border border-hairline p-6 shadow-soft">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-semibold text-ink flex items-center gap-2">
                <Calendar className="h-4 w-4 text-brand" /> Upcoming Consultations
              </h3>
              <Link href="/appointments" className="text-xs font-semibold text-brand hover:underline">
                View All Appointments &rarr;
              </Link>
            </div>

            {upcomingAppointments.length === 0 ? (
              <div className="p-6 bg-surface-soft rounded-xl text-center text-xs text-muted space-y-2">
                <div>No upcoming consultations scheduled.</div>
                <Link href="/appointments/book" className="btn-primary !text-xs inline-flex">
                  Schedule Your Visit
                </Link>
              </div>
            ) : (
              <div className="space-y-3">
                {upcomingAppointments.map((appt) => (
                  <div
                    key={appt.id}
                    className="p-4 rounded-xl bg-surface-soft border border-hairline flex items-center justify-between"
                  >
                    <div>
                      <div className="text-sm font-semibold text-ink">
                        Dr. {appt.doctor?.user?.name}{' '}
                        <span className="text-xs text-muted font-normal">
                          ({appt.doctor?.department?.name})
                        </span>
                      </div>
                      <div className="text-xs text-brand font-medium number-mono mt-0.5">
                        {new Date(appt.appointmentDate).toISOString().split('T')[0]} at {appt.timeSlot}
                      </div>
                    </div>
                    <span className="badge-pill !bg-emerald-50 !text-semantic-up text-[11px]">
                      CONFIRMED
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Medical History Summary */}
          <div className="bg-white rounded-xl border border-hairline p-6 shadow-soft">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-base font-semibold text-ink flex items-center gap-2">
                <Activity className="h-4 w-4 text-brand" /> Clinical Profile & Medical History
              </h3>
              <Link href="/medical-records" className="text-xs font-semibold text-brand hover:underline">
                Open EHR Timeline &rarr;
              </Link>
            </div>
            <p className="text-sm text-body bg-surface-soft p-4 rounded-xl border border-hairline leading-relaxed">
              {patientRecord?.medicalHistorySummary ||
                'No chronic medical conditions or known drug allergies are currently registered on file.'}
            </p>
          </div>
        </div>

        {/* Right: Quick Actions & Specialist Access */}
        <div className="space-y-6">
          <div className="bg-white rounded-xl border border-hairline p-6 shadow-soft">
            <h3 className="text-base font-semibold text-ink mb-4">Patient Quick Services</h3>
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
                    <div className="text-xs text-white/80">Lock 30-min consultation</div>
                  </div>
                </div>
                <ArrowRight className="h-4 w-4 text-white" />
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
                      Medical Records & Rx
                    </div>
                    <div className="text-xs text-muted">Lab reports & digital prescriptions</div>
                  </div>
                </div>
                <ArrowRight className="h-4 w-4 text-muted group-hover:text-brand" />
              </Link>

              <Link
                href="/doctors"
                className="p-4 rounded-xl bg-surface-soft hover:bg-surface-strong border border-hairline flex items-center justify-between transition group"
              >
                <div className="flex items-center gap-3">
                  <div className="h-9 w-9 rounded-full bg-surface-strong text-ink flex items-center justify-center">
                    <Stethoscope className="h-4 w-4 text-brand" />
                  </div>
                  <div>
                    <div className="text-sm font-semibold text-ink group-hover:text-brand">
                      Physician Directory
                    </div>
                    <div className="text-xs text-muted">View fees & duty schedules</div>
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
