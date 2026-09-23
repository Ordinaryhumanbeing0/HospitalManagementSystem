'use client';

import { useState, Suspense, useEffect } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  HeartPulse,
  Lock,
  Mail,
  ArrowRight,
  Shield,
  AlertCircle,
  Stethoscope,
  User,
  Users,
} from 'lucide-react';
import { loginAction } from '@/actions/auth';

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get('callbackUrl');
  const roleParam = searchParams.get('role');

  const [portalMode, setPortalMode] = useState<'PATIENT' | 'DOCTOR' | 'STAFF'>(() => {
    if (roleParam?.toUpperCase() === 'DOCTOR') return 'DOCTOR';
    if (roleParam?.toUpperCase() === 'ADMIN' || roleParam?.toUpperCase() === 'RECEPTIONIST') return 'STAFF';
    return 'PATIENT';
  });

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (roleParam?.toUpperCase() === 'DOCTOR') {
      setPortalMode('DOCTOR');
      setEmail('dr.malhotra@hospital.com');
      setPassword('Doctor@12345');
    } else if (roleParam?.toUpperCase() === 'PATIENT') {
      setPortalMode('PATIENT');
      setEmail('patient.aarav@example.com');
      setPassword('Patient@12345');
    }
  }, [roleParam]);

  const handleModeSwitch = (mode: 'PATIENT' | 'DOCTOR' | 'STAFF') => {
    setPortalMode(mode);
    setError(null);
    if (mode === 'PATIENT') {
      setEmail('patient.aarav@example.com');
      setPassword('Patient@12345');
    } else if (mode === 'DOCTOR') {
      setEmail('dr.malhotra@hospital.com');
      setPassword('Doctor@12345');
    } else {
      setEmail('admin@hospital.com');
      setPassword('Admin@12345');
    }
  };

  const handleDemoFill = (demoEmail: string, demoPass: string) => {
    setEmail(demoEmail);
    setPassword(demoPass);
    setError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await loginAction({ email, password });
      if (!res.success) {
        setError(res.message || 'Login failed. Please check your credentials.');
        setLoading(false);
        return;
      }

      if (res.data?.redirectUrl) {
        router.push(callbackUrl || res.data.redirectUrl);
        router.refresh();
      }
    } catch (err: any) {
      setError(err.message || 'An unexpected error occurred.');
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md bg-white rounded-xl border border-hairline p-8 shadow-soft">
      {/* Portal Mode Switcher Tabs */}
      <div className="flex items-center gap-1 p-1 bg-surface-soft rounded-xl border border-hairline mb-6">
        <button
          type="button"
          onClick={() => handleModeSwitch('PATIENT')}
          className={`flex-1 py-2 px-2.5 rounded-lg text-xs font-semibold transition flex items-center justify-center gap-1.5 ${
            portalMode === 'PATIENT'
              ? 'bg-brand text-white shadow-sm'
              : 'text-body hover:text-ink'
          }`}
        >
          <User className="h-3.5 w-3.5" /> Patient
        </button>

        <button
          type="button"
          onClick={() => handleModeSwitch('DOCTOR')}
          className={`flex-1 py-2 px-2.5 rounded-lg text-xs font-semibold transition flex items-center justify-center gap-1.5 ${
            portalMode === 'DOCTOR'
              ? 'bg-sky-700 text-white shadow-sm'
              : 'text-body hover:text-ink'
          }`}
        >
          <Stethoscope className="h-3.5 w-3.5" /> Doctor
        </button>

        <button
          type="button"
          onClick={() => handleModeSwitch('STAFF')}
          className={`flex-1 py-2 px-2.5 rounded-lg text-xs font-semibold transition flex items-center justify-center gap-1.5 ${
            portalMode === 'STAFF'
              ? 'bg-surface-dark text-white shadow-sm'
              : 'text-body hover:text-ink'
          }`}
        >
          <Shield className="h-3.5 w-3.5" /> Staff / Admin
        </button>
      </div>

      <div className="mb-6">
        <h1 className="text-2xl font-normal tracking-tight text-ink">
          {portalMode === 'PATIENT' && 'Patient Portal Sign In'}
          {portalMode === 'DOCTOR' && 'Doctor Clinical Sign In'}
          {portalMode === 'STAFF' && 'Administrative Staff Sign In'}
        </h1>
        <p className="text-sm text-body mt-1">
          {portalMode === 'PATIENT' && 'Sign in to access appointments, prescriptions, and EHR timeline.'}
          {portalMode === 'DOCTOR' && 'Sign in to manage shifts, consultation queues, and clinical notes.'}
          {portalMode === 'STAFF' && 'Authorized credentials for receptionists and system administrators.'}
        </p>
      </div>

      {error && (
        <div className="mb-6 p-4 rounded-xl bg-red-50 border border-red-200 text-semantic-down text-sm flex items-start gap-3">
          <AlertCircle className="h-5 w-5 shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-body mb-1.5">
            Email Address
          </label>
          <div className="relative">
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="name@hospital.com"
              className="text-input-md w-full pl-10"
            />
            <Mail className="h-4 w-4 text-muted absolute left-3.5 top-4 pointer-events-none" />
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="block text-xs font-semibold uppercase tracking-wider text-body">
              Password
            </label>
          </div>
          <div className="relative">
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••••••"
              className="text-input-md w-full pl-10"
            />
            <Lock className="h-4 w-4 text-muted absolute left-3.5 top-4 pointer-events-none" />
          </div>
        </div>

        <button
          type="submit"
          disabled={loading}
          className={`w-full !h-12 !text-base mt-2 font-semibold rounded-pill transition text-white ${
            portalMode === 'DOCTOR'
              ? 'bg-sky-700 hover:bg-sky-800'
              : portalMode === 'STAFF'
              ? 'bg-surface-dark hover:bg-surface-dark-elevated'
              : 'bg-brand hover:bg-brand-active'
          }`}
        >
          {loading
            ? 'Authenticating...'
            : portalMode === 'PATIENT'
            ? 'Enter Patient Dashboard'
            : portalMode === 'DOCTOR'
            ? 'Enter Clinical Dashboard'
            : 'Sign In to Portal'}
        </button>
      </form>

      {/* 1-Click Fast Demo Credentials Pill Strip */}
      <div className="mt-8 pt-6 border-t border-hairline">
        <div className="text-xs font-semibold uppercase tracking-wider text-muted mb-3 text-center">
          1-Click Quick Demo Accounts
        </div>
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => {
              handleModeSwitch('PATIENT');
              handleDemoFill('patient.aarav@example.com', 'Patient@12345');
            }}
            className={`p-2.5 rounded-xl border text-left transition flex items-center gap-2 group ${
              portalMode === 'PATIENT'
                ? 'border-brand/50 bg-brand/5'
                : 'border-hairline bg-surface-soft hover:bg-surface-strong'
            }`}
          >
            <div className="h-6 w-6 rounded-full bg-brand/10 text-brand flex items-center justify-center text-xs font-bold">
              P
            </div>
            <div className="overflow-hidden">
              <div className="text-xs font-semibold text-ink leading-tight">Aarav Mehta</div>
              <div className="text-[10px] text-muted truncate">Self-Service</div>
            </div>
          </button>

          <button
            type="button"
            onClick={() => {
              handleModeSwitch('DOCTOR');
              handleDemoFill('dr.malhotra@hospital.com', 'Doctor@12345');
            }}
            className={`p-2.5 rounded-xl border text-left transition flex items-center gap-2 group ${
              portalMode === 'DOCTOR'
                ? 'border-sky-500/50 bg-sky-50'
                : 'border-hairline bg-surface-soft hover:bg-surface-strong'
            }`}
          >
            <div className="h-6 w-6 rounded-full bg-sky-100 text-sky-700 flex items-center justify-center text-xs font-bold">
              D
            </div>
            <div className="overflow-hidden">
              <div className="text-xs font-semibold text-ink leading-tight">Dr. Malhotra</div>
              <div className="text-[10px] text-muted truncate">Cardiologist</div>
            </div>
          </button>

          <button
            type="button"
            onClick={() => {
              handleModeSwitch('STAFF');
              handleDemoFill('reception@hospital.com', 'Staff@12345');
            }}
            className="p-2.5 rounded-xl border border-hairline bg-surface-soft hover:bg-surface-strong text-left transition flex items-center gap-2 group"
          >
            <div className="h-6 w-6 rounded-full bg-emerald-100 text-semantic-up flex items-center justify-center text-xs font-bold">
              R
            </div>
            <div className="overflow-hidden">
              <div className="text-xs font-semibold text-ink leading-tight">Receptionist</div>
              <div className="text-[10px] text-muted truncate">Desk Walk-in</div>
            </div>
          </button>

          <button
            type="button"
            onClick={() => {
              handleModeSwitch('STAFF');
              handleDemoFill('admin@hospital.com', 'Admin@12345');
            }}
            className="p-2.5 rounded-xl border border-hairline bg-surface-soft hover:bg-surface-strong text-left transition flex items-center gap-2 group"
          >
            <div className="h-6 w-6 rounded-full bg-purple-100 text-purple-700 flex items-center justify-center text-xs font-bold">
              A
            </div>
            <div className="overflow-hidden">
              <div className="text-xs font-semibold text-ink leading-tight">Administrator</div>
              <div className="text-[10px] text-muted truncate">Full System</div>
            </div>
          </button>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <div className="min-h-screen flex flex-col justify-between bg-surface-soft">
      <header className="px-6 py-6 max-w-7xl mx-auto w-full flex items-center justify-between">
        <Link href="/" className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-full bg-brand flex items-center justify-center text-white">
            <HeartPulse className="h-5 w-5" />
          </div>
          <span className="font-semibold text-lg tracking-tight text-ink">HospitalCare</span>
        </Link>
        <Link
          href="/register"
          className="text-sm font-medium text-body hover:text-brand transition"
        >
          Need an account? <span className="font-semibold text-brand">Register Patient</span>
        </Link>
      </header>

      <div className="flex-1 flex items-center justify-center px-4 sm:px-6 py-12">
        <Suspense fallback={<div className="text-muted text-sm">Loading login portal...</div>}>
          <LoginForm />
        </Suspense>
      </div>

      <footer className="py-6 text-center text-xs text-muted">
        Hospital Management System • Protected by Role-Based Encryption
      </footer>
    </div>
  );
}
