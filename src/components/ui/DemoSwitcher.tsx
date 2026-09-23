'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Users, User, Stethoscope, Shield, ArrowRight, Sparkles, ChevronDown } from 'lucide-react';
import { loginAction } from '@/actions/auth';

interface DemoUser {
  label: string;
  role: 'ADMIN' | 'DOCTOR' | 'PATIENT';
  email: string;
  sub: string;
  color: string;
}

const DEMO_USERS: DemoUser[] = [
  {
    label: 'Dr. Rajesh Sharma',
    role: 'ADMIN',
    email: 'admin@hospital.com',
    sub: 'Chief Medical Officer / Operational Admin',
    color: 'bg-purple-50 text-purple-700 border-purple-200',
  },
  {
    label: 'Dr. Vikram Malhotra',
    role: 'DOCTOR',
    email: 'dr.malhotra@hospital.com',
    sub: 'Cardiology Specialist',
    color: 'bg-blue-50 text-blue-700 border-blue-200',
  },
  {
    label: 'Dr. Aisha Patel',
    role: 'DOCTOR',
    email: 'dr.patel@hospital.com',
    sub: 'Neurology (On Scheduled Leave)',
    color: 'bg-amber-50 text-amber-700 border-amber-200',
  },
  {
    label: 'Dr. Suresh Iyer',
    role: 'DOCTOR',
    email: 'dr.iyer@hospital.com',
    sub: 'General Medicine Specialist',
    color: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  },
  {
    label: 'Aarav Mehta',
    role: 'PATIENT',
    email: 'patient.aarav@example.com',
    sub: 'Patient (Checked-in for Visit Today)',
    color: 'bg-indigo-50 text-indigo-700 border-indigo-200',
  },
  {
    label: 'Priyanka Verma',
    role: 'PATIENT',
    email: 'patient.priyanka@example.com',
    sub: 'Patient (Has Unpaid Bill ready to Pay)',
    color: 'bg-rose-50 text-rose-700 border-rose-200',
  },
  {
    label: 'Rohan Kapoor',
    role: 'PATIENT',
    email: 'patient.rohan@example.com',
    sub: 'Patient (Consultation In Progress)',
    color: 'bg-teal-50 text-teal-700 border-teal-200',
  },
];

export function DemoSwitcher() {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [switching, setSwitching] = useState<string | null>(null);

  const handleSwitch = async (user: DemoUser) => {
    setSwitching(user.email);
    let pass = 'Patient@12345';
    if (user.role === 'ADMIN') pass = 'Admin@12345';
    if (user.role === 'DOCTOR') pass = 'Doctor@12345';

    try {
      const res = await loginAction({ email: user.email, password: pass });
      if (res.success && res.data?.redirectUrl) {
        setIsOpen(false);
        router.push(res.data.redirectUrl);
        router.refresh();
      }
    } catch (err) {
      console.error('Failed to switch user:', err);
    } finally {
      setSwitching(null);
    }
  };

  return (
    <div className="relative inline-block text-left">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-50/80 hover:bg-blue-100/80 text-brand text-xs font-semibold border border-blue-200/80 transition"
        title="Quick Role Impersonation for System Demonstration"
      >
        <Sparkles className="h-3.5 w-3.5 text-brand" />
        <span className="hidden sm:inline">Switch Role</span>
        <ChevronDown className="h-3 w-3 text-brand/70" />
      </button>

      {isOpen && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
          <div className="absolute right-0 mt-2 w-80 rounded-xl bg-white border border-hairline shadow-soft z-50 p-2 animate-in fade-in slide-in-from-top-1 text-xs">
            <div className="px-3 py-2 border-b border-hairline mb-1">
              <div className="font-semibold text-ink flex items-center justify-between">
                <span>Demo Multi-Role Switcher</span>
                <span className="text-[10px] uppercase font-bold text-brand bg-brand/10 px-1.5 py-0.5 rounded">
                  Live
                </span>
              </div>
              <p className="text-[11px] text-muted mt-0.5">
                Switch instantly between roles to test the connected hospital workflow.
              </p>
            </div>

            <div className="space-y-1 max-h-80 overflow-y-auto p-1">
              {DEMO_USERS.map((u) => {
                const isSelected = switching === u.email;
                return (
                  <button
                    key={u.email}
                    onClick={() => handleSwitch(u)}
                    disabled={!!switching}
                    className="w-full text-left p-2 rounded-lg hover:bg-surface-soft flex items-center justify-between transition group"
                  >
                    <div className="flex items-center gap-2.5">
                      <div className={`h-7 w-7 rounded-full flex items-center justify-center border ${u.color}`}>
                        {u.role === 'ADMIN' && <Shield className="h-3.5 w-3.5" />}
                        {u.role === 'DOCTOR' && <Stethoscope className="h-3.5 w-3.5" />}
                        {u.role === 'PATIENT' && <User className="h-3.5 w-3.5" />}
                      </div>
                      <div>
                        <div className="font-semibold text-ink group-hover:text-brand flex items-center gap-1.5">
                          <span>{u.label}</span>
                          <span className="text-[9px] uppercase px-1 py-0.2 rounded font-bold bg-surface-strong text-muted">
                            {u.role}
                          </span>
                        </div>
                        <div className="text-[11px] text-muted truncate max-w-[180px]">
                          {u.sub}
                        </div>
                      </div>
                    </div>
                    {isSelected ? (
                      <div className="h-3.5 w-3.5 rounded-full border-2 border-brand border-t-transparent animate-spin" />
                    ) : (
                      <ArrowRight className="h-3.5 w-3.5 text-muted opacity-0 group-hover:opacity-100 transition" />
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
