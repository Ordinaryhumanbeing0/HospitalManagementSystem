'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  ShieldCheck,
  Search,
  Clock,
  User,
  Filter,
  Activity,
} from 'lucide-react';
import { DashboardShell } from '@/components/ui/DashboardShell';
import { getAuditLogsAction } from '@/actions/audit';
import { getAuthUserAction } from '@/actions/auth';
import { SessionUser } from '@/types';

export default function AuditLogsPage() {
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState<SessionUser | null>(null);
  const [logs, setLogs] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [actionFilter, setActionFilter] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getAuthUserAction().then((res) => {
      if (res.data && res.data.role === 'ADMIN') {
        setCurrentUser(res.data);
      } else {
        router.push('/login?callbackUrl=/admin/audit');
      }
    });
  }, [router]);

  const loadLogs = async (action = actionFilter, p = page) => {
    setLoading(true);
    const res = await getAuditLogsAction({
      action: action || undefined,
      page: p,
      limit: 25,
    });
    if (res.success && res.data) {
      setLogs(res.data.logs);
      setTotal(res.data.total);
    }
    setLoading(false);
  };

  useEffect(() => {
    if (currentUser) {
      loadLogs();
    }
  }, [currentUser, page]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    loadLogs(actionFilter, 1);
  };

  if (!currentUser) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white text-body">
        Loading security logs...
      </div>
    );
  }

  return (
    <DashboardShell
      user={currentUser}
      title="System Audit & Security Logs"
      subtitle="Immutable event audit trail for authentication, profile updates, and database administrative actions."
      badge="Administrative Security Trail"
    >
      {/* Filter Bar */}
      <div className="bg-white rounded-xl border border-hairline p-4 sm:p-6 mb-8 shadow-soft">
        <form onSubmit={handleSearch} className="flex gap-3">
          <div className="relative flex-1">
            <input
              type="text"
              value={actionFilter}
              onChange={(e) => setActionFilter(e.target.value)}
              placeholder="Filter by Action Type (e.g. LOGIN_SUCCESS, PATIENT_CREATED, DOCTOR_CREATED)..."
              className="search-pill w-full pl-11"
            />
            <Search className="h-4 w-4 text-muted absolute left-4 top-3.5 pointer-events-none" />
          </div>

          <button type="submit" className="btn-secondary !px-5">
            Filter Logs
          </button>
        </form>
      </div>

      {/* Logs Table */}
      <div className="bg-white rounded-xl border border-hairline overflow-hidden shadow-soft">
        <div className="p-5 border-b border-hairline flex items-center justify-between">
          <div className="text-sm font-semibold text-ink">
            Audit Records <span className="number-mono text-muted">({total})</span>
          </div>
        </div>

        {loading ? (
          <div className="p-12 text-center text-muted text-sm">Querying audit logs...</div>
        ) : logs.length === 0 ? (
          <div className="p-12 text-center text-muted text-sm">No audit logs found.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-surface-soft border-b border-hairline text-xs uppercase font-semibold text-muted tracking-wider">
                <tr>
                  <th className="px-6 py-4">Action Type</th>
                  <th className="px-6 py-4">Triggered By</th>
                  <th className="px-6 py-4">Details</th>
                  <th className="px-6 py-4">Client IP</th>
                  <th className="px-6 py-4 text-right">Timestamp</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-hairline">
                {logs.map((log) => (
                  <tr key={log.id} className="hover:bg-surface-soft/60 transition">
                    <td className="px-6 py-4">
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-pill text-xs font-semibold uppercase tracking-wider bg-surface-strong text-ink number-mono">
                        <ShieldCheck className="h-3 w-3 text-brand" /> {log.action}
                      </span>
                    </td>

                    <td className="px-6 py-4">
                      {log.user ? (
                        <div>
                          <div className="font-semibold text-ink text-xs">{log.user.name}</div>
                          <div className="text-[11px] text-muted">{log.user.email}</div>
                        </div>
                      ) : (
                        <span className="text-xs text-muted">System / Unauthenticated</span>
                      )}
                    </td>

                    <td className="px-6 py-4 text-xs text-body max-w-md">
                      {log.details || '—'}
                    </td>

                    <td className="px-6 py-4 text-xs text-muted number-mono">
                      {log.ipAddress || '127.0.0.1'}
                    </td>

                    <td className="px-6 py-4 text-right">
                      <div className="text-xs number-mono text-ink">
                        {new Date(log.createdAt).toLocaleTimeString()}
                      </div>
                      <div className="text-[10px] number-mono text-muted">
                        {new Date(log.createdAt).toLocaleDateString()}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </DashboardShell>
  );
}
