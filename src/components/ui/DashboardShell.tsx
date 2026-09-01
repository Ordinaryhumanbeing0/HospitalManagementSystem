import { ReactNode } from 'react';
import { Navbar } from './Navbar';
import { SessionUser } from '@/types';

interface DashboardShellProps {
  user: SessionUser;
  title: string;
  subtitle?: string;
  badge?: string;
  actionButton?: ReactNode;
  children: ReactNode;
}

export function DashboardShell({
  user,
  title,
  subtitle,
  badge,
  actionButton,
  children,
}: DashboardShellProps) {
  return (
    <div className="min-h-screen flex flex-col bg-white">
      <Navbar user={user} />

      {/* Page Header Band */}
      <div className="border-b border-hairline bg-surface-soft py-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              {badge && (
                <div className="inline-flex items-center gap-1.5 bg-white border border-hairline text-ink text-xs font-semibold uppercase tracking-wider rounded-pill px-3 py-1 mb-3">
                  <span className="h-1.5 w-1.5 rounded-full bg-brand"></span>
                  {badge}
                </div>
              )}
              <h1 className="text-2xl sm:text-3xl font-normal tracking-tight text-ink">
                {title}
              </h1>
              {subtitle && (
                <p className="mt-1 text-sm sm:text-base text-body">
                  {subtitle}
                </p>
              )}
            </div>
            {actionButton && (
              <div className="flex items-center gap-3">{actionButton}</div>
            )}
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full">
        {children}
      </main>

      {/* Footer */}
      <footer className="border-t border-hairline bg-white py-8 mt-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-muted">
          <div>
            © {new Date().getFullYear()} HospitalCare Enterprise Systems. Confidential Medical Infrastructure.
          </div>
          <div className="flex items-center gap-6">
            <span>Serverless PostgreSQL</span>
            <span>Role-Based Access Control</span>
            <span>ACID Enforced</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
