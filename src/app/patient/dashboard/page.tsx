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
} from 'lucide-react';
import { DashboardShell } from '@/components/ui/DashboardShell';
import { Modal } from '@/components/ui/Modal';
import { getAuthUserAction } from '@/actions/auth';
import { getPatientByIdAction } from '@/actions/patient';
import { getAppointmentsAction } from '@/actions/appointment';
import { getPatientMedicalHistoryAction } from '@/actions/medical-record';
import { SessionUser } from '@/types';

export default function PatientDashboardPage() {
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState<SessionUser | null>(null);
  const [patientRecord, setPatientRecord] = useState<any | null>(null);
  const [upcomingAppointments, setUpcomingAppointments] = useState<any[]>([]);
  const [recentPrescriptions, setRecentPrescriptions] = useState<any[]>([]);
  const [recentReports, setRecentReports] = useState<any[]>([]);
  const [selectedRx, setSelectedRx] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getAuthUserAction().then(async (res) => {
      if (res.data) {
        setCurrentUser(res.data);
        if (res.data.patientId) {
          const [patRes, apptRes, histRes] = await Promise.all([
            getPatientByIdAction(res.data.patientId),
            getAppointmentsAction({ status: 'CONFIRMED', limit: 5 }),
            getPatientMedicalHistoryAction(res.data.patientId),
          ]);
          if (patRes.success && patRes.data) setPatientRecord(patRes.data);
          if (apptRes.success && apptRes.data) setUpcomingAppointments(apptRes.data.appointments);
          if (histRes.success && histRes.data) {
            setRecentPrescriptions(histRes.data.prescriptions.slice(0, 3));
            setRecentReports(histRes.data.reports.slice(0, 3));
          }
        }
      } else {
        router.push('/login?role=PATIENT&callbackUrl=/patient/dashboard');
      }
      setLoading(false);
    });
  }, [router]);

  if (!currentUser || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white text-body text-sm">
        Loading patient healthcare portal...
      </div>
    );
  }

  return (
    <DashboardShell
      user={currentUser}
      title="Patient Health Portal"
      subtitle={`Welcome back, ${currentUser.name}. Access your health records, blood profile, and scheduled consultations.`}
      badge="Patient Workspace"
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
                  Patient ID: {patientRecord?.id || currentUser.patientId || 'ACTIVE'}
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
              <div className="p-6 bg-surface-soft rounded-xl text-center text-xs text-muted space-y-3">
                <div>You have no upcoming consultations booked.</div>
                <Link href="/appointments/book" className="btn-primary !text-xs inline-flex items-center gap-1.5">
                  <Plus className="h-3.5 w-3.5" /> Book 30-Min Consultation Slot
                </Link>
              </div>
            ) : (
              <div className="space-y-3">
                {upcomingAppointments.map((appt) => {
                  const apptDateStr = new Date(appt.appointmentDate).toISOString().split('T')[0];
                  return (
                    <div
                      key={appt.id}
                      className="p-4 rounded-xl bg-surface-soft border border-hairline flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                    >
                      <div>
                        <div className="text-sm font-semibold text-ink">
                          Dr. {appt.doctor?.user?.name}{' '}
                          <span className="text-xs text-muted font-normal">
                            ({appt.doctor?.department?.name || 'Department'})
                          </span>
                        </div>
                        <div className="text-xs text-brand font-medium number-mono mt-0.5">
                          {apptDateStr} at {appt.timeSlot}
                        </div>
                        {appt.reason && (
                          <div className="text-xs text-muted mt-1">
                            Reason: {appt.reason}
                          </div>
                        )}
                      </div>

                      <div className="flex items-center gap-2">
                        <span className="badge-pill !bg-emerald-50 !text-semantic-up text-[11px]">
                          CONFIRMED
                        </span>
                        <Link
                          href="/appointments"
                          className="btn-secondary !py-1.5 !px-3 !text-xs flex items-center gap-1"
                        >
                          <RefreshCw className="h-3 w-3" /> Manage
                        </Link>
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

          {/* Clinical Medical Summary */}
          <div className="bg-white rounded-xl border border-hairline p-6 shadow-soft">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-base font-semibold text-ink flex items-center gap-2">
                <Activity className="h-4 w-4 text-brand" /> Health Profile & Notes
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
                    <div className="text-xs text-white/80">30-min consultation booking</div>
                  </div>
                </div>
                <ArrowRight className="h-4 w-4 text-white" />
              </Link>

              <Link
                href="/appointments"
                className="p-4 rounded-xl bg-surface-soft hover:bg-surface-strong border border-hairline flex items-center justify-between transition group"
              >
                <div className="flex items-center gap-3">
                  <div className="h-9 w-9 rounded-full bg-surface-strong text-ink flex items-center justify-center">
                    <Clock className="h-4 w-4 text-brand" />
                  </div>
                  <div>
                    <div className="text-sm font-semibold text-ink group-hover:text-brand">
                      My Consultations
                    </div>
                    <div className="text-xs text-muted">Reschedule & cancel visits</div>
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
                    <div className="text-xs text-muted">Chronological clinical timeline</div>
                  </div>
                </div>
                <ArrowRight className="h-4 w-4 text-muted group-hover:text-brand" />
              </Link>
            </div>
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

      {/* View Prescription Modal */}
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
              <div className="text-xs uppercase font-semibold text-muted">Clinical Diagnosis</div>
              <div className="text-base font-semibold text-ink">{selectedRx.diagnosis}</div>
              {selectedRx.notes && (
                <div className="text-xs text-body pt-2 border-t border-hairline">
                  <span className="font-semibold text-ink">Physician Advice:</span> {selectedRx.notes}
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
    </DashboardShell>
  );
}
