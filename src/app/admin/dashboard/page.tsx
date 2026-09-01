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
} from 'lucide-react';
import { DashboardShell } from '@/components/ui/DashboardShell';
import { getAuthUserAction } from '@/actions/auth';
import { getPatientsAction } from '@/actions/patient';
import { getDoctorsAction } from '@/actions/doctor';
import { getDepartmentsAction } from '@/actions/department';
import { getAuditLogsAction } from '@/actions/audit';
import { SessionUser } from '@/types';

export default function AdminDashboardPage() {
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState<SessionUser | null>(null);
  const [stats, setStats] = useState({
    patients: 0,
    doctors: 0,
    departments: 0,
    logs: 0,
  });
  const [recentLogs, setRecentLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getAuthUserAction().then((res) => {
      if (res.data && res.data.role === 'ADMIN') {
        setCurrentUser(res.data);
      } else {
        router.push('/login?callbackUrl=/admin/dashboard');
      }
    });

    Promise.all([
      getPatientsAction({ limit: 1 }),
      getDoctorsAction({ limit: 1 }),
      getDepartmentsAction(),
      getAuditLogsAction({ limit: 5 }),
    ]).then(([patientsRes, doctorsRes, deptsRes, logsRes]) => {
      setStats({
        patients: patientsRes.data?.total || 0,
        doctors: doctorsRes.data?.total || 0,
        departments: deptsRes.data?.length || 0,
        logs: logsRes.data?.total || 0,
      });
      if (logsRes.data?.logs) {
        setRecentLogs(logsRes.data.logs);
      }
      setLoading(false);
    });
  }, [router]);

  if (!currentUser) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white text-body">
        Authenticating administrator...
      </div>
    );
  }

  return (
    <DashboardShell
      user={currentUser}
      title="Hospital Operations & Administration"
      subtitle="Enterprise management, clinical staff directory, departmental control, and audit logs."
      badge="Administrative Command Portal"
    >
      {/* 4 Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
        <Link href="/patients" className="card-institutional group">
          <div className="flex items-center justify-between">
            <span className="text-xs uppercase font-semibold text-muted tracking-wider">
              Total Patients
            </span>
            <div className="h-9 w-9 rounded-full bg-surface-strong group-hover:bg-brand group-hover:text-white flex items-center justify-center text-ink transition">
              <Users className="h-4 w-4" />
            </div>
          </div>
          <div className="text-3xl font-bold text-ink number-mono mt-3">
            {stats.patients}
          </div>
          <div className="text-xs text-semantic-up font-medium mt-2 flex items-center gap-1">
            Registered & Active Electronic Records
          </div>
        </Link>

        <Link href="/doctors" className="card-institutional group">
          <div className="flex items-center justify-between">
            <span className="text-xs uppercase font-semibold text-muted tracking-wider">
              Medical Doctors
            </span>
            <div className="h-9 w-9 rounded-full bg-surface-strong group-hover:bg-brand group-hover:text-white flex items-center justify-center text-ink transition">
              <Stethoscope className="h-4 w-4" />
            </div>
          </div>
          <div className="text-3xl font-bold text-ink number-mono mt-3">
            {stats.doctors}
          </div>
          <div className="text-xs text-body font-medium mt-2 flex items-center gap-1">
            Assigned Clinical Specialists
          </div>
        </Link>

        <Link href="/departments" className="card-institutional group">
          <div className="flex items-center justify-between">
            <span className="text-xs uppercase font-semibold text-muted tracking-wider">
              Departments
            </span>
            <div className="h-9 w-9 rounded-full bg-surface-strong group-hover:bg-brand group-hover:text-white flex items-center justify-center text-ink transition">
              <Building2 className="h-4 w-4" />
            </div>
          </div>
          <div className="text-3xl font-bold text-ink number-mono mt-3">
            {stats.departments}
          </div>
          <div className="text-xs text-body font-medium mt-2 flex items-center gap-1">
            Active Clinical Divisions
          </div>
        </Link>

        <Link href="/admin/audit" className="card-institutional group">
          <div className="flex items-center justify-between">
            <span className="text-xs uppercase font-semibold text-muted tracking-wider">
              Audit Events
            </span>
            <div className="h-9 w-9 rounded-full bg-surface-strong group-hover:bg-brand group-hover:text-white flex items-center justify-center text-ink transition">
              <ShieldCheck className="h-4 w-4" />
            </div>
          </div>
          <div className="text-3xl font-bold text-ink number-mono mt-3">
            {stats.logs}
          </div>
          <div className="text-xs text-semantic-up font-medium mt-2 flex items-center gap-1">
            PostgreSQL ACID Logged
          </div>
        </Link>
      </div>

      {/* Quick Operations Strip */}
      <div className="bg-surface-dark text-white rounded-xl p-8 mb-10 shadow-soft">
        <div className="max-w-3xl">
          <div className="inline-flex items-center gap-1.5 bg-surface-dark-elevated text-white text-xs font-semibold uppercase tracking-wider rounded-pill px-3 py-1 mb-3">
            <Activity className="h-3.5 w-3.5 text-brand" /> Instant Administrative Actions
          </div>
          <h2 className="text-2xl font-normal tracking-tight text-white">
            Manage Staff, Divisions & Patient Registers
          </h2>
          <p className="text-sm text-muted-soft mt-2">
            Directly onboard specialized medical doctors, modify hospital clinical departments, or query patient demographic records.
          </p>

          <div className="mt-6 flex flex-wrap items-center gap-3">
            <Link
              href="/patients"
              className="btn-primary !h-11"
            >
              <UserPlus className="h-4 w-4 mr-2" /> Patient Directory
            </Link>
            <Link
              href="/doctors"
              className="inline-flex items-center justify-center bg-surface-dark-elevated hover:bg-white/10 text-white font-medium text-sm rounded-pill px-5 py-2.5 h-11 transition"
            >
              <Stethoscope className="h-4 w-4 mr-2" /> Doctor Directory
            </Link>
            <Link
              href="/departments"
              className="inline-flex items-center justify-center bg-surface-dark-elevated hover:bg-white/10 text-white font-medium text-sm rounded-pill px-5 py-2.5 h-11 transition"
            >
              <Building2 className="h-4 w-4 mr-2" /> Hospital Departments
            </Link>
            <Link
              href="/admin/audit"
              className="inline-flex items-center justify-center bg-surface-dark-elevated hover:bg-white/10 text-white font-medium text-sm rounded-pill px-5 py-2.5 h-11 transition"
            >
              <Shield className="h-4 w-4 mr-2" /> Audit Trail
            </Link>
          </div>
        </div>
      </div>

      {/* Recent System Audit Logs Stream */}
      <div className="bg-white rounded-xl border border-hairline overflow-hidden shadow-soft">
        <div className="p-6 border-b border-hairline flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-ink">System Audit Trail</h3>
            <p className="text-xs text-body mt-0.5">Real-time security and database modification log</p>
          </div>
          <Link
            href="/admin/audit"
            className="text-xs font-semibold text-brand hover:text-brand-active flex items-center gap-1"
          >
            View Full Log <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>

        <div className="divide-y divide-hairline">
          {recentLogs.map((log) => (
            <div key={log.id} className="p-4 sm:p-5 flex items-start justify-between gap-4 hover:bg-surface-soft transition">
              <div className="flex items-start gap-3">
                <div className="h-8 w-8 rounded-full bg-surface-strong flex items-center justify-center text-brand shrink-0 mt-0.5">
                  <ShieldCheck className="h-4 w-4" />
                </div>
                <div>
                  <div className="text-sm font-semibold text-ink">{log.action}</div>
                  <div className="text-xs text-body mt-0.5">{log.details || 'No additional details.'}</div>
                  {log.user && (
                    <div className="text-[11px] text-muted mt-1">
                      Triggered by <span className="font-semibold text-ink">{log.user.name}</span> ({log.user.email})
                    </div>
                  )}
                </div>
              </div>
              <div className="text-right shrink-0">
                <div className="text-xs number-mono text-muted">
                  {new Date(log.createdAt).toLocaleTimeString()}
                </div>
                <div className="text-[10px] text-muted-soft number-mono">
                  {new Date(log.createdAt).toLocaleDateString()}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </DashboardShell>
  );
}
