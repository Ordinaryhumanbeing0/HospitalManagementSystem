'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  Stethoscope,
  Search,
  Plus,
  Building2,
  Calendar,
  DollarSign,
  Mail,
  Phone,
  Trash2,
  Eye,
  CheckCircle2,
  AlertCircle,
  Clock,
  GraduationCap,
} from 'lucide-react';
import { DashboardShell } from '@/components/ui/DashboardShell';
import { Modal } from '@/components/ui/Modal';
import { getDoctorsAction, createDoctorAction, deleteDoctorAction } from '@/actions/doctor';
import { getDepartmentsAction } from '@/actions/department';
import { getAuthUserAction } from '@/actions/auth';
import { SessionUser } from '@/types';

const DAYS_OF_WEEK = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

export default function DoctorsPage() {
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState<SessionUser | null>(null);
  const [loadingUser, setLoadingUser] = useState(true);

  const [doctors, setDoctors] = useState<any[]>([]);
  const [departments, setDepartments] = useState<any[]>([]);
  const [selectedDept, setSelectedDept] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);

  // Modals
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [selectedDoctor, setSelectedDoctor] = useState<any | null>(null);
  const [createLoading, setCreateLoading] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  // New Doctor Form
  const [newDoctor, setNewDoctor] = useState({
    name: '',
    email: '',
    phone: '',
    password: '',
    departmentId: '',
    specialization: '',
    qualification: '',
    consultationFee: 120,
    schedules: [
      { dayOfWeek: 1, startTime: '09:00', endTime: '17:00', slotDuration: 30, isActive: true },
      { dayOfWeek: 3, startTime: '09:00', endTime: '17:00', slotDuration: 30, isActive: true },
      { dayOfWeek: 5, startTime: '09:00', endTime: '13:00', slotDuration: 30, isActive: true },
    ],
  });

  useEffect(() => {
    getAuthUserAction().then((res) => {
      if (res.data) {
        setCurrentUser(res.data);
      } else {
        router.push('/login?callbackUrl=/doctors');
      }
      setLoadingUser(false);
    });

    getDepartmentsAction().then((res) => {
      if (res.success && res.data && res.data.length > 0) {
        setDepartments(res.data);
        const firstDeptId = res.data[0].id;
        setNewDoctor((prev) => ({ ...prev, departmentId: firstDeptId }));
      }
    });
  }, [router]);

  const loadDoctors = async (dept = selectedDept, search = searchQuery) => {
    setLoading(true);
    const res = await getDoctorsAction({
      departmentId: dept !== 'ALL' ? dept : undefined,
      search: search || undefined,
      limit: 50,
    });
    if (res.success && res.data) {
      setDoctors(res.data.doctors);
    }
    setLoading(false);
  };

  useEffect(() => {
    if (currentUser) {
      loadDoctors();
    }
  }, [currentUser, selectedDept]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    loadDoctors(selectedDept, searchQuery);
  };

  const handleCreateDoctor = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreateError(null);
    setCreateLoading(true);

    const res = await createDoctorAction(newDoctor);
    if (!res.success) {
      setCreateError(res.message || 'Failed to create doctor.');
      setCreateLoading(false);
      return;
    }

    setCreateLoading(false);
    setIsCreateOpen(false);
    setActionSuccess('Doctor profile & clinical schedules created successfully.');
    setTimeout(() => setActionSuccess(null), 4000);
    loadDoctors();
  };

  const handleDeleteDoctor = async (doctorId: string, docName: string) => {
    if (!confirm(`Are you sure you want to remove doctor "${docName}" from the staff directory?`)) return;

    const res = await deleteDoctorAction(doctorId);
    if (res.success) {
      setActionSuccess(`Doctor "${docName}" removed successfully.`);
      setTimeout(() => setActionSuccess(null), 4000);
      loadDoctors();
    } else {
      alert(res.message || 'Failed to delete doctor.');
    }
  };

  if (loadingUser || !currentUser) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white text-body">
        Loading doctor directory...
      </div>
    );
  }

  return (
    <DashboardShell
      user={currentUser}
      title="Medical Staff & Doctor Directory"
      subtitle="Physicians, departmental affiliations, qualifications, and consultation fee schedules."
      badge="Worklet 1: Doctor Management"
      actionButton={
        currentUser.role === 'ADMIN' && (
          <button
            onClick={() => setIsCreateOpen(true)}
            className="btn-primary flex items-center gap-2"
          >
            <Plus className="h-4 w-4" /> Add Doctor
          </button>
        )
      }
    >
      {/* Toast Notification */}
      {actionSuccess && (
        <div className="mb-6 p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-semantic-up text-sm flex items-center gap-2">
          <CheckCircle2 className="h-5 w-5" />
          <span>{actionSuccess}</span>
        </div>
      )}

      {/* Filter Bar */}
      <div className="bg-white rounded-xl border border-hairline p-4 sm:p-6 mb-8 shadow-soft">
        <form onSubmit={handleSearch} className="flex flex-col md:flex-row gap-3">
          <div className="relative flex-1">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by Doctor Name, Specialization, Qualification..."
              className="search-pill w-full pl-11"
            />
            <Search className="h-4 w-4 text-muted absolute left-4 top-3.5 pointer-events-none" />
          </div>

          <div className="flex items-center gap-3">
            <select
              value={selectedDept}
              onChange={(e) => setSelectedDept(e.target.value)}
              className="search-pill bg-white border border-hairline text-xs font-semibold uppercase"
            >
              <option value="ALL">All Departments</option>
              {departments.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </select>

            <button type="submit" className="btn-secondary !px-4">
              Search
            </button>
          </div>
        </form>
      </div>

      {/* Doctor Cards Grid */}
      {loading ? (
        <div className="p-12 text-center text-muted text-sm">Loading doctors...</div>
      ) : doctors.length === 0 ? (
        <div className="p-12 text-center text-muted text-sm bg-white rounded-xl border border-hairline">
          No doctors match the selected department or query.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {doctors.map((doc) => (
            <div
              key={doc.id}
              className="card-institutional flex flex-col justify-between"
            >
              <div>
                {/* Header */}
                <div className="flex items-start justify-between gap-3 mb-4">
                  <div>
                    <span className="badge-pill mb-2">
                      <Building2 className="h-3 w-3 text-brand" /> {doc.department.name}
                    </span>
                    <h3 className="text-lg font-semibold text-ink leading-tight">
                      {doc.user.name}
                    </h3>
                    <p className="text-xs text-muted mt-1 font-medium">
                      {doc.specialization}
                    </p>
                  </div>
                  <div className="h-10 w-10 rounded-full bg-surface-strong border border-hairline flex items-center justify-center text-ink text-sm font-bold shrink-0">
                    <Stethoscope className="h-5 w-5 text-brand" />
                  </div>
                </div>

                {/* Meta details */}
                <div className="space-y-2 py-3 border-y border-hairline text-xs text-body">
                  <div className="flex items-center gap-2">
                    <GraduationCap className="h-3.5 w-3.5 text-muted shrink-0" />
                    <span>{doc.qualification}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Mail className="h-3.5 w-3.5 text-muted shrink-0" />
                    <span className="truncate">{doc.user.email}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Phone className="h-3.5 w-3.5 text-muted shrink-0" />
                    <span className="number-mono">{doc.user.phone || 'N/A'}</span>
                  </div>
                </div>

                {/* Consultation Fee & Schedule summary */}
                <div className="mt-4 flex items-center justify-between">
                  <div>
                    <div className="text-[11px] uppercase font-semibold text-muted tracking-wider">
                      Consultation Fee
                    </div>
                    <div className="text-base font-bold text-ink number-mono">
                      ${Number(doc.consultationFee).toFixed(2)}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-[11px] uppercase font-semibold text-muted tracking-wider">
                      Weekly Availability
                    </div>
                    <div className="text-xs font-semibold text-semantic-up number-mono">
                      {doc.schedules?.length || 0} active days
                    </div>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="mt-6 pt-4 border-t border-hairline flex items-center justify-between">
                <button
                  onClick={() => setSelectedDoctor(doc)}
                  className="btn-secondary !h-9 !px-4 !text-xs"
                >
                  View Profile & Slots
                </button>

                {currentUser.role === 'ADMIN' && (
                  <button
                    onClick={() => handleDeleteDoctor(doc.id, doc.user.name)}
                    title="Remove Doctor"
                    className="p-2 rounded-full hover:bg-red-50 text-muted hover:text-semantic-down transition"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Doctor Detail & Schedule Modal */}
      <Modal
        isOpen={!!selectedDoctor}
        onClose={() => setSelectedDoctor(null)}
        title={selectedDoctor?.user?.name || 'Doctor Profile'}
        subtitle={`${selectedDoctor?.specialization} • ${selectedDoctor?.department?.name}`}
        maxWidth="lg"
      >
        {selectedDoctor && (
          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-4 p-4 rounded-xl bg-surface-soft border border-hairline">
              <div>
                <div className="text-xs font-semibold uppercase text-muted">Department</div>
                <div className="text-sm font-semibold text-ink mt-0.5">
                  {selectedDoctor.department.name}
                </div>
              </div>
              <div>
                <div className="text-xs font-semibold uppercase text-muted">Consultation Fee</div>
                <div className="text-base font-bold text-ink number-mono mt-0.5">
                  ${Number(selectedDoctor.consultationFee).toFixed(2)}
                </div>
              </div>
              <div>
                <div className="text-xs font-semibold uppercase text-muted">Qualifications</div>
                <div className="text-sm text-ink mt-0.5">{selectedDoctor.qualification}</div>
              </div>
              <div>
                <div className="text-xs font-semibold uppercase text-muted">Email / Contact</div>
                <div className="text-sm text-ink mt-0.5">
                  {selectedDoctor.user.email} • {selectedDoctor.user.phone || 'N/A'}
                </div>
              </div>
            </div>

            {/* Weekly Schedule Slots */}
            <div>
              <h4 className="text-xs font-semibold uppercase tracking-wider text-muted mb-3 flex items-center gap-1.5">
                <Clock className="h-4 w-4 text-brand" /> Weekly Consultation Shift Timings
              </h4>
              {selectedDoctor.schedules && selectedDoctor.schedules.length > 0 ? (
                <div className="space-y-2">
                  {selectedDoctor.schedules.map((s: any) => (
                    <div
                      key={s.id}
                      className="p-3 rounded-xl bg-white border border-hairline flex items-center justify-between text-sm"
                    >
                      <div className="font-semibold text-ink">
                        {DAYS_OF_WEEK[s.dayOfWeek]}
                      </div>
                      <div className="number-mono text-body text-xs font-medium">
                        {s.startTime} — {s.endTime} ({s.slotDuration} min intervals)
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-4 rounded-xl bg-surface-soft text-xs text-muted text-center border border-hairline">
                  No active weekly schedule slots defined.
                </div>
              )}
            </div>

            <div className="flex justify-end pt-4 border-t border-hairline">
              <button
                onClick={() => setSelectedDoctor(null)}
                className="btn-secondary"
              >
                Close
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* Create Doctor Modal */}
      <Modal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        title="Onboard New Medical Doctor"
        subtitle="Create physician profile, assign hospital department, and set fee schedule."
        maxWidth="lg"
      >
        {createError && (
          <div className="mb-4 p-3 rounded-xl bg-red-50 border border-red-200 text-semantic-down text-sm flex items-center gap-2">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{createError}</span>
          </div>
        )}

        <form onSubmit={handleCreateDoctor} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold uppercase text-body mb-1">
                Doctor Full Name *
              </label>
              <input
                type="text"
                required
                value={newDoctor.name}
                onChange={(e) => setNewDoctor({ ...newDoctor, name: e.target.value })}
                placeholder="Dr. Full Name"
                className="text-input-md w-full"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase text-body mb-1">
                Email Address *
              </label>
              <input
                type="email"
                required
                value={newDoctor.email}
                onChange={(e) => setNewDoctor({ ...newDoctor, email: e.target.value })}
                placeholder="dr.name@hospital.com"
                className="text-input-md w-full"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase text-body mb-1">
                Phone Number *
              </label>
              <input
                type="tel"
                required
                value={newDoctor.phone}
                onChange={(e) => setNewDoctor({ ...newDoctor, phone: e.target.value })}
                placeholder="+1 (555) 000-0000"
                className="text-input-md w-full"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase text-body mb-1">
                Account Password *
              </label>
              <input
                type="password"
                required
                value={newDoctor.password}
                onChange={(e) => setNewDoctor({ ...newDoctor, password: e.target.value })}
                placeholder="Min 8 chars, uppercase & number"
                className="text-input-md w-full"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase text-body mb-1">
                Hospital Department *
              </label>
              <select
                required
                value={newDoctor.departmentId}
                onChange={(e) => setNewDoctor({ ...newDoctor, departmentId: e.target.value })}
                className="text-input-md w-full bg-white"
              >
                {departments.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase text-body mb-1">
                Consultation Fee ($) *
              </label>
              <input
                type="number"
                step="0.01"
                required
                value={newDoctor.consultationFee}
                onChange={(e) => setNewDoctor({ ...newDoctor, consultationFee: parseFloat(e.target.value) })}
                className="text-input-md w-full number-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase text-body mb-1">
                Specialization *
              </label>
              <input
                type="text"
                required
                value={newDoctor.specialization}
                onChange={(e) => setNewDoctor({ ...newDoctor, specialization: e.target.value })}
                placeholder="e.g. Interventional Cardiology"
                className="text-input-md w-full"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase text-body mb-1">
                Qualifications *
              </label>
              <input
                type="text"
                required
                value={newDoctor.qualification}
                onChange={(e) => setNewDoctor({ ...newDoctor, qualification: e.target.value })}
                placeholder="e.g. MD, FACC, MBBS"
                className="text-input-md w-full"
              />
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-hairline">
            <button
              type="button"
              onClick={() => setIsCreateOpen(false)}
              className="btn-secondary"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={createLoading}
              className="btn-primary"
            >
              {createLoading ? 'Onboarding...' : 'Save Doctor Profile'}
            </button>
          </div>
        </form>
      </Modal>
    </DashboardShell>
  );
}
