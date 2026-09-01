'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { HeartPulse, LogOut, Calendar, PlusCircle, FileText } from 'lucide-react';
import { SessionUser } from '@/types';
import { logoutAction } from '@/actions/auth';
import { useState } from 'react';

interface NavbarProps {
  user?: SessionUser | null;
  dark?: boolean;
}

export function Navbar({ user, dark = false }: NavbarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [loggingOut, setLoggingOut] = useState(false);

  const handleLogout = async () => {
    setLoggingOut(true);
    await logoutAction();
    router.push('/login');
    router.refresh();
  };

  const getDashboardLink = () => {
    if (!user) return '/login';
    switch (user.role) {
      case 'ADMIN':
        return '/admin/dashboard';
      case 'DOCTOR':
        return '/doctor/dashboard';
      case 'RECEPTIONIST':
        return '/receptionist/dashboard';
      default:
        return '/patient/dashboard';
    }
  };

  return (
    <header
      className={`border-b sticky top-0 z-50 transition-colors duration-150 ${
        dark
          ? 'bg-surface-dark border-surface-dark-elevated text-white'
          : 'bg-white/95 backdrop-blur border-hairline text-ink'
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Brand Logo */}
        <div className="flex items-center gap-6">
          <Link href={user ? getDashboardLink() : '/'} className="flex items-center gap-3 group">
            <div className="h-9 w-9 rounded-full bg-brand flex items-center justify-center text-white shadow-sm transition group-hover:bg-brand-active">
              <HeartPulse className="h-5 w-5" />
            </div>
            <div className="flex items-baseline gap-1.5">
              <span className={`font-semibold text-lg tracking-tight ${dark ? 'text-white' : 'text-ink'}`}>
                HospitalCare
              </span>
              <span className="text-[11px] font-semibold uppercase px-2 py-0.5 rounded-pill bg-surface-strong text-ink">
                HMS
              </span>
            </div>
          </Link>

          {/* Primary Navigation Links when logged in */}
          {user && (
            <nav className="hidden md:flex items-center gap-1 ml-4">
              <Link
                href={getDashboardLink()}
                className={`px-3.5 py-1.5 rounded-pill text-sm font-medium transition ${
                  pathname.includes('/dashboard')
                    ? 'bg-surface-strong text-ink font-semibold'
                    : 'text-body hover:text-ink hover:bg-surface-soft'
                }`}
              >
                Dashboard
              </Link>
              <Link
                href="/appointments"
                className={`px-3.5 py-1.5 rounded-pill text-sm font-medium transition ${
                  pathname === '/appointments'
                    ? 'bg-surface-strong text-ink font-semibold'
                    : 'text-body hover:text-ink hover:bg-surface-soft'
                }`}
              >
                Appointments
              </Link>
              <Link
                href="/appointments/book"
                className={`px-3.5 py-1.5 rounded-pill text-sm font-medium transition ${
                  pathname.startsWith('/appointments/book')
                    ? 'bg-surface-strong text-ink font-semibold'
                    : 'text-body hover:text-ink hover:bg-surface-soft'
                }`}
              >
                Book Visit
              </Link>
              <Link
                href="/medical-records"
                className={`px-3.5 py-1.5 rounded-pill text-sm font-medium transition ${
                  pathname.startsWith('/medical-records')
                    ? 'bg-surface-strong text-ink font-semibold'
                    : 'text-body hover:text-ink hover:bg-surface-soft'
                }`}
              >
                Medical Records
              </Link>
              {(user.role === 'ADMIN' || user.role === 'RECEPTIONIST' || user.role === 'DOCTOR') && (
                <Link
                  href="/patients"
                  className={`px-3.5 py-1.5 rounded-pill text-sm font-medium transition ${
                    pathname.startsWith('/patients')
                      ? 'bg-surface-strong text-ink font-semibold'
                      : 'text-body hover:text-ink hover:bg-surface-soft'
                  }`}
                >
                  Patients
                </Link>
              )}
              <Link
                href="/doctors"
                className={`px-3.5 py-1.5 rounded-pill text-sm font-medium transition ${
                  pathname.startsWith('/doctors')
                    ? 'bg-surface-strong text-ink font-semibold'
                    : 'text-body hover:text-ink hover:bg-surface-soft'
                }`}
              >
                Doctors
              </Link>
              <Link
                href="/departments"
                className={`px-3.5 py-1.5 rounded-pill text-sm font-medium transition ${
                  pathname.startsWith('/departments')
                    ? 'bg-surface-strong text-ink font-semibold'
                    : 'text-body hover:text-ink hover:bg-surface-soft'
                }`}
              >
                Departments
              </Link>
              {user.role === 'ADMIN' && (
                <Link
                  href="/admin/audit"
                  className={`px-3.5 py-1.5 rounded-pill text-sm font-medium transition ${
                    pathname.startsWith('/admin/audit')
                      ? 'bg-surface-strong text-ink font-semibold'
                      : 'text-body hover:text-ink hover:bg-surface-soft'
                  }`}
                >
                  Audit Logs
                </Link>
              )}
            </nav>
          )}
        </div>

        {/* Right CTA / User Status */}
        <div className="flex items-center gap-3">
          {user ? (
            <div className="flex items-center gap-3">
              <div className="hidden sm:flex flex-col text-right">
                <span className="text-sm font-medium text-ink leading-tight">{user.name}</span>
                <span className="text-xs text-muted uppercase tracking-wider font-semibold">{user.role}</span>
              </div>
              <div className="h-9 w-9 rounded-full bg-surface-strong border border-hairline flex items-center justify-center text-ink text-sm font-bold">
                {user.name.charAt(0)}
              </div>
              <button
                onClick={handleLogout}
                disabled={loggingOut}
                title="Sign Out"
                className="p-2 rounded-pill bg-surface-strong hover:bg-hairline text-body hover:text-semantic-down transition"
              >
                <LogOut className="h-4 w-4" />
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2.5">
              <Link
                href="/login"
                className="px-4 py-2 text-sm font-medium text-ink hover:text-brand transition rounded-pill"
              >
                Sign In
              </Link>
              <Link
                href="/register"
                className="btn-primary !h-9 !px-4 !text-sm"
              >
                Register Patient
              </Link>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
