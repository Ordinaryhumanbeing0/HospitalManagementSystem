'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  HeartPulse,
  LogOut,
  ChevronDown,
  Menu,
  X,
  CreditCard,
  Building2,
  FileBarChart,
  ShieldAlert,
  User,
  Calendar,
  PlusCircle,
  FileText,
  Users,
  Stethoscope,
  LayoutDashboard,
} from 'lucide-react';
import { SessionUser } from '@/types';
import { logoutAction } from '@/actions/auth';
import { NotificationBell } from './NotificationBell';
import { DemoSwitcher } from './DemoSwitcher';

interface NavbarProps {
  user?: SessionUser | null;
  dark?: boolean;
}

export function Navbar({ user, dark = false }: NavbarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [loggingOut, setLoggingOut] = useState(false);
  const [isOperationsOpen, setIsOperationsOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const operationsRef = useRef<HTMLDivElement>(null);
  const profileRef = useRef<HTMLDivElement>(null);

  // Close dropdowns on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (operationsRef.current && !operationsRef.current.contains(event.target as Node)) {
        setIsOperationsOpen(false);
      }
      if (profileRef.current && !profileRef.current.contains(event.target as Node)) {
        setIsProfileOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Close mobile menu on route change
  useEffect(() => {
    setIsMobileMenuOpen(false);
    setIsOperationsOpen(false);
    setIsProfileOpen(false);
  }, [pathname]);

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

  // Extract clean first name / display title
  const getShortName = (name: string) => {
    const parts = name.split(' ');
    if (parts[0] === 'Dr.') {
      return `${parts[0]} ${parts[1] || ''}`.trim();
    }
    return parts[0];
  };

  const getRoleBadgeColor = (role?: string) => {
    switch (role) {
      case 'ADMIN':
        return 'bg-purple-50 text-purple-700 border-purple-200';
      case 'DOCTOR':
        return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'RECEPTIONIST':
        return 'bg-amber-50 text-amber-700 border-amber-200';
      default:
        return 'bg-emerald-50 text-emerald-700 border-emerald-200';
    }
  };

  const isOperationsActive = () => {
    return (
      pathname.startsWith('/billing') ||
      pathname.startsWith('/departments') ||
      pathname.startsWith('/reports') ||
      pathname.startsWith('/admin/audit')
    );
  };

  return (
    <header
      className={`border-b sticky top-0 z-50 transition-colors duration-150 ${
        dark
          ? 'bg-surface-dark/95 backdrop-blur border-surface-dark-elevated text-white'
          : 'bg-white/95 backdrop-blur-md border-hairline text-ink'
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
        {/* Left: Brand Identity */}
        <div className="flex items-center gap-6">
          <Link href={user ? getDashboardLink() : '/'} className="flex items-center gap-2.5 group shrink-0">
            <div className="h-9 w-9 rounded-xl bg-brand flex items-center justify-center text-white shadow-sm transition group-hover:scale-105">
              <HeartPulse className="h-5 w-5" />
            </div>
            <div className="flex items-center gap-1.5">
              <span className={`font-bold text-base sm:text-lg tracking-tight ${dark ? 'text-white' : 'text-ink'}`}>
                HospitalCare
              </span>
              <span className="text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-surface-strong text-muted border border-hairline/60">
                HMS
              </span>
            </div>
          </Link>

          {/* Center: Streamlined Primary Navigation (Desktop) */}
          {user && (
            <nav className="hidden lg:flex items-center gap-1">
              {/* PATIENT Navigation */}
              {user.role === 'PATIENT' && (
                <>
                  <Link
                    href="/patient/dashboard"
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                      pathname === '/patient/dashboard'
                        ? 'bg-surface-strong text-ink'
                        : 'text-body hover:text-ink hover:bg-surface-soft'
                    }`}
                  >
                    My Portal
                  </Link>
                  <Link
                    href="/appointments"
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                      pathname === '/appointments'
                        ? 'bg-surface-strong text-ink'
                        : 'text-body hover:text-ink hover:bg-surface-soft'
                    }`}
                  >
                    Appointments
                  </Link>
                  <Link
                    href="/appointments/book"
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                      pathname.startsWith('/appointments/book')
                        ? 'bg-surface-strong text-ink'
                        : 'text-body hover:text-ink hover:bg-surface-soft'
                    }`}
                  >
                    Book Visit
                  </Link>
                  <Link
                    href="/medical-records"
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                      pathname.startsWith('/medical-records')
                        ? 'bg-surface-strong text-ink'
                        : 'text-body hover:text-ink hover:bg-surface-soft'
                    }`}
                  >
                    Health Records & Rx
                  </Link>
                  <Link
                    href="/billing"
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                      pathname.startsWith('/billing')
                        ? 'bg-surface-strong text-ink'
                        : 'text-body hover:text-ink hover:bg-surface-soft'
                    }`}
                  >
                    Bills & Payments
                  </Link>
                </>
              )}

              {/* DOCTOR Navigation */}
              {user.role === 'DOCTOR' && (
                <>
                  <Link
                    href="/doctor/dashboard"
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                      pathname === '/doctor/dashboard'
                        ? 'bg-surface-strong text-ink'
                        : 'text-body hover:text-ink hover:bg-surface-soft'
                    }`}
                  >
                    Clinical Workstation
                  </Link>
                  <Link
                    href="/appointments"
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                      pathname === '/appointments'
                        ? 'bg-surface-strong text-ink'
                        : 'text-body hover:text-ink hover:bg-surface-soft'
                    }`}
                  >
                    Consultations Queue
                  </Link>
                  <Link
                    href="/medical-records"
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                      pathname.startsWith('/medical-records')
                        ? 'bg-surface-strong text-ink'
                        : 'text-body hover:text-ink hover:bg-surface-soft'
                    }`}
                  >
                    EHR Records
                  </Link>
                  <Link
                    href="/patients"
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                      pathname.startsWith('/patients')
                        ? 'bg-surface-strong text-ink'
                        : 'text-body hover:text-ink hover:bg-surface-soft'
                    }`}
                  >
                    Patients
                  </Link>
                </>
              )}

              {/* RECEPTIONIST Navigation */}
              {user.role === 'RECEPTIONIST' && (
                <>
                  <Link
                    href="/receptionist/dashboard"
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                      pathname === '/receptionist/dashboard'
                        ? 'bg-surface-strong text-ink'
                        : 'text-body hover:text-ink hover:bg-surface-soft'
                    }`}
                  >
                    Front Desk
                  </Link>
                  <Link
                    href="/appointments"
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                      pathname === '/appointments'
                        ? 'bg-surface-strong text-ink'
                        : 'text-body hover:text-ink hover:bg-surface-soft'
                    }`}
                  >
                    Appointments
                  </Link>
                  <Link
                    href="/patients"
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                      pathname.startsWith('/patients')
                        ? 'bg-surface-strong text-ink'
                        : 'text-body hover:text-ink hover:bg-surface-soft'
                    }`}
                  >
                    Patients
                  </Link>
                  <Link
                    href="/billing"
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                      pathname.startsWith('/billing')
                        ? 'bg-surface-strong text-ink'
                        : 'text-body hover:text-ink hover:bg-surface-soft'
                    }`}
                  >
                    Billing Desk
                  </Link>
                </>
              )}

              {/* ADMIN Navigation (Grouped to prevent horizontal clutter) */}
              {user.role === 'ADMIN' && (
                <>
                  <Link
                    href="/admin/dashboard"
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                      pathname === '/admin/dashboard'
                        ? 'bg-surface-strong text-ink'
                        : 'text-body hover:text-ink hover:bg-surface-soft'
                    }`}
                  >
                    Control Center
                  </Link>
                  <Link
                    href="/appointments"
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                      pathname === '/appointments'
                        ? 'bg-surface-strong text-ink'
                        : 'text-body hover:text-ink hover:bg-surface-soft'
                    }`}
                  >
                    Appointments
                  </Link>
                  <Link
                    href="/patients"
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                      pathname.startsWith('/patients')
                        ? 'bg-surface-strong text-ink'
                        : 'text-body hover:text-ink hover:bg-surface-soft'
                    }`}
                  >
                    Patients
                  </Link>
                  <Link
                    href="/doctors"
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                      pathname.startsWith('/doctors')
                        ? 'bg-surface-strong text-ink'
                        : 'text-body hover:text-ink hover:bg-surface-soft'
                    }`}
                  >
                    Doctors
                  </Link>

                  {/* Operations Dropdown (Cleanly houses Billing, Depts, Reports, Audit) */}
                  <div className="relative" ref={operationsRef}>
                    <button
                      onClick={() => setIsOperationsOpen(!isOperationsOpen)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition flex items-center gap-1 ${
                        isOperationsActive()
                          ? 'bg-surface-strong text-ink'
                          : 'text-body hover:text-ink hover:bg-surface-soft'
                      }`}
                    >
                      <span>Operations</span>
                      <ChevronDown
                        className={`h-3 w-3 transition-transform ${isOperationsOpen ? 'rotate-180' : ''}`}
                      />
                    </button>

                    {isOperationsOpen && (
                      <div className="absolute left-0 mt-2 w-52 rounded-xl bg-white border border-hairline shadow-soft z-50 p-1.5 animate-in fade-in slide-in-from-top-1 text-xs">
                        <Link
                          href="/billing"
                          className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-ink hover:bg-surface-soft font-medium transition"
                        >
                          <CreditCard className="h-4 w-4 text-brand" />
                          <span>Billing & Ledger</span>
                        </Link>
                        <Link
                          href="/departments"
                          className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-ink hover:bg-surface-soft font-medium transition"
                        >
                          <Building2 className="h-4 w-4 text-brand" />
                          <span>Clinical Departments</span>
                        </Link>
                        <Link
                          href="/reports"
                          className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-ink hover:bg-surface-soft font-medium transition"
                        >
                          <FileBarChart className="h-4 w-4 text-brand" />
                          <span>Analytics & Reports</span>
                        </Link>
                        <div className="my-1 border-t border-hairline" />
                        <Link
                          href="/admin/audit"
                          className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-ink hover:bg-surface-soft font-medium transition"
                        >
                          <ShieldAlert className="h-4 w-4 text-brand" />
                          <span>Audit Trail</span>
                        </Link>
                      </div>
                    )}
                  </div>
                </>
              )}
            </nav>
          )}
        </div>

        {/* Right: Actions, Notifications & Unified Profile Menu */}
        <div className="flex items-center gap-2.5 sm:gap-3">
          {/* Quick Demo Switcher */}
          <DemoSwitcher />

          {user ? (
            <div className="flex items-center gap-2">
              <NotificationBell />

              {/* Unified User Profile Menu */}
              <div className="relative" ref={profileRef}>
                <button
                  onClick={() => setIsProfileOpen(!isProfileOpen)}
                  className="flex items-center gap-2 p-1.5 sm:px-2.5 sm:py-1 rounded-xl hover:bg-surface-soft border border-hairline/80 transition text-left"
                >
                  <div className="h-7 w-7 rounded-lg bg-surface-strong border border-hairline flex items-center justify-center text-ink text-xs font-bold shrink-0">
                    {user.name.charAt(0)}
                  </div>
                  <div className="hidden sm:flex flex-col">
                    <span className="text-xs font-semibold text-ink leading-tight">
                      {getShortName(user.name)}
                    </span>
                    <span className="text-[10px] text-muted font-medium uppercase tracking-wider">
                      {user.role}
                    </span>
                  </div>
                  <ChevronDown className="h-3 w-3 text-muted hidden sm:block" />
                </button>

                {/* Profile Popover Card */}
                {isProfileOpen && (
                  <div className="absolute right-0 mt-2 w-64 rounded-xl bg-white border border-hairline shadow-soft z-50 p-3 animate-in fade-in slide-in-from-top-1 text-xs">
                    {/* User Info Header */}
                    <div className="pb-3 border-b border-hairline">
                      <div className="font-semibold text-ink text-sm truncate">{user.name}</div>
                      <div className="text-muted text-[11px] truncate">{user.email}</div>
                      <div className="mt-2">
                        <span
                          className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border ${getRoleBadgeColor(
                            user.role
                          )}`}
                        >
                          {user.role}
                        </span>
                      </div>
                    </div>

                    {/* Quick Links */}
                    <div className="py-2 space-y-1">
                      <Link
                        href={getDashboardLink()}
                        className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-ink hover:bg-surface-soft font-medium transition"
                      >
                        <LayoutDashboard className="h-3.5 w-3.5 text-brand" />
                        <span>Go to My Dashboard</span>
                      </Link>
                      <Link
                        href="/appointments"
                        className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-ink hover:bg-surface-soft font-medium transition"
                      >
                        <Calendar className="h-3.5 w-3.5 text-brand" />
                        <span>Appointments</span>
                      </Link>
                    </div>

                    {/* Sign Out Button */}
                    <div className="pt-2 border-t border-hairline">
                      <button
                        onClick={handleLogout}
                        disabled={loggingOut}
                        className="w-full flex items-center justify-between px-2.5 py-2 rounded-lg text-semantic-down hover:bg-red-50 font-semibold transition"
                      >
                        <span className="flex items-center gap-2">
                          <LogOut className="h-3.5 w-3.5" />
                          <span>{loggingOut ? 'Signing out...' : 'Sign Out'}</span>
                        </span>
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Mobile Menu Toggle Button */}
              <button
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                className="lg:hidden p-2 rounded-lg text-body hover:text-ink hover:bg-surface-soft transition"
                aria-label="Toggle navigation menu"
              >
                {isMobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Link
                href="/login"
                className="px-3.5 py-1.5 text-xs font-semibold text-ink hover:text-brand transition rounded-lg"
              >
                Sign In
              </Link>
              <Link
                href="/register"
                className="btn-primary !h-8 !px-3.5 !text-xs"
              >
                Register
              </Link>
            </div>
          )}
        </div>
      </div>

      {/* Mobile Drawer Navigation */}
      {isMobileMenuOpen && user && (
        <div className="lg:hidden border-t border-hairline bg-white px-4 py-4 space-y-2 text-xs animate-in fade-in">
          {user.role === 'ADMIN' && (
            <>
              <Link href="/admin/dashboard" className="block py-2 font-semibold text-ink">
                Control Center Dashboard
              </Link>
              <Link href="/appointments" className="block py-2 text-body">
                Appointments
              </Link>
              <Link href="/patients" className="block py-2 text-body">
                Patients Directory
              </Link>
              <Link href="/doctors" className="block py-2 text-body">
                Doctors Management
              </Link>
              <Link href="/billing" className="block py-2 text-body">
                Billing & Ledger
              </Link>
              <Link href="/departments" className="block py-2 text-body">
                Clinical Departments
              </Link>
              <Link href="/reports" className="block py-2 text-body">
                Analytics Reports
              </Link>
              <Link href="/admin/audit" className="block py-2 text-body">
                Audit Trail
              </Link>
            </>
          )}

          {user.role === 'DOCTOR' && (
            <>
              <Link href="/doctor/dashboard" className="block py-2 font-semibold text-ink">
                Clinical Workstation
              </Link>
              <Link href="/appointments" className="block py-2 text-body">
                Consultations Queue
              </Link>
              <Link href="/medical-records" className="block py-2 text-body">
                Patient EHR Records
              </Link>
              <Link href="/patients" className="block py-2 text-body">
                Patients Directory
              </Link>
            </>
          )}

          {user.role === 'PATIENT' && (
            <>
              <Link href="/patient/dashboard" className="block py-2 font-semibold text-ink">
                My Health Portal
              </Link>
              <Link href="/appointments" className="block py-2 text-body">
                My Appointments
              </Link>
              <Link href="/appointments/book" className="block py-2 text-body">
                Book Consultation
              </Link>
              <Link href="/medical-records" className="block py-2 text-body">
                Health Records & Rx
              </Link>
              <Link href="/billing" className="block py-2 text-body">
                Bills & Payments
              </Link>
            </>
          )}

          {user.role === 'RECEPTIONIST' && (
            <>
              <Link href="/receptionist/dashboard" className="block py-2 font-semibold text-ink">
                Front Desk
              </Link>
              <Link href="/appointments" className="block py-2 text-body">
                Appointments
              </Link>
              <Link href="/patients" className="block py-2 text-body">
                Patients
              </Link>
              <Link href="/billing" className="block py-2 text-body">
                Billing Desk
              </Link>
            </>
          )}

          <div className="pt-2 border-t border-hairline">
            <button
              onClick={handleLogout}
              className="w-full text-left py-2 text-semantic-down font-semibold flex items-center gap-2"
            >
              <LogOut className="h-4 w-4" /> Sign Out
            </button>
          </div>
        </div>
      )}
    </header>
  );
}
