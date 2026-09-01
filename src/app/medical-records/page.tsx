'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import {
  FileText,
  Upload,
  Plus,
  Calendar,
  Stethoscope,
  Activity,
  CheckCircle2,
  AlertCircle,
  Pill,
  Droplet,
  User,
  ShieldCheck,
  Search,
  Eye,
  Download,
  Building2,
} from 'lucide-react';
import { DashboardShell } from '@/components/ui/DashboardShell';
import { Modal } from '@/components/ui/Modal';
import {
  getPatientMedicalHistoryAction,
  uploadMedicalReportAction,
} from '@/actions/medical-record';
import { getPatientsAction } from '@/actions/patient';
import { getAuthUserAction } from '@/actions/auth';
import { SessionUser } from '@/types';

export default function MedicalRecordsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryPatientId = searchParams.get('patientId');

  const [currentUser, setCurrentUser] = useState<SessionUser | null>(null);
  const [loadingUser, setLoadingUser] = useState(true);

  // Patient Selection
  const [patients, setPatients] = useState<any[]>([]);
  const [selectedPatientId, setSelectedPatientId] = useState<string>('');

  // Medical History Data
  const [patientData, setPatientData] = useState<any | null>(null);
  const [timeline, setTimeline] = useState<any[]>([]);
  const [timelineFilter, setTimelineFilter] = useState<'ALL' | 'PRESCRIPTION' | 'LAB_REPORT' | 'CONSULTATION'>('ALL');
  const [loadingHistory, setLoadingHistory] = useState(true);

  // Upload Report Modal
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [reportTitle, setReportTitle] = useState('');
  const [reportType, setReportType] = useState<
    'Blood Test' | 'X-Ray' | 'MRI Scan' | 'CT Scan' | 'Ultrasound' | 'Pathology' | 'ECG / Cardiology' | 'General Medical Report'
  >('Blood Test');
  const [fileUrl, setFileUrl] = useState('https://storage.hospitalcare.org/reports/lab-doc-sample.pdf');
  const [reportNotes, setReportNotes] = useState('');
  const [uploadLoading, setUploadLoading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  // View Rx Modal
  const [selectedRx, setSelectedRx] = useState<any | null>(null);
  const [successToast, setSuccessToast] = useState<string | null>(null);

  // 1. Authenticate user
  useEffect(() => {
    getAuthUserAction().then(async (res) => {
      if (res.data) {
        setCurrentUser(res.data);
        if (res.data.role === 'PATIENT' && res.data.patientId) {
          setSelectedPatientId(res.data.patientId);
        } else if (queryPatientId) {
          setSelectedPatientId(queryPatientId);
        }
      } else {
        router.push('/login?callbackUrl=/medical-records');
      }
      setLoadingUser(false);
    });
  }, [router, queryPatientId]);

  // 2. If staff, load patient list
  useEffect(() => {
    if (currentUser && currentUser.role !== 'PATIENT') {
      getPatientsAction({ limit: 100 }).then((res) => {
        if (res.success && res.data && res.data.patients.length > 0) {
          setPatients(res.data.patients);
          if (!selectedPatientId) {
            setSelectedPatientId(res.data.patients[0].id);
          }
        }
      });
    }
  }, [currentUser]);

  // 3. Fetch patient history
  const loadHistory = async (patientId: string) => {
    if (!patientId) return;
    setLoadingHistory(true);
    const res = await getPatientMedicalHistoryAction(patientId);
    if (res.success && res.data) {
      setPatientData(res.data);
      setTimeline(res.data.timeline);
    } else {
      setPatientData(null);
      setTimeline([]);
    }
    setLoadingHistory(false);
  };

  useEffect(() => {
    if (selectedPatientId) {
      loadHistory(selectedPatientId);
    }
  }, [selectedPatientId]);

  const handleUploadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPatientId || !reportTitle.trim()) {
      setUploadError('Please provide a report title.');
      return;
    }

    setUploadLoading(true);
    setUploadError(null);

    const res = await uploadMedicalReportAction({
      patientId: selectedPatientId,
      title: reportTitle,
      reportType,
      fileUrl: fileUrl || 'https://storage.hospitalcare.org/reports/lab-doc-sample.pdf',
      notes: reportNotes || undefined,
    });

    if (!res.success) {
      setUploadError(res.message || 'Failed to upload report.');
      setUploadLoading(false);
      return;
    }

    setUploadLoading(false);
    setIsUploadOpen(false);
    setReportTitle('');
    setReportNotes('');
    setSuccessToast('Medical report uploaded and attached to patient timeline.');
    loadHistory(selectedPatientId);
  };

  if (loadingUser || !currentUser) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white text-body">
        Loading electronic health records...
      </div>
    );
  }

  const filteredTimeline = timeline.filter((item) => {
    if (timelineFilter === 'ALL') return true;
    return item.type === timelineFilter;
  });

  return (
    <DashboardShell
      user={currentUser}
      title="Electronic Health Records (EHR)"
      subtitle="Unified chronological health history, digital prescriptions, and diagnostic lab reports."
      badge="Clinical Records & Timeline"
      actionButton={
        <button
          onClick={() => setIsUploadOpen(true)}
          className="btn-primary flex items-center gap-2"
        >
          <Upload className="h-4 w-4" /> Upload Diagnostic Report
        </button>
      }
    >
      {/* Success Toast */}
      {successToast && (
        <div className="mb-6 p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-semantic-up text-sm flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5" />
            <span>{successToast}</span>
          </div>
          <button onClick={() => setSuccessToast(null)} className="text-xs font-semibold hover:underline">
            Dismiss
          </button>
        </div>
      )}

      {/* Patient Selector for Staff / Doctors / Admins */}
      {currentUser.role !== 'PATIENT' && (
        <div className="bg-white rounded-xl border border-hairline p-4 sm:p-6 mb-8 shadow-soft">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-body mb-1">
                Select Patient Record to View
              </label>
              <select
                value={selectedPatientId}
                onChange={(e) => setSelectedPatientId(e.target.value)}
                className="text-input-md sm:w-96"
              >
                {patients.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.user.name} ({p.user.email} • {p.bloodGroup || 'Blood Group N/A'})
                  </option>
                ))}
              </select>
            </div>

            {patientData?.patient && (
              <div className="flex items-center gap-2">
                <span className="badge-pill">Record ID: {patientData.patient.id}</span>
                {patientData.patient.bloodGroup && (
                  <span className="px-3 py-1 rounded-pill bg-red-50 text-semantic-down font-bold text-xs number-mono border border-red-200">
                    {patientData.patient.bloodGroup}
                  </span>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Patient Profile Banner */}
      {patientData?.patient && (
        <div className="bg-surface-dark text-white rounded-xl p-8 mb-8 shadow-soft">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div>
              <span className="badge-pill !bg-white/10 !text-white mb-2">
                <ShieldCheck className="h-3.5 w-3.5 text-brand" /> Verified Health Record
              </span>
              <h2 className="text-2xl font-normal text-white">
                {patientData.patient.user?.name}
              </h2>
              <div className="text-xs text-muted-soft mt-1 flex items-center gap-4 flex-wrap">
                <span>DOB: {new Date(patientData.patient.dateOfBirth).toISOString().split('T')[0]}</span>
                <span>Gender: {patientData.patient.gender}</span>
                <span>Phone: {patientData.patient.user?.phone || 'N/A'}</span>
                <span>Emergency: {patientData.patient.emergencyContact || 'None listed'}</span>
              </div>
            </div>

            {/* Micro Stats */}
            <div className="grid grid-cols-3 gap-4 border-t md:border-t-0 md:border-l border-white/10 pt-4 md:pt-0 md:pl-6 text-center">
              <div>
                <div className="text-2xl font-bold text-white number-mono">
                  {patientData.appointments?.length || 0}
                </div>
                <div className="text-[10px] uppercase font-semibold text-muted-soft mt-0.5">
                  Consults
                </div>
              </div>
              <div>
                <div className="text-2xl font-bold text-brand number-mono">
                  {patientData.prescriptions?.length || 0}
                </div>
                <div className="text-[10px] uppercase font-semibold text-muted-soft mt-0.5">
                  Prescriptions
                </div>
              </div>
              <div>
                <div className="text-2xl font-bold text-semantic-up number-mono">
                  {patientData.reports?.length || 0}
                </div>
                <div className="text-[10px] uppercase font-semibold text-muted-soft mt-0.5">
                  Lab Tests
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Timeline Tabs */}
      <div className="flex items-center justify-between gap-4 mb-6 flex-wrap">
        <div className="flex items-center gap-1.5 p-1 rounded-xl bg-white border border-hairline shadow-soft">
          {[
            { key: 'ALL', label: `All Events (${timeline.length})` },
            { key: 'PRESCRIPTION', label: `Prescriptions (${patientData?.prescriptions?.length || 0})` },
            { key: 'LAB_REPORT', label: `Lab Reports (${patientData?.reports?.length || 0})` },
            { key: 'CONSULTATION', label: `Consultations (${patientData?.appointments?.length || 0})` },
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => setTimelineFilter(tab.key as any)}
              className={`px-4 py-1.5 rounded-pill text-xs font-semibold transition ${
                timelineFilter === tab.key
                  ? 'bg-surface-strong text-ink shadow-sm'
                  : 'text-muted hover:text-ink'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Chronological Timeline */}
      {loadingHistory ? (
        <div className="py-16 text-center text-body text-sm bg-white rounded-xl border border-hairline shadow-soft">
          Constructing chronological medical history timeline...
        </div>
      ) : filteredTimeline.length === 0 ? (
        <div className="py-16 text-center text-body text-sm bg-white rounded-xl border border-hairline shadow-soft space-y-3">
          <FileText className="h-8 w-8 mx-auto text-muted" />
          <div className="font-semibold text-ink">No medical history entries found for this category.</div>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredTimeline.map((item) => {
            const eventDateStr = new Date(item.date).toISOString().split('T')[0];

            return (
              <div
                key={item.id}
                className="bg-white rounded-xl border border-hairline p-6 shadow-soft hover:shadow-md transition"
              >
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                  <div className="flex items-start gap-4">
                    <div
                      className={`h-11 w-11 rounded-full flex items-center justify-center shrink-0 ${
                        item.type === 'PRESCRIPTION'
                          ? 'bg-blue-50 text-brand'
                          : item.type === 'LAB_REPORT'
                          ? 'bg-emerald-50 text-semantic-up'
                          : 'bg-surface-strong text-ink'
                      }`}
                    >
                      {item.type === 'PRESCRIPTION' ? (
                        <Pill className="h-5 w-5" />
                      ) : item.type === 'LAB_REPORT' ? (
                        <Activity className="h-5 w-5" />
                      ) : (
                        <Stethoscope className="h-5 w-5" />
                      )}
                    </div>

                    <div className="space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="badge-pill text-[11px]">
                          {item.type === 'PRESCRIPTION'
                            ? 'DIGITAL PRESCRIPTION'
                            : item.type === 'LAB_REPORT'
                            ? 'DIAGNOSTIC REPORT'
                            : 'CONSULTATION'}
                        </span>
                        <span className="text-xs text-muted number-mono">{eventDateStr}</span>
                      </div>

                      <h3 className="text-base font-semibold text-ink">{item.title}</h3>
                      <p className="text-xs text-body">{item.subtitle}</p>

                      {/* Content Preview based on Type */}
                      {item.type === 'PRESCRIPTION' && item.data && (
                        <div className="pt-2">
                          <div className="flex flex-wrap gap-2">
                            {((item.data.medications as any[]) || []).map((med, i) => (
                              <span
                                key={i}
                                className="px-3 py-1 rounded-pill bg-surface-soft border border-hairline text-xs font-medium text-ink flex items-center gap-1.5"
                              >
                                <Pill className="h-3 w-3 text-brand" />
                                {med.name} ({med.dosage})
                              </span>
                            ))}
                          </div>
                        </div>
                      )}

                      {item.type === 'LAB_REPORT' && item.data && (
                        <div className="pt-2 text-xs text-body">
                          {item.data.notes && (
                            <p className="italic text-muted mb-2">&quot;{item.data.notes}&quot;</p>
                          )}
                          <a
                            href={item.data.fileUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1.5 text-brand font-semibold hover:underline"
                          >
                            <Download className="h-3.5 w-3.5" /> Download / View Report Document
                          </a>
                        </div>
                      )}
                    </div>
                  </div>

                  {item.type === 'PRESCRIPTION' && (
                    <button
                      onClick={() => setSelectedRx(item.data)}
                      className="btn-secondary !py-1.5 !px-3 !text-xs self-start shrink-0 flex items-center gap-1.5"
                    >
                      <Eye className="h-3.5 w-3.5" /> View Full Rx
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* 1. UPLOAD REPORT MODAL */}
      {isUploadOpen && (
        <Modal
          isOpen={true}
          onClose={() => setIsUploadOpen(false)}
          title="Upload Diagnostic Lab Report"
          subtitle="Attach laboratory investigations, imaging reports, or pathological summaries."
          maxWidth="lg"
        >
          <form onSubmit={handleUploadSubmit} className="space-y-4">
            {uploadError && (
              <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-semantic-down text-xs">
                {uploadError}
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-body mb-1.5">
                Report Title *
              </label>
              <input
                type="text"
                required
                value={reportTitle}
                onChange={(e) => setReportTitle(e.target.value)}
                placeholder="e.g. Complete Blood Count (CBC), Brain MRI with Contrast..."
                className="text-input-md w-full"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-body mb-1.5">
                Diagnostic Category
              </label>
              <select
                value={reportType}
                onChange={(e) => setReportType(e.target.value as any)}
                className="text-input-md w-full"
              >
                <option value="Blood Test">Blood Test / Hematology</option>
                <option value="X-Ray">X-Ray Imaging</option>
                <option value="MRI Scan">Magnetic Resonance Imaging (MRI)</option>
                <option value="CT Scan">Computed Tomography (CT Scan)</option>
                <option value="Ultrasound">Ultrasound Sonography</option>
                <option value="Pathology">Biopsy & Pathology</option>
                <option value="ECG / Cardiology">ECG / Electrocardiogram</option>
                <option value="General Medical Report">General Medical Record</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-body mb-1.5">
                Document URL / Encrypted File Path
              </label>
              <input
                type="text"
                required
                value={fileUrl}
                onChange={(e) => setFileUrl(e.target.value)}
                placeholder="https://storage.hospitalcare.org/reports/..."
                className="text-input-md w-full"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-body mb-1.5">
                Clinical Observations & Radiologist Notes (Optional)
              </label>
              <textarea
                rows={3}
                value={reportNotes}
                onChange={(e) => setReportNotes(e.target.value)}
                placeholder="Summary of findings, normal/abnormal parameters, impression..."
                className="text-input-md w-full"
              />
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-hairline">
              <button
                type="button"
                onClick={() => setIsUploadOpen(false)}
                className="btn-secondary"
              >
                Cancel
              </button>
              <button disabled={uploadLoading} type="submit" className="btn-primary">
                {uploadLoading ? 'Uploading...' : 'Save & Attach to Profile'}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* 2. FULL RX SUMMARY MODAL */}
      {selectedRx && (
        <Modal
          isOpen={true}
          onClose={() => setSelectedRx(null)}
          title="Digital Prescription Details"
          subtitle={`Prescription ID: ${selectedRx.id} • ${new Date(selectedRx.createdAt).toISOString().split('T')[0]}`}
          maxWidth="lg"
        >
          <div className="space-y-6">
            <div className="p-6 rounded-xl bg-surface-dark text-white space-y-4">
              <div className="flex items-center justify-between border-b border-surface-dark-elevated pb-3">
                <div>
                  <div className="text-lg font-semibold text-white">
                    Dr. {selectedRx.doctor?.user?.name || 'Physician'}
                  </div>
                  <div className="text-xs text-muted-soft">
                    {selectedRx.doctor?.department?.name || 'Clinical Division'}
                  </div>
                </div>
                <div className="text-2xl font-bold text-brand font-serif">Rx</div>
              </div>

              <div className="text-xs">
                <span className="text-muted-soft uppercase font-semibold">Diagnosis</span>
                <div className="text-base font-semibold text-white mt-0.5">
                  {selectedRx.diagnosis}
                </div>
              </div>
            </div>

            <div>
              <h4 className="text-xs font-semibold uppercase tracking-wider text-body mb-3">
                Medication List
              </h4>
              <div className="space-y-2">
                {((selectedRx.medications as any[]) || []).map((med, idx) => (
                  <div
                    key={idx}
                    className="p-4 rounded-xl bg-surface-soft border border-hairline flex items-center justify-between text-xs"
                  >
                    <div>
                      <div className="font-semibold text-ink text-sm flex items-center gap-2">
                        <Pill className="h-4 w-4 text-brand" /> {med.name}
                        <span className="px-2 py-0.5 rounded-pill bg-white border border-hairline font-mono text-xs">
                          {med.dosage}
                        </span>
                      </div>
                      <div className="text-muted mt-1">
                        Frequency: <span className="text-body font-medium">{med.frequency}</span> •
                        Duration: <span className="text-body font-medium">{med.duration}</span>
                      </div>
                    </div>
                    {med.instructions && (
                      <span className="italic text-body max-w-xs text-right">
                        &quot;{med.instructions}&quot;
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {selectedRx.notes && (
              <div className="p-4 rounded-xl bg-blue-50 border border-blue-200 text-xs text-blue-900">
                <span className="font-semibold">Physician Clinical Advice: </span>
                {selectedRx.notes}
              </div>
            )}

            <div className="flex justify-end pt-4 border-t border-hairline">
              <button onClick={() => setSelectedRx(null)} className="btn-secondary">
                Close
              </button>
            </div>
          </div>
        </Modal>
      )}
    </DashboardShell>
  );
}
