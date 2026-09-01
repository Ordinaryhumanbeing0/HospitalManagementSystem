'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  Building2,
  Plus,
  Users,
  Stethoscope,
  Trash2,
  Edit2,
  CheckCircle2,
  AlertCircle,
  Clock,
} from 'lucide-react';
import { DashboardShell } from '@/components/ui/DashboardShell';
import { Modal } from '@/components/ui/Modal';
import {
  getDepartmentsAction,
  createDepartmentAction,
  updateDepartmentAction,
  deleteDepartmentAction,
} from '@/actions/department';
import { getAuthUserAction } from '@/actions/auth';
import { SessionUser } from '@/types';

export default function DepartmentsPage() {
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState<SessionUser | null>(null);
  const [loadingUser, setLoadingUser] = useState(true);

  const [departments, setDepartments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Modals
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingDept, setEditingDept] = useState<any | null>(null);
  const [createLoading, setCreateLoading] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  // New Department Form
  const [deptForm, setDeptForm] = useState({
    name: '',
    description: '',
  });

  useEffect(() => {
    getAuthUserAction().then((res) => {
      if (res.data) {
        setCurrentUser(res.data);
      } else {
        router.push('/login?callbackUrl=/departments');
      }
      setLoadingUser(false);
    });
  }, [router]);

  const loadDepartments = async () => {
    setLoading(true);
    const res = await getDepartmentsAction();
    if (res.success && res.data) {
      setDepartments(res.data);
    }
    setLoading(false);
  };

  useEffect(() => {
    if (currentUser) {
      loadDepartments();
    }
  }, [currentUser]);

  const handleCreateOrUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreateError(null);
    setCreateLoading(true);

    let res;
    if (editingDept) {
      res = await updateDepartmentAction({
        id: editingDept.id,
        name: deptForm.name,
        description: deptForm.description,
      });
    } else {
      res = await createDepartmentAction({
        name: deptForm.name,
        description: deptForm.description,
      });
    }

    if (!res.success) {
      setCreateError(res.message || 'Action failed.');
      setCreateLoading(false);
      return;
    }

    setCreateLoading(false);
    setIsCreateOpen(false);
    setEditingDept(null);
    setDeptForm({ name: '', description: '' });
    setActionSuccess(editingDept ? 'Department updated.' : 'New department created.');
    setTimeout(() => setActionSuccess(null), 4000);
    loadDepartments();
  };

  const handleDelete = async (deptId: string, deptName: string) => {
    if (!confirm(`Are you sure you want to delete department "${deptName}"?`)) return;

    const res = await deleteDepartmentAction(deptId);
    if (res.success) {
      setActionSuccess(`Department "${deptName}" deleted.`);
      setTimeout(() => setActionSuccess(null), 4000);
      loadDepartments();
    } else {
      alert(res.message || 'Failed to delete department.');
    }
  };

  if (loadingUser || !currentUser) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white text-body">
        Loading departments...
      </div>
    );
  }

  return (
    <DashboardShell
      user={currentUser}
      title="Hospital Clinical Departments"
      subtitle="Specialized medical divisions, clinical focus areas, and physician allocations."
      badge="Worklet 1: Department Management"
      actionButton={
        currentUser.role === 'ADMIN' && (
          <button
            onClick={() => {
              setEditingDept(null);
              setDeptForm({ name: '', description: '' });
              setIsCreateOpen(true);
            }}
            className="btn-primary flex items-center gap-2"
          >
            <Plus className="h-4 w-4" /> Create Department
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

      {loading ? (
        <div className="p-12 text-center text-muted text-sm">Loading department catalog...</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {departments.map((dept) => (
            <div
              key={dept.id}
              className="card-institutional flex flex-col justify-between"
            >
              <div>
                <div className="flex items-start justify-between gap-3 mb-4">
                  <div className="h-10 w-10 rounded-full bg-surface-strong border border-hairline flex items-center justify-center text-brand shrink-0">
                    <Building2 className="h-5 w-5" />
                  </div>
                  <span className="badge-pill number-mono">
                    <Users className="h-3 w-3 text-brand" /> {dept._count?.doctors || 0} Doctor(s)
                  </span>
                </div>

                <h3 className="text-lg font-semibold text-ink">{dept.name}</h3>
                <p className="text-xs text-body mt-2 leading-relaxed">
                  {dept.description || 'No detailed clinical description added for this department.'}
                </p>

                {/* Assigned Doctors List */}
                {dept.doctors && dept.doctors.length > 0 && (
                  <div className="mt-4 pt-4 border-t border-hairline">
                    <div className="text-[11px] font-semibold uppercase tracking-wider text-muted mb-2">
                      Appointed Medical Staff
                    </div>
                    <div className="space-y-1.5">
                      {dept.doctors.map((d: any) => (
                        <div
                          key={d.id}
                          className="flex items-center gap-2 text-xs text-ink font-medium"
                        >
                          <Stethoscope className="h-3.5 w-3.5 text-brand shrink-0" />
                          <span>{d.user.name}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Admin Actions */}
              {currentUser.role === 'ADMIN' && (
                <div className="mt-6 pt-4 border-t border-hairline flex items-center justify-end gap-2">
                  <button
                    onClick={() => {
                      setEditingDept(dept);
                      setDeptForm({ name: dept.name, description: dept.description || '' });
                      setIsCreateOpen(true);
                    }}
                    title="Edit Department"
                    className="p-2 rounded-full hover:bg-surface-strong text-muted hover:text-ink transition"
                  >
                    <Edit2 className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(dept.id, dept.name)}
                    title="Delete Department"
                    className="p-2 rounded-full hover:bg-red-50 text-muted hover:text-semantic-down transition"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Create / Edit Department Modal */}
      <Modal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        title={editingDept ? `Edit Department: ${editingDept.name}` : 'Create Hospital Department'}
        subtitle="Organize clinical units, specialty wards, and physician assignments."
        maxWidth="md"
      >
        {createError && (
          <div className="mb-4 p-3 rounded-xl bg-red-50 border border-red-200 text-semantic-down text-sm flex items-center gap-2">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{createError}</span>
          </div>
        )}

        <form onSubmit={handleCreateOrUpdate} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold uppercase text-body mb-1">
              Department Name *
            </label>
            <input
              type="text"
              required
              value={deptForm.name}
              onChange={(e) => setDeptForm({ ...deptForm, name: e.target.value })}
              placeholder="e.g. Pulmonology, Ophthalmology"
              className="text-input-md w-full"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase text-body mb-1">
              Department Description & Clinical Scope
            </label>
            <textarea
              rows={3}
              value={deptForm.description}
              onChange={(e) => setDeptForm({ ...deptForm, description: e.target.value })}
              placeholder="Details regarding medical scope, diagnostic labs, outpatient clinics..."
              className="text-input-md w-full !h-auto"
            />
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
              {createLoading ? 'Saving...' : editingDept ? 'Save Changes' : 'Create Department'}
            </button>
          </div>
        </form>
      </Modal>
    </DashboardShell>
  );
}
