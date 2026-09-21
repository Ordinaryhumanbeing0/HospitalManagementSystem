import Link from 'next/link';
import {
  HeartPulse,
  ArrowRight,
  ShieldCheck,
  Building2,
  Stethoscope,
  Users,
  Calendar,
  Lock,
  Activity,
  CheckCircle2,
  Clock,
  Droplet,
  Pill,
  FileText,
} from 'lucide-react';
import { Navbar } from '@/components/ui/Navbar';

export default function HomePage() {
  return (
    <div className="min-h-screen flex flex-col bg-white">
      <Navbar />

      {/* Hero Band Dark: Signature Full-Bleed Dark Hero */}
      <section className="bg-surface-dark text-white pt-20 pb-28 px-4 sm:px-6 lg:px-8 border-b border-surface-dark-elevated">
        <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          {/* Left Column: Editorial Headline & Actions */}
          <div className="lg:col-span-7 space-y-6">
            <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-pill bg-surface-dark-elevated border border-white/10 text-white text-xs font-semibold uppercase tracking-wider">
              <span className="h-2 w-2 rounded-full bg-brand animate-pulse"></span>
              Enterprise Healthcare Infrastructure
            </div>

            <h1 className="text-4xl sm:text-6xl font-normal tracking-tight text-white leading-[1.08] max-w-2xl">
              Quietly confident hospital operations, built on{' '}
              <span className="text-white font-medium underline decoration-brand underline-offset-8">
                PostgreSQL
              </span>
              .
            </h1>

            <p className="text-base sm:text-lg text-muted-soft max-w-xl leading-relaxed">
              Automated patient onboarding, multi-department physician catalogs, conflict-free appointment scheduling, and role-based access control.
            </p>

            <div className="pt-4 space-y-3">
              <div className="text-xs font-semibold uppercase tracking-wider text-muted-soft">
                Choose Dedicated Healthcare Portal:
              </div>
              <div className="flex flex-wrap items-center gap-3">
                {/* Patient Entry */}
                <div className="flex items-center gap-2 p-1.5 rounded-pill bg-surface-dark-elevated border border-white/10">
                  <span className="text-xs text-muted-soft pl-3 pr-1 font-medium">Patient:</span>
                  <Link
                    href="/login?role=PATIENT"
                    className="inline-flex items-center gap-1.5 bg-brand hover:bg-brand-active text-white text-xs font-semibold rounded-pill px-4 py-2 transition shadow-sm"
                  >
                    Sign In <ArrowRight className="h-3.5 w-3.5" />
                  </Link>
                  <Link
                    href="/register"
                    className="inline-flex items-center text-xs font-medium text-white/80 hover:text-white px-3 py-2 transition"
                  >
                    Register
                  </Link>
                </div>

                {/* Doctor Entry */}
                <div className="flex items-center gap-2 p-1.5 rounded-pill bg-surface-dark-elevated border border-white/10">
                  <span className="text-xs text-muted-soft pl-3 pr-1 font-medium">Physician:</span>
                  <Link
                    href="/login?role=DOCTOR"
                    className="inline-flex items-center gap-1.5 bg-sky-600 hover:bg-sky-500 text-white text-xs font-semibold rounded-pill px-4 py-2 transition shadow-sm"
                  >
                    Doctor Sign In <ArrowRight className="h-3.5 w-3.5" />
                  </Link>
                </div>
              </div>
            </div>

            {/* Micro stats banner */}
            <div className="pt-8 border-t border-white/10 grid grid-cols-3 gap-6 text-left">
              <div>
                <div className="text-2xl font-bold text-white number-mono">100%</div>
                <div className="text-xs text-muted-soft mt-0.5">Role-Based RBAC</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-white number-mono">&le; 2.0s</div>
                <div className="text-xs text-muted-soft mt-0.5">Target Response</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-semantic-up number-mono">ACID</div>
                <div className="text-xs text-muted-soft mt-0.5">PostgreSQL Guarantees</div>
              </div>
            </div>
          </div>

          {/* Right Column: Floating Layered Product-UI Mockup Cards */}
          <div className="lg:col-span-5 relative">
            {/* Background subtle glow */}
            <div className="absolute -inset-4 bg-brand/10 rounded-3xl filter blur-2xl opacity-60"></div>

            {/* Elevated Primary Mockup Card */}
            <div className="relative bg-surface-dark-elevated rounded-xl border border-white/10 p-6 sm:p-8 shadow-elevated space-y-6">
              <div className="flex items-center justify-between border-b border-white/10 pb-4">
                <div className="flex items-center gap-3">
                  <div className="h-9 w-9 rounded-full bg-brand text-white flex items-center justify-center font-bold text-xs">
                    HMS
                  </div>
                  <div>
                    <div className="text-sm font-semibold text-white">HospitalCare Operations</div>
                    <div className="text-xs text-muted-soft number-mono">Live PostgreSQL Node</div>
                  </div>
                </div>
                <span className="badge-pill !bg-emerald-950 !text-semantic-up !border-emerald-800/40">
                  Active
                </span>
              </div>

              {/* Patient mini record snippet */}
              <div className="p-4 rounded-xl bg-surface-dark border border-white/5 space-y-3">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-soft uppercase font-semibold">Demo Patient Record</span>
                  <span className="text-semantic-up font-semibold number-mono">Verified ID</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold text-white">Johnathan Doe</span>
                  <span className="px-2.5 py-0.5 rounded-pill bg-red-950 text-semantic-down font-bold text-xs number-mono border border-red-900/60">
                    O+ POSITIVE
                  </span>
                </div>
                <div className="text-xs text-muted-soft">
                  742 Evergreen Terrace • Emergency Contact Verified
                </div>
              </div>

              {/* Doctor shift snippet */}
              <div className="p-4 rounded-xl bg-surface-dark border border-white/5 space-y-3">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-soft uppercase font-semibold">Specialist on Duty</span>
                  <span className="text-white number-mono font-semibold">$150.00 / visit</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold text-white">Dr. Robert Chen</span>
                  <span className="badge-pill !bg-white/10 !text-white text-[10px]">
                    Cardiology
                  </span>
                </div>
                <div className="text-xs text-muted-soft number-mono">
                  Mon, Wed, Fri • 09:00 - 16:00 (30m slots)
                </div>
              </div>

              <div className="pt-2 flex items-center justify-between text-xs text-muted-soft border-t border-white/10">
                <span>Security Engine: Bcrypt + JOSE JWT</span>
                <span className="text-semantic-up font-semibold">Zero Double-Booking</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Dedicated Dual Healthcare Portals: Patient vs Doctor */}
      <section className="py-16 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto w-full border-b border-hairline">
        <div className="text-center max-w-3xl mx-auto mb-12 space-y-3">
          <div className="badge-pill !bg-brand/10 !text-brand">Role-Dedicated Gateways</div>
          <h2 className="text-2xl sm:text-3xl font-semibold tracking-tight text-ink">
            Two Independent, Specialized Healthcare Portals
          </h2>
          <p className="text-body text-sm">
            Tailored digital workflows for patients and medical practitioners with strictly separated dashboards and permissions.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Patient Portal Gateway Card */}
          <div className="rounded-2xl border border-hairline p-8 bg-surface-soft hover:shadow-soft transition space-y-6 relative overflow-hidden flex flex-col justify-between">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="badge-pill !bg-brand !text-white text-xs">
                  <Users className="h-3.5 w-3.5 mr-1" /> Patient Portal
                </span>
                <span className="text-xs text-muted font-medium">Self-Service Healthcare</span>
              </div>
              <h3 className="text-xl font-semibold text-ink">
                Patient Consultation & Health Records
              </h3>
              <p className="text-sm text-body leading-relaxed">
                Search specialists, check live duty hours, and reserve verified 30-minute consultation slots. Access your complete chronological EHR history, lab reports, and doctor prescriptions.
              </p>
              <ul className="space-y-2 text-xs text-body pt-2">
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-brand shrink-0" />
                  <span>Real-time doctor shift lookup & conflict-free slot booking</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-brand shrink-0" />
                  <span>Interactive cancellation & slot rescheduling</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-brand shrink-0" />
                  <span>Unified EHR timeline for lab reports & digital prescriptions</span>
                </li>
              </ul>
            </div>

            <div className="pt-6 border-t border-hairline flex items-center gap-3">
              <Link
                href="/login?role=PATIENT"
                className="btn-primary !h-11 !px-6 text-xs flex items-center gap-2"
              >
                Patient Sign In <ArrowRight className="h-3.5 w-3.5" />
              </Link>
              <Link
                href="/register"
                className="btn-secondary !h-11 !px-5 text-xs"
              >
                Register as Patient
              </Link>
            </div>
          </div>

          {/* Doctor Portal Gateway Card */}
          <div className="rounded-2xl border border-hairline p-8 bg-surface-soft hover:shadow-soft transition space-y-6 relative overflow-hidden flex flex-col justify-between">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="badge-pill !bg-sky-700 !text-white text-xs">
                  <Stethoscope className="h-3.5 w-3.5 mr-1" /> Doctor Portal
                </span>
                <span className="text-xs text-muted font-medium">Clinical Workstation</span>
              </div>
              <h3 className="text-xl font-semibold text-ink">
                Physician Consultation & Prescription Portal
              </h3>
              <p className="text-sm text-body leading-relaxed">
                Configure your weekly shifts, monitor pending patient queues, manage appointments, access clinical records, and issue structured digital prescriptions with auto-completion.
              </p>
              <ul className="space-y-2 text-xs text-body pt-2">
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-sky-700 shrink-0" />
                  <span>Direct weekly working shift & slot duration configuration</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-sky-700 shrink-0" />
                  <span>Appointment intake queue with patient profile preview</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-sky-700 shrink-0" />
                  <span>Digital prescription builder with dosage, frequency, & notes</span>
                </li>
              </ul>
            </div>

            <div className="pt-6 border-t border-hairline flex items-center gap-3">
              <Link
                href="/login?role=DOCTOR"
                className="btn-primary !bg-sky-700 hover:!bg-sky-800 !h-11 !px-6 text-xs flex items-center gap-2"
              >
                Doctor Sign In <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Feature Grid: Clean White Editorial Section */}
      <section className="py-24 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto w-full">
        <div className="text-center max-w-3xl mx-auto mb-16 space-y-4">
          <div className="badge-pill">Core Architectural Worklets</div>
          <h2 className="text-3xl sm:text-4xl font-normal tracking-tight text-ink">
            Designed for institutional reliability and clinical speed.
          </h2>
          <p className="text-body text-base">
            Every module is engineered with strict type safety, database row-level locking, and granular permission enforcement.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Card 1 */}
          <div className="card-institutional p-8 space-y-4">
            <div className="h-12 w-12 rounded-full bg-surface-strong flex items-center justify-center text-brand mb-6">
              <Users className="h-6 w-6" />
            </div>
            <h3 className="text-xl font-semibold text-ink">Patient & User Management</h3>
            <p className="text-sm text-body leading-relaxed">
              Automated demographic registration, multi-field indexed search by name/phone/email, blood group tracking, and electronic health identity cards.
            </p>
            <div className="pt-4 border-t border-hairline flex items-center gap-2 text-xs font-semibold text-brand">
              <span>Worklet 1 Ready</span> <CheckCircle2 className="h-4 w-4 text-semantic-up" />
            </div>
          </div>

          {/* Card 2 */}
          <div className="card-institutional p-8 space-y-4">
            <div className="h-12 w-12 rounded-full bg-surface-strong flex items-center justify-center text-brand mb-6">
              <Stethoscope className="h-6 w-6" />
            </div>
            <h3 className="text-xl font-semibold text-ink">Doctor & Department Catalog</h3>
            <p className="text-sm text-body leading-relaxed">
              Structured clinical divisions (Cardiology, Neurology, Pediatrics, Orthopedics) with customized consultation fees and weekly shift timing configurations.
            </p>
            <div className="pt-4 border-t border-hairline flex items-center gap-2 text-xs font-semibold text-brand">
              <span>8 Active Divisions</span> <CheckCircle2 className="h-4 w-4 text-semantic-up" />
            </div>
          </div>

          {/* Card 3 */}
          <div className="card-institutional p-8 space-y-4">
            <div className="h-12 w-12 rounded-full bg-surface-strong flex items-center justify-center text-brand mb-6">
              <ShieldCheck className="h-6 w-6" />
            </div>
            <h3 className="text-xl font-semibold text-ink">Role-Based Security & Audit</h3>
            <p className="text-sm text-body leading-relaxed">
              Strict RBAC protecting Administrative, Doctor, Receptionist, and Patient dashboards with immutable event audit trail logging on PostgreSQL.
            </p>
            <div className="pt-4 border-t border-hairline flex items-center gap-2 text-xs font-semibold text-brand">
              <span>Edge Interception Active</span> <CheckCircle2 className="h-4 w-4 text-semantic-up" />
            </div>
          </div>
        </div>
      </section>

      {/* CTA Pre-Footer Band Dark */}
      <section className="bg-surface-dark text-white py-20 px-4 sm:px-6 lg:px-8 border-t border-surface-dark-elevated text-center">
        <div className="max-w-4xl mx-auto space-y-6">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-pill bg-surface-dark-elevated text-xs font-semibold uppercase tracking-wider text-muted-soft">
            <Activity className="h-3.5 w-3.5 text-brand" /> Instant Access
          </div>
          <h2 className="text-3xl sm:text-5xl font-normal tracking-tight text-white">
            Experience the hospital management workflow today.
          </h2>
          <p className="text-muted-soft text-base max-w-xl mx-auto">
            Test the live system using pre-seeded Admin, Receptionist, Doctor, and Patient accounts.
          </p>
          <div className="pt-4 flex justify-center gap-4">
            <Link
              href="/login"
              className="btn-pill-cta"
            >
              Sign In to Portal <ArrowRight className="h-4 w-4 ml-2" />
            </Link>
          </div>
        </div>
      </section>

      {/* Institutional Footer */}
      <footer className="bg-white border-t border-hairline py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-8 mb-12">
          <div>
            <div className="text-xs font-bold uppercase tracking-wider text-ink mb-4">Portals</div>
            <ul className="space-y-2 text-sm text-body">
              <li><Link href="/admin/dashboard" className="hover:text-brand">Admin Console</Link></li>
              <li><Link href="/doctor/dashboard" className="hover:text-brand">Doctor Workspace</Link></li>
              <li><Link href="/receptionist/dashboard" className="hover:text-brand">Front Desk</Link></li>
              <li><Link href="/patient/dashboard" className="hover:text-brand">Patient Portal</Link></li>
            </ul>
          </div>

          <div>
            <div className="text-xs font-bold uppercase tracking-wider text-ink mb-4">Directories</div>
            <ul className="space-y-2 text-sm text-body">
              <li><Link href="/patients" className="hover:text-brand">Patient Registry</Link></li>
              <li><Link href="/doctors" className="hover:text-brand">Medical Doctors</Link></li>
              <li><Link href="/departments" className="hover:text-brand">Clinical Departments</Link></li>
            </ul>
          </div>

          <div>
            <div className="text-xs font-bold uppercase tracking-wider text-ink mb-4">Architecture</div>
            <ul className="space-y-2 text-sm text-body">
              <li><span className="text-muted">Neon PostgreSQL 18.6</span></li>
              <li><span className="text-muted">Prisma ORM & Connection Pool</span></li>
              <li><span className="text-muted">Next.js 15 App Router</span></li>
              <li><span className="text-muted">Zod Validation Engine</span></li>
            </ul>
          </div>

          <div>
            <div className="text-xs font-bold uppercase tracking-wider text-ink mb-4">Security</div>
            <ul className="space-y-2 text-sm text-body">
              <li><Link href="/admin/audit" className="hover:text-brand">Audit Trail Log</Link></li>
              <li><span className="text-muted">Bcrypt Salted Hashes</span></li>
              <li><span className="text-muted">HTTP-Only JWT Cookies</span></li>
            </ul>
          </div>
        </div>

        <div className="pt-8 border-t border-hairline flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-muted">
          <div>© {new Date().getFullYear()} HospitalCare Systems. All rights reserved.</div>
          <div className="flex gap-6">
            <span>Privacy Policy</span>
            <span>Healthcare Compliance</span>
            <span>Security Statement</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
