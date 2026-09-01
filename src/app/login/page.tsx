'use client';

import { useState, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { HeartPulse, Lock, Mail, ArrowRight, Shield, AlertCircle, CheckCircle2, User } from 'lucide-react';
import { loginAction } from '@/actions/auth';

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get('callbackUrl');

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
      <div className="mb-6">
        <div className="inline-flex items-center gap-1.5 bg-surface-strong text-ink text-xs font-semibold uppercase tracking-wider rounded-pill px-3 py-1 mb-3">
          <Shield className="h-3.5 w-3.5 text-brand" /> Secure Portal Access
        </div>
        <h1 className="text-2xl font-normal tracking-tight text-ink">
          Sign In to HospitalCare
        </h1>
        <p className="text-sm text-body mt-1">
          Enter your authorized staff or patient credentials.
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
          className="btn-primary w-full !h-12 !text-base mt-2"
        >
          {loading ? 'Authenticating...' : 'Sign In'}
        </button>
      </form>

      {/* 1-Click Fast Demo Credentials Pill Strip */}
      <div className="mt-8 pt-6 border-t border-hairline">
        <div className="text-xs font-semibold uppercase tracking-wider text-muted mb-3 text-center">
          Quick 1-Click Demo Logins
        </div>
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => handleDemoFill('admin@hospital.com', 'Admin@12345')}
            className="p-2.5 rounded-xl border border-hairline bg-surface-soft hover:bg-surface-strong text-left transition flex items-center gap-2 group"
          >
            <div className="h-6 w-6 rounded-full bg-brand/10 text-brand flex items-center justify-center text-xs font-bold">
              A
            </div>
            <div className="overflow-hidden">
              <div className="text-xs font-semibold text-ink leading-tight">Admin</div>
              <div className="text-[10px] text-muted truncate">Full Privileges</div>
            </div>
          </button>

          <button
            type="button"
            onClick={() => handleDemoFill('reception@hospital.com', 'Staff@12345')}
            className="p-2.5 rounded-xl border border-hairline bg-surface-soft hover:bg-surface-strong text-left transition flex items-center gap-2 group"
          >
            <div className="h-6 w-6 rounded-full bg-emerald-100 text-semantic-up flex items-center justify-center text-xs font-bold">
              R
            </div>
            <div className="overflow-hidden">
              <div className="text-xs font-semibold text-ink leading-tight">Receptionist</div>
              <div className="text-[10px] text-muted truncate">Desk & Patients</div>
            </div>
          </button>

          <button
            type="button"
            onClick={() => handleDemoFill('dr.chen@hospital.com', 'Doctor@12345')}
            className="p-2.5 rounded-xl border border-hairline bg-surface-soft hover:bg-surface-strong text-left transition flex items-center gap-2 group"
          >
            <div className="h-6 w-6 rounded-full bg-sky-100 text-sky-700 flex items-center justify-center text-xs font-bold">
              D
            </div>
            <div className="overflow-hidden">
              <div className="text-xs font-semibold text-ink leading-tight">Dr. Chen</div>
              <div className="text-[10px] text-muted truncate">Cardiologist</div>
            </div>
          </button>

          <button
            type="button"
            onClick={() => handleDemoFill('patient.john@example.com', 'Patient@12345')}
            className="p-2.5 rounded-xl border border-hairline bg-surface-soft hover:bg-surface-strong text-left transition flex items-center gap-2 group"
          >
            <div className="h-6 w-6 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center text-xs font-bold">
              P
            </div>
            <div className="overflow-hidden">
              <div className="text-xs font-semibold text-ink leading-tight">Patient John</div>
              <div className="text-[10px] text-muted truncate">Demographics</div>
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
        <Suspense fallback={<div className="text-muted text-sm">Loading login form...</div>}>
          <LoginForm />
        </Suspense>
      </div>

      <footer className="py-6 text-center text-xs text-muted">
        Hospital Management System • Protected by Role-Based Encryption
      </footer>
    </div>
  );
}
