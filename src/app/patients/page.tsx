'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  Users,
  Search,
  Plus,
  Filter,
  Eye,
  Trash2,
  Phone,
  Mail,
  Calendar,
  AlertCircle,
  CheckCircle2,
  Activity,
  Heart,
  Droplet,
} from 'lucide-react';
import { DashboardShell } from '@/components/ui/DashboardShell';
import { Modal } from '@/components/ui/Modal';
import { getPatientsAction, createPatientAction, deletePatientAction } from '@/actions/patient';
import { getAuthUserAction } from '@/actions/auth';
import { SessionUser } from '@/types';

export default function PatientsPage() {
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState<SessionUser | null>(null);
  const [loadingUser, setLoadingUser] = useState(true);

  const [patients, setPatients] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [searchQuery, setSearchQuery] = useState('');
  const [bloodGroup, setBloodGroup] = useState('ALL');
  const [gender, setGender] = useState('ALL');
  const [loading, setLoading] = useState(true);

  // Modal States
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [selectedPatient, setSelectedPatient] = useState<any | null>(null);
  const [createLoading, setCreateLoading] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  // New Patient Form
  const [newPatient, setNewPatient] = useState({
    name: '',
    email: '',
    phone: '',
    dateOfBirth: '1995-01-01',
    gender: 'Male' as 'Male' | 'Female' | 'Other',
    bloodGroup: 'O+' as 'A+' | 'A-' | 'B+' | 'B-' | 'AB+' | 'AB-' | 'O+' | 'O-',
    address: '',
    emergencyContact: '',
    medicalHistorySummary: '',
  });

  // 1. Fetch current session
  useEffect(() => {
    getAuthUserAction().then((res) => {
      if (res.data) {
        setCurrentUser(res.data);
      } else {
        router.push('/login?callbackUrl=/patients');
      }
      setLoadingUser(false);
    });
  }, [router]);

  // 2. Fetch patients
  const loadPatients = async (query = searchQuery, bg = bloodGroup, g = gender, p = page) => {
    setLoading(true);
    const res = await getPatientsAction({
      query: query || undefined,
      bloodGroup: bg !== 'ALL' ? bg : undefined,
      gender: g !== 'ALL' ? g : undefined,
      page: p,
      limit: 10,
    });
    if (res.success && res.data) {
      setPatients(res.data.patients);
      setTotal(res.data.total);
    }
    setLoading(false);
  };

  useEffect(() => {
    if (currentUser) {
      loadPatients();
    }
  }, [currentUser, bloodGroup, gender]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    loadPatients(searchQuery, bloodGroup, gender, 1);
  };

  const handleCreatePatient = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreateError(null);
    setCreateLoading(true);

    const res = await createPatientAction(newPatient);
    if (!res.success) {
      setCreateError(res.message || 'Failed to create patient.');
      setCreateLoading(false);
      return;
    }

    setCreateLoading(false);
    setIsCreateOpen(false);
    setActionSuccess('Patient profile created successfully.');
    setTimeout(() => setActionSuccess(null), 4000);
    setNewPatient({
      name: '',
      email: '',
      phone: '',
      dateOfBirth: '1995-01-01',
      gender: 'Male',
      bloodGroup: 'O+',
      address: '',
      emergencyContact: '',
      medicalHistorySummary: '',
    });
    loadPatients();
  };

  const handleDeletePatient = async (patientId: string, patientName: string) => {
    if (!confirm(`Are you sure you want to permanently delete patient "${patientName}"?`)) return;

    const res = await deletePatientAction(patientId);
    if (res.success) {
      setActionSuccess(`Patient "${patientName}" deleted successfully.`);
      setTimeout(() => setActionSuccess(null), 4000);
      loadPatients();
    } else {
      alert(res.message || 'Failed to delete patient.');
    }
  };

  if (loadingUser || !currentUser) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white text-body">
        Loading patient directory...
      </div>
    );
  }

  return (
    <DashboardShell
      user={currentUser}
      title="Patient Directory & Demographics"
      subtitle="Search, register, and manage electronic health profiles across the hospital."
      badge="Worklet 1: Patient Management"
      actionButton={
        (currentUser.role === 'ADMIN' || currentUser.role === 'RECEPTIONIST') && (
          <button
            onClick={() => setIsCreateOpen(true)}
            className="btn-primary flex items-center gap-2"
          >
            <Plus className="h-4 w-4" /> Register Patient
          </button>
        )
      }
    >
      {/* Toast Notification */}
      {actionSuccess && (
        <div className="mb-6 p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-semantic-up text-sm flex items-center gap-2 animate-in fade-in">
          <CheckCircle2 className="h-5 w-5" />
          <span>{actionSuccess}</span>
        </div>
      )}

      {/* Filter & Search Bar */}
      <div className="bg-white rounded-xl border border-hairline p-4 sm:p-6 mb-8 shadow-soft">
        <form onSubmit={handleSearch} className="flex flex-col md:flex-row gap-3">
          <div className="relative flex-1">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by Patient Name, Phone, Email, ID..."
              className="search-pill w-full pl-11"
            />
            <Search className="h-4 w-4 text-muted absolute left-4 top-3.5 pointer-events-none" />
          </div>

          <div className="flex items-center gap-3">
            <select
              value={bloodGroup}
              onChange={(e) => setBloodGroup(e.target.value)}
              className="search-pill bg-white border border-hairline text-xs font-semibold uppercase"
            >
              <option value="ALL">All Blood Groups</option>
              <option value="A+">A+</option>
              <option value="A-">A-</option>
              <option value="B+">B+</option>
              <option value="B-">B-</option>
              <option value="AB+">AB+</option>
              <option value="AB-">AB-</option>
              <option value="O+">O+</option>
              <option value="O-">O-</option>
            </select>

            <select
              value={gender}
              onChange={(e) => setGender(e.target.value)}
              className="search-pill bg-white border border-hairline text-xs font-semibold uppercase"
            >
              <option value="ALL">All Genders</option>
              <option value="Male">Male</option>
              <option value="Female">Female</option>
              <option value="Other">Other</option>
            </select>

            <button type="submit" className="btn-secondary !px-4">
              Filter
            </button>
          </div>
        </form>
      </div>

      {/* Patients Table */}
      <div className="bg-white rounded-xl border border-hairline overflow-hidden shadow-soft">
        <div className="p-5 border-b border-hairline flex items-center justify-between">
          <div className="text-sm font-semibold text-ink">
            Registered Patients <span className="number-mono text-muted">({total})</span>
          </div>
        </div>

        {loading ? (
          <div className="p-12 text-center text-muted text-sm">Searching database records...</div>
        ) : patients.length === 0 ? (
          <div className="p-12 text-center text-muted text-sm">
            No patient records matched the search criteria.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-surface-soft border-b border-hairline text-xs uppercase font-semibold text-muted tracking-wider">
                <tr>
                  <th className="px-6 py-4">Patient Name & Contact</th>
                  <th className="px-6 py-4">Blood Group</th>
                  <th className="px-6 py-4">Gender / DOB</th>
                  <th className="px-6 py-4">Emergency Contact</th>
                  <th className="px-6 py-4">Records</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-hairline">
                {patients.map((patient) => (
                  <tr key={patient.id} className="hover:bg-surface-soft/60 transition">
                    <td className="px-6 py-4">
                      <div className="font-semibold text-ink">{patient.user.name}</div>
                      <div className="text-xs text-muted mt-0.5 flex items-center gap-3">
                        <span className="flex items-center gap-1">
                          <Mail className="h-3 w-3" /> {patient.user.email}
                        </span>
                        <span className="flex items-center gap-1">
                          <Phone className="h-3 w-3" /> {patient.user.phone || 'N/A'}
                        </span>
                      </div>
                    </td>

                    <td className="px-6 py-4">
                      {patient.bloodGroup ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-pill text-xs font-semibold bg-red-50 text-semantic-down border border-red-200/50">
                          <Droplet className="h-3 w-3" /> {patient.bloodGroup}
                        </span>
                      ) : (
                        <span className="text-muted text-xs">—</span>
                      )}
                    </td>

                    <td className="px-6 py-4">
                      <div className="text-ink">{patient.gender}</div>
                      <div className="text-xs text-muted number-mono">
                        {new Date(patient.dateOfBirth).toLocaleDateString()}
                      </div>
                    </td>

                    <td className="px-6 py-4 text-xs text-body">
                      {patient.emergencyContact || 'None provided'}
                    </td>

                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2 text-xs">
                        <span className="px-2 py-0.5 rounded-pill bg-surface-strong text-ink font-semibold number-mono">
                          {patient._count?.appointments || 0} visits
                        </span>
                      </div>
                    </td>

                    <td className="px-6 py-4 text-right">
                      <div className="inline-flex items-center gap-2">
                        <button
                          onClick={() => setSelectedPatient(patient)}
                          title="View Details"
                          className="p-2 rounded-full bg-surface-strong hover:bg-hairline text-ink transition"
                        >
                          <Eye className="h-4 w-4" />
                        </button>
                        {currentUser.role === 'ADMIN' && (
                          <button
                            onClick={() => handleDeletePatient(patient.id, patient.user.name)}
                            title="Delete Patient"
                            className="p-2 rounded-full bg-surface-strong hover:bg-red-50 text-muted hover:text-semantic-down transition"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Patient Detail Modal */}
      <Modal
        isOpen={!!selectedPatient}
        onClose={() => setSelectedPatient(null)}
        title={selectedPatient?.user?.name || 'Patient Profile'}
        subtitle={`Patient Record ID: ${selectedPatient?.id}`}
        maxWidth="lg"
      >
        {selectedPatient && (
          <div className="space-y-6">
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 p-4 rounded-xl bg-surface-soft border border-hairline">
              <div>
                <div className="text-xs font-semibold uppercase text-muted">Blood Group</div>
                <div className="text-base font-bold text-semantic-down mt-0.5">
                  {selectedPatient.bloodGroup || 'Not set'}
                </div>
              </div>
              <div>
                <div className="text-xs font-semibold uppercase text-muted">Gender</div>
                <div className="text-base font-medium text-ink mt-0.5">{selectedPatient.gender}</div>
              </div>
              <div>
                <div className="text-xs font-semibold uppercase text-muted">Date of Birth</div>
                <div className="text-base font-medium text-ink number-mono mt-0.5">
                  {new Date(selectedPatient.dateOfBirth).toLocaleDateString()}
                </div>
              </div>
              <div>
                <div className="text-xs font-semibold uppercase text-muted">Email</div>
                <div className="text-sm text-ink mt-0.5">{selectedPatient.user.email}</div>
              </div>
              <div>
                <div className="text-xs font-semibold uppercase text-muted">Phone</div>
                <div className="text-sm text-ink number-mono mt-0.5">
                  {selectedPatient.user.phone || 'N/A'}
                </div>
              </div>
              <div>
                <div className="text-xs font-semibold uppercase text-muted">Emergency Contact</div>
                <div className="text-sm text-ink mt-0.5">
                  {selectedPatient.emergencyContact || 'None'}
                </div>
              </div>
            </div>

            <div>
              <h4 className="text-xs font-semibold uppercase tracking-wider text-muted mb-2">
                Residential Address
              </h4>
              <p className="text-sm text-ink bg-surface-soft p-3 rounded-xl border border-hairline">
                {selectedPatient.address || 'No residential address registered.'}
              </p>
            </div>

            <div>
              <h4 className="text-xs font-semibold uppercase tracking-wider text-muted mb-2">
                Medical History & Clinical Summary
              </h4>
              <p className="text-sm text-ink bg-surface-soft p-3 rounded-xl border border-hairline">
                {selectedPatient.medicalHistorySummary || 'No chronic history or known allergies recorded.'}
              </p>
            </div>

            <div className="flex justify-end pt-4 border-t border-hairline">
              <button
                onClick={() => setSelectedPatient(null)}
                className="btn-secondary"
              >
                Close Profile
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* Create Patient Modal */}
      <Modal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        title="Register New Patient Profile"
        subtitle="Staff-assisted patient onboarding into the HospitalCare registry."
        maxWidth="lg"
      >
        {createError && (
          <div className="mb-4 p-3 rounded-xl bg-red-50 border border-red-200 text-semantic-down text-sm flex items-center gap-2">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{createError}</span>
          </div>
        )}

        <form onSubmit={handleCreatePatient} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold uppercase text-body mb-1">
                Full Name *
              </label>
              <input
                type="text"
                required
                value={newPatient.name}
                onChange={(e) => setNewPatient({ ...newPatient, name: e.target.value })}
                placeholder="Patient Full Name"
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
                value={newPatient.email}
                onChange={(e) => setNewPatient({ ...newPatient, email: e.target.value })}
                placeholder="patient@example.com"
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
                value={newPatient.phone}
                onChange={(e) => setNewPatient({ ...newPatient, phone: e.target.value })}
                placeholder="+1 (555) 000-0000"
                className="text-input-md w-full"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase text-body mb-1">
                Date of Birth *
              </label>
              <input
                type="date"
                required
                value={newPatient.dateOfBirth}
                onChange={(e) => setNewPatient({ ...newPatient, dateOfBirth: e.target.value })}
                className="text-input-md w-full"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase text-body mb-1">
                Gender *
              </label>
              <select
                value={newPatient.gender}
                onChange={(e) => setNewPatient({ ...newPatient, gender: e.target.value as any })}
                className="text-input-md w-full bg-white"
              >
                <option value="Male">Male</option>
                <option value="Female">Female</option>
                <option value="Other">Other</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase text-body mb-1">
                Blood Group
              </label>
              <select
                value={newPatient.bloodGroup}
                onChange={(e) => setNewPatient({ ...newPatient, bloodGroup: e.target.value as any })}
                className="text-input-md w-full bg-white"
              >
                <option value="A+">A+</option>
                <option value="A-">A-</option>
                <option value="B+">B+</option>
                <option value="B-">B-</option>
                <option value="AB+">AB+</option>
                <option value="AB-">AB-</option>
                <option value="O+">O+</option>
                <option value="O-">O-</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase text-body mb-1">
              Residential Address
            </label>
            <input
              type="text"
              value={newPatient.address}
              onChange={(e) => setNewPatient({ ...newPatient, address: e.target.value })}
              placeholder="Address"
              className="text-input-md w-full"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase text-body mb-1">
              Emergency Contact
            </label>
            <input
              type="text"
              value={newPatient.emergencyContact}
              onChange={(e) => setNewPatient({ ...newPatient, emergencyContact: e.target.value })}
              placeholder="Name & Contact Number"
              className="text-input-md w-full"
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
              {createLoading ? 'Registering...' : 'Save Patient Profile'}
            </button>
          </div>
        </form>
      </Modal>
    </DashboardShell>
  );
}
