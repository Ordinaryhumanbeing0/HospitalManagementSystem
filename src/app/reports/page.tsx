'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  TrendingUp,
  DollarSign,
  Users,
  Calendar,
  Filter,
  Download,
  Building2,
  Stethoscope,
  Activity,
  CheckCircle2,
  PieChart,
  BarChart3,
  FileSpreadsheet,
  RefreshCw,
  Clock,
  ArrowUpRight,
} from 'lucide-react';
import { DashboardShell } from '@/components/ui/DashboardShell';
import { getAuthUserAction } from '@/actions/auth';
import { getDepartmentsAction } from '@/actions/department';
import { getRevenueAndFootfallReportsAction, exportReportCsvAction } from '@/actions/report';
import { SessionUser, RevenueReportData } from '@/types';
import { formatCurrency } from '@/lib/config/currency';

export default function ReportsPage() {
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState<SessionUser | null>(null);
  const [loadingUser, setLoadingUser] = useState(true);

  // Filter state
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [selectedDeptId, setSelectedDeptId] = useState<string>('ALL');
  const [departments, setDepartments] = useState<any[]>([]);

  // Report data state
  const [report, setReport] = useState<RevenueReportData | null>(null);
  const [loadingReport, setLoadingReport] = useState(true);
  const [exportingCsv, setExportingCsv] = useState(false);

  // Authenticate user
  useEffect(() => {
    getAuthUserAction().then((res) => {
      if (res.data && res.data.role === 'ADMIN') {
        setCurrentUser(res.data);
      } else {
        router.push('/login?role=ADMIN&callbackUrl=/reports');
      }
      setLoadingUser(false);
    });

    getDepartmentsAction().then((res) => {
      if (res.success && res.data) {
        setDepartments(res.data);
      }
    });
  }, [router]);

  // Load report data
  const loadReport = async (sDate = startDate, eDate = endDate, dept = selectedDeptId) => {
    setLoadingReport(true);
    const res = await getRevenueAndFootfallReportsAction({
      startDate: sDate || undefined,
      endDate: eDate || undefined,
      departmentId: dept !== 'ALL' ? dept : undefined,
    });

    if (res.success && res.data) {
      setReport(res.data);
    }
    setLoadingReport(false);
  };

  useEffect(() => {
    if (currentUser) {
      loadReport(startDate, endDate, selectedDeptId);
    }
  }, [currentUser, startDate, endDate, selectedDeptId]);

  // Preset Date Range Handlers
  const handlePreset = (preset: 'TODAY' | '7DAYS' | 'THIS_MONTH' | 'ALL') => {
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];

    if (preset === 'TODAY') {
      setStartDate(todayStr);
      setEndDate(todayStr);
    } else if (preset === '7DAYS') {
      const prior = new Date();
      prior.setDate(prior.getDate() - 7);
      setStartDate(prior.toISOString().split('T')[0]);
      setEndDate(todayStr);
    } else if (preset === 'THIS_MONTH') {
      const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
      setStartDate(firstDay.toISOString().split('T')[0]);
      setEndDate(todayStr);
    } else {
      setStartDate('');
      setEndDate('');
    }
  };

  // CSV Export
  const handleExportCsv = async () => {
    setExportingCsv(true);
    const res = await exportReportCsvAction({
      startDate: startDate || undefined,
      endDate: endDate || undefined,
      departmentId: selectedDeptId !== 'ALL' ? selectedDeptId : undefined,
    });

    if (res.success && res.data) {
      const blob = new Blob([res.data.csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.setAttribute('href', url);
      link.setAttribute('download', res.data.filename);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
    setExportingCsv(false);
  };

  if (loadingUser || !currentUser) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white text-body text-sm">
        Authenticating executive reporting portal...
      </div>
    );
  }

  return (
    <DashboardShell
      user={currentUser}
      title="Financial Analytics & Clinical Performance Reports"
      subtitle="DBMS-aggregated financial statements, service revenue categories, department breakdown, and patient footfall statistics."
      badge="Administrative Intelligence"
      actionButton={
        <button
          onClick={handleExportCsv}
          disabled={exportingCsv || !report}
          className="btn-primary flex items-center gap-2 text-xs !py-2 !px-3"
        >
          {exportingCsv ? (
            <RefreshCw className="h-4 w-4 animate-spin" />
          ) : (
            <FileSpreadsheet className="h-4 w-4" />
          )}
          <span>Export CSV Report</span>
        </button>
      }
    >
      {/* Date & Department Filter Panel */}
      <div className="bg-white rounded-xl border border-hairline p-4 mb-8 shadow-soft flex flex-col md:flex-row gap-4 items-center justify-between">
        {/* Preset Range Buttons */}
        <div className="flex items-center gap-1.5 overflow-x-auto w-full md:w-auto">
          <button
            onClick={() => handlePreset('ALL')}
            className={`px-3 py-1.5 rounded-pill text-xs font-semibold whitespace-nowrap transition ${
              !startDate && !endDate ? 'bg-ink text-white' : 'bg-surface-soft text-body hover:bg-surface-strong hover:text-ink'
            }`}
          >
            All-Time Cumulative
          </button>
          <button
            onClick={() => handlePreset('TODAY')}
            className="px-3 py-1.5 rounded-pill text-xs font-semibold whitespace-nowrap bg-surface-soft text-body hover:bg-surface-strong hover:text-ink transition"
          >
            Today
          </button>
          <button
            onClick={() => handlePreset('7DAYS')}
            className="px-3 py-1.5 rounded-pill text-xs font-semibold whitespace-nowrap bg-surface-soft text-body hover:bg-surface-strong hover:text-ink transition"
          >
            Last 7 Days
          </button>
          <button
            onClick={() => handlePreset('THIS_MONTH')}
            className="px-3 py-1.5 rounded-pill text-xs font-semibold whitespace-nowrap bg-surface-soft text-body hover:bg-surface-strong hover:text-ink transition"
          >
            This Month
          </button>
        </div>

        {/* Custom Range and Dept Filter */}
        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          <div className="flex items-center gap-1.5 text-xs text-muted">
            <span>From:</span>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="input-field text-xs !py-1 !px-2"
            />
            <span>To:</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="input-field text-xs !py-1 !px-2"
            />
          </div>

          <select
            value={selectedDeptId}
            onChange={(e) => setSelectedDeptId(e.target.value)}
            className="input-field text-xs !py-1.5 !px-3"
          >
            <option value="ALL">All Departments</option>
            {departments.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {loadingReport || !report ? (
        <div className="p-16 text-center text-body text-sm bg-white rounded-xl border border-hairline shadow-soft">
          <RefreshCw className="h-6 w-6 animate-spin mx-auto mb-3 text-muted" />
          Aggregating database financial metrics...
        </div>
      ) : (
        <div className="space-y-8">
          {/* Executive Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="card-institutional">
              <div className="flex items-center justify-between">
                <span className="text-xs uppercase font-semibold text-muted tracking-wider">
                  Total Collected Revenue
                </span>
                <div className="h-9 w-9 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center">
                  <DollarSign className="h-5 w-5" />
                </div>
              </div>
              <div className="text-3xl font-bold text-emerald-600 number-mono mt-3">
                {formatCurrency(report.summary.totalRevenue)}
              </div>
              <div className="text-xs text-muted mt-2 flex items-center gap-1 font-medium">
                Collection Rate: <span className="font-bold text-emerald-600">{report.summary.collectionRate}%</span>
              </div>
            </div>

            <div className="card-institutional">
              <div className="flex items-center justify-between">
                <span className="text-xs uppercase font-semibold text-muted tracking-wider">
                  Gross Billed Volume
                </span>
                <div className="h-9 w-9 rounded-full bg-surface-strong flex items-center justify-center text-ink">
                  <TrendingUp className="h-5 w-5" />
                </div>
              </div>
              <div className="text-3xl font-bold text-ink number-mono mt-3">
                {formatCurrency(report.summary.totalBilled)}
              </div>
              <div className="text-xs text-muted mt-2">
                Avg Bill: <span className="font-mono font-semibold text-ink">{formatCurrency(report.summary.averageBillValue)}</span>
              </div>
            </div>

            <div className="card-institutional">
              <div className="flex items-center justify-between">
                <span className="text-xs uppercase font-semibold text-muted tracking-wider">
                  Outstanding Receivables
                </span>
                <div className="h-9 w-9 rounded-full bg-amber-50 text-amber-600 flex items-center justify-center">
                  <Clock className="h-5 w-5" />
                </div>
              </div>
              <div className="text-3xl font-bold text-amber-600 number-mono mt-3">
                {formatCurrency(report.summary.totalOutstanding)}
              </div>
              <div className="text-xs text-amber-700 mt-2 font-medium">Unsettled patient fees</div>
            </div>

            <div className="card-institutional">
              <div className="flex items-center justify-between">
                <span className="text-xs uppercase font-semibold text-muted tracking-wider">
                  Patient Footfall
                </span>
                <div className="h-9 w-9 rounded-full bg-surface-strong flex items-center justify-center text-brand">
                  <Users className="h-5 w-5" />
                </div>
              </div>
              <div className="text-3xl font-bold text-ink number-mono mt-3">
                {report.summary.totalPatients}
              </div>
              <div className="text-xs text-muted mt-2">
                {report.summary.totalConsultations} completed consultations
              </div>
            </div>
          </div>

          {/* Service Category Breakdown & Department Distribution */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Category Revenue Breakdown */}
            <div className="bg-white rounded-xl border border-hairline p-6 shadow-soft">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-base font-bold text-ink">Service Category Breakdown</h3>
                  <p className="text-xs text-muted">Revenue stream categorization across clinical operations</p>
                </div>
                <div className="h-8 w-8 rounded-full bg-surface-strong flex items-center justify-center text-ink">
                  <PieChart className="h-4 w-4" />
                </div>
              </div>

              <div className="space-y-3.5 pt-2">
                {/* Consultation */}
                <div>
                  <div className="flex justify-between text-xs mb-1 font-medium">
                    <span className="flex items-center gap-1.5 text-ink">
                      <Stethoscope className="h-3.5 w-3.5 text-brand" /> Physician Consultations
                    </span>
                    <span className="font-mono font-bold text-ink">
                      {formatCurrency(report.revenueByCategory.consultation)}
                    </span>
                  </div>
                  <div className="w-full bg-surface-soft h-2 rounded-full overflow-hidden">
                    <div
                      className="bg-brand h-full rounded-full"
                      style={{
                        width: `${
                          report.summary.totalBilled > 0
                            ? (report.revenueByCategory.consultation / report.summary.totalBilled) * 100
                            : 0
                        }%`,
                      }}
                    />
                  </div>
                </div>

                {/* Lab Tests */}
                <div>
                  <div className="flex justify-between text-xs mb-1 font-medium">
                    <span className="flex items-center gap-1.5 text-ink">
                      <Activity className="h-3.5 w-3.5 text-emerald-600" /> Lab & Diagnostic Scans
                    </span>
                    <span className="font-mono font-bold text-ink">
                      {formatCurrency(report.revenueByCategory.lab)}
                    </span>
                  </div>
                  <div className="w-full bg-surface-soft h-2 rounded-full overflow-hidden">
                    <div
                      className="bg-emerald-500 h-full rounded-full"
                      style={{
                        width: `${
                          report.summary.totalBilled > 0
                            ? (report.revenueByCategory.lab / report.summary.totalBilled) * 100
                            : 0
                        }%`,
                      }}
                    />
                  </div>
                </div>

                {/* Medications */}
                <div>
                  <div className="flex justify-between text-xs mb-1 font-medium">
                    <span className="flex items-center gap-1.5 text-ink">
                      <DollarSign className="h-3.5 w-3.5 text-indigo-600" /> Pharmacy & Prescriptions
                    </span>
                    <span className="font-mono font-bold text-ink">
                      {formatCurrency(report.revenueByCategory.medication)}
                    </span>
                  </div>
                  <div className="w-full bg-surface-soft h-2 rounded-full overflow-hidden">
                    <div
                      className="bg-indigo-500 h-full rounded-full"
                      style={{
                        width: `${
                          report.summary.totalBilled > 0
                            ? (report.revenueByCategory.medication / report.summary.totalBilled) * 100
                            : 0
                        }%`,
                      }}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Department Revenue Breakdown */}
            <div className="bg-white rounded-xl border border-hairline p-6 shadow-soft">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-base font-bold text-ink">Departmental Revenue Share</h3>
                  <p className="text-xs text-muted">Financial performance distribution by clinical specialty</p>
                </div>
                <div className="h-8 w-8 rounded-full bg-surface-strong flex items-center justify-center text-ink">
                  <Building2 className="h-4 w-4" />
                </div>
              </div>

              <div className="divide-y divide-hairline">
                {report.departmentRevenue.length === 0 ? (
                  <div className="py-8 text-center text-xs text-muted">No department revenue recorded.</div>
                ) : (
                  report.departmentRevenue.map((dept, i) => (
                    <div key={i} className="py-2.5 flex items-center justify-between text-xs">
                      <div className="font-semibold text-ink flex items-center gap-2">
                        <span className="h-2 w-2 rounded-full bg-brand" />
                        {dept.departmentName}
                      </div>
                      <div className="flex items-center gap-4">
                        <span className="text-muted font-mono">{dept.percentage}% share</span>
                        <span className="font-bold font-mono text-ink">{formatCurrency(dept.revenue)}</span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* Daily Trends Table */}
          {report.dailyTrends.length > 0 && (
            <div className="bg-white rounded-xl border border-hairline overflow-hidden shadow-soft">
              <div className="p-4 border-b border-hairline bg-surface-soft flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-ink">Daily Financial & Activity Trends</h3>
                  <p className="text-xs text-muted">Recent day-by-day revenue collections and patient visits</p>
                </div>
                <BarChart3 className="h-4 w-4 text-muted" />
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-surface-soft text-muted font-semibold uppercase tracking-wider border-b border-hairline">
                    <tr>
                      <th className="py-3 px-4">Date</th>
                      <th className="py-3 px-4 text-right">Daily Revenue</th>
                      <th className="py-3 px-4 text-right">Patient Footfall</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-hairline">
                    {report.dailyTrends.map((t, idx) => (
                      <tr key={idx} className="hover:bg-surface-soft/50 transition font-mono">
                        <td className="py-3 px-4 text-ink font-semibold">{t.date}</td>
                        <td className="py-3 px-4 text-right text-emerald-600 font-bold">
                          {formatCurrency(t.revenue)}
                        </td>
                        <td className="py-3 px-4 text-right text-ink font-semibold">
                          {t.patientCount} patients
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}
    </DashboardShell>
  );
}
