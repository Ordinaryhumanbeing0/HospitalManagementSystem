'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { HeartPulse, Lock, Mail, User, Phone, Calendar, AlertCircle, Shield, CheckCircle2 } from 'lucide-react';
import { registerPatientAction } from '@/actions/auth';

export default function RegisterPage() {
  const router = useRouter();

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    password: '',
    dateOfBirth: '1995-06-15',
    gender: 'Male' as 'Male' | 'Female' | 'Other',
    bloodGroup: 'O+' as 'A+' | 'A-' | 'B+' | 'B-' | 'AB+' | 'AB-' | 'O+' | 'O-',
    address: '',
    emergencyContact: '',
    medicalHistorySummary: '',
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    setFormData((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setFieldErrors({});
    setLoading(true);

    try {
      const res = await registerPatientAction(formData);
      if (!res.success) {
        setError(res.message || 'Registration failed. Please check the entered data.');
        if (res.errors) setFieldErrors(res.errors);
        setLoading(false);
        return;
      }

      if (res.data?.redirectUrl) {
        router.push(res.data.redirectUrl);
        router.refresh();
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred during registration.');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col justify-between bg-surface-soft">
      {/* Header */}
      <header className="px-6 py-6 max-w-7xl mx-auto w-full flex items-center justify-between">
        <Link href="/" className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-full bg-brand flex items-center justify-center text-white">
            <HeartPulse className="h-5 w-5" />
          </div>
          <span className="font-semibold text-lg tracking-tight text-ink">HospitalCare</span>
        </Link>
        <Link
          href="/login"
          className="text-sm font-medium text-body hover:text-brand transition"
        >
          Already registered? <span className="font-semibold text-brand">Sign In</span>
        </Link>
      </header>

      {/* Main Registration Form */}
      <div className="flex-1 flex items-center justify-center px-4 sm:px-6 py-12">
        <div className="w-full max-w-2xl bg-white rounded-xl border border-hairline p-8 sm:p-10 shadow-soft">
          <div className="mb-8">
            <div className="inline-flex items-center gap-1.5 bg-surface-strong text-ink text-xs font-semibold uppercase tracking-wider rounded-pill px-3 py-1 mb-3">
              <Shield className="h-3.5 w-3.5 text-brand" /> Patient Portal Registration
            </div>
            <h1 className="text-2xl sm:text-3xl font-normal tracking-tight text-ink">
              Create Your Patient Profile
            </h1>
            <p className="text-sm text-body mt-1">
              Join HospitalCare for seamless appointment scheduling, digital prescriptions, and record access.
            </p>
          </div>

          {error && (
            <div className="mb-6 p-4 rounded-xl bg-red-50 border border-red-200 text-semantic-down text-sm flex items-start gap-3">
              <AlertCircle className="h-5 w-5 shrink-0 mt-0.5" />
              <div>
                <div className="font-medium">{error}</div>
                {Object.keys(fieldErrors).length > 0 && (
                  <ul className="mt-2 list-disc list-inside text-xs space-y-1">
                    {Object.entries(fieldErrors).map(([field, msgs]) => (
                      <li key={field}>{msgs.join(', ')}</li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Personal Details */}
            <div>
              <h3 className="text-xs font-semibold uppercase tracking-wider text-muted mb-3">
                1. Basic Credentials & Identity
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-body mb-1.5">
                    Full Name *
                  </label>
                  <input
                    type="text"
                    name="name"
                    required
                    value={formData.name}
                    onChange={handleChange}
                    placeholder="e.g. Eleanor Vance"
                    className="text-input-md w-full"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-body mb-1.5">
                    Email Address *
                  </label>
                  <input
                    type="email"
                    name="email"
                    required
                    value={formData.email}
                    onChange={handleChange}
                    placeholder="eleanor@example.com"
                    className="text-input-md w-full"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-body mb-1.5">
                    Phone Number *
                  </label>
                  <input
                    type="tel"
                    name="phone"
                    required
                    value={formData.phone}
                    onChange={handleChange}
                    placeholder="+1 (555) 000-0000"
                    className="text-input-md w-full"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-body mb-1.5">
                    Password *
                  </label>
                  <input
                    type="password"
                    name="password"
                    required
                    value={formData.password}
                    onChange={handleChange}
                    placeholder="Min 8 chars, 1 uppercase, 1 number"
                    className="text-input-md w-full"
                  />
                </div>
              </div>
            </div>

            {/* Medical Demographics */}
            <div className="pt-4 border-t border-hairline">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-muted mb-3">
                2. Medical Demographics
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-body mb-1.5">
                    Date of Birth *
                  </label>
                  <input
                    type="date"
                    name="dateOfBirth"
                    required
                    value={formData.dateOfBirth}
                    onChange={handleChange}
                    className="text-input-md w-full"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-body mb-1.5">
                    Gender *
                  </label>
                  <select
                    name="gender"
                    value={formData.gender}
                    onChange={handleChange}
                    className="text-input-md w-full bg-white"
                  >
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Other">Other</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-body mb-1.5">
                    Blood Group
                  </label>
                  <select
                    name="bloodGroup"
                    value={formData.bloodGroup}
                    onChange={handleChange}
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
            </div>

            {/* Contact & History */}
            <div className="pt-4 border-t border-hairline">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-muted mb-3">
                3. Address & Emergency Details
              </h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-body mb-1.5">
                    Residential Address
                  </label>
                  <input
                    type="text"
                    name="address"
                    value={formData.address}
                    onChange={handleChange}
                    placeholder="123 Hospital Ave, City, State"
                    className="text-input-md w-full"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-body mb-1.5">
                    Emergency Contact (Name & Phone)
                  </label>
                  <input
                    type="text"
                    name="emergencyContact"
                    value={formData.emergencyContact}
                    onChange={handleChange}
                    placeholder="Jane Doe (Spouse) - +1 (555) 123-4567"
                    className="text-input-md w-full"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-body mb-1.5">
                    Medical History / Known Allergies
                  </label>
                  <textarea
                    name="medicalHistorySummary"
                    rows={2}
                    value={formData.medicalHistorySummary}
                    onChange={handleChange}
                    placeholder="e.g. Penicillin allergy, mild asthma..."
                    className="text-input-md w-full !h-auto"
                  />
                </div>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full !h-12 !text-base"
            >
              {loading ? 'Creating Account...' : 'Complete Patient Registration'}
            </button>
          </form>
        </div>
      </div>

      <footer className="py-6 text-center text-xs text-muted">
        Hospital Management System • Role-Based Healthcare Platform
      </footer>
    </div>
  );
}
