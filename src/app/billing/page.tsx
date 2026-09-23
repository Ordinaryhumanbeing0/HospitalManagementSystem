'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  CreditCard,
  DollarSign,
  Receipt,
  Search,
  Filter,
  CheckCircle2,
  AlertCircle,
  Clock,
  Printer,
  X,
  FileText,
  User,
  Stethoscope,
  Building2,
  Calendar,
  ShieldCheck,
  Plus,
  RefreshCw,
  Eye,
  Download,
} from 'lucide-react';
import { DashboardShell } from '@/components/ui/DashboardShell';
import { Modal } from '@/components/ui/Modal';
import { getAuthUserAction } from '@/actions/auth';
import { getBillsAction, getBillByIdAction, recordPaymentAction, generateBillAction } from '@/actions/billing';
import { getAppointmentsAction } from '@/actions/appointment';
import { BillWithRelations, SessionUser } from '@/types';
import { PaymentMethod, PaymentStatus, Role } from '@prisma/client';
import { formatCurrency } from '@/lib/config/currency';

export default function BillingPage() {
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState<SessionUser | null>(null);
  const [loadingUser, setLoadingUser] = useState(true);

  // Bill list state
  const [bills, setBills] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [summary, setSummary] = useState({
    totalBilled: 0,
    totalCollected: 0,
    totalOutstanding: 0,
  });
  const [loadingBills, setLoadingBills] = useState(true);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // 1. Payment Modal State
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [selectedBillForPayment, setSelectedBillForPayment] = useState<any | null>(null);
  const [paymentAmount, setPaymentAmount] = useState<string>('');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>(PaymentMethod.CARD);
  const [transactionRef, setTransactionRef] = useState<string>('');
  const [submittingPayment, setSubmittingPayment] = useState(false);
  const [paymentError, setPaymentError] = useState<string | null>(null);

  // 2. Generate Bill Modal State
  const [isGenerateModalOpen, setIsGenerateModalOpen] = useState(false);
  const [completedAppts, setCompletedAppts] = useState<any[]>([]);
  const [selectedApptId, setSelectedApptId] = useState<string>('');
  const [discountPercent, setDiscountPercent] = useState<number>(0);
  const [taxPercent, setTaxPercent] = useState<number>(5);
  const [loadingAppts, setLoadingAppts] = useState(false);
  const [submittingGen, setSubmittingGen] = useState(false);
  const [genError, setGenError] = useState<string | null>(null);

  // 3. Invoice View / Print Modal State
  const [isInvoiceModalOpen, setIsInvoiceModalOpen] = useState(false);
  const [invoiceBill, setInvoiceBill] = useState<any | null>(null);
  const [loadingInvoice, setLoadingInvoice] = useState(false);

  // Authentication
  useEffect(() => {
    getAuthUserAction().then((res) => {
      if (res.data) {
        setCurrentUser(res.data);
      } else {
        router.push('/login?callbackUrl=/billing');
      }
      setLoadingUser(false);
    });
  }, [router]);

  // Load Bills
  const loadBills = async (status = statusFilter, search = searchQuery, p = page) => {
    setLoadingBills(true);
    const res = await getBillsAction({
      status: status !== 'ALL' ? (status as any) : undefined,
      search: search || undefined,
      page: p,
      limit: 15,
    });

    if (res.success && res.data) {
      setBills(res.data.bills);
      setTotal(res.data.total);
      setSummary(res.data.summary);
    }
    setLoadingBills(false);
  };

  useEffect(() => {
    if (currentUser) {
      loadBills(statusFilter, searchQuery, page);
    }
  }, [currentUser, statusFilter, page]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    loadBills(statusFilter, searchQuery, 1);
  };

  // Open Payment Modal
  const handleOpenPaymentModal = (bill: any) => {
    setSelectedBillForPayment(bill);
    const remaining = Math.max(0, Number(bill.totalAmount) - Number(bill.paidAmount));
    setPaymentAmount(remaining.toFixed(2));
    setPaymentMethod(PaymentMethod.CARD);
    setTransactionRef('');
    setPaymentError(null);
    setIsPaymentModalOpen(true);
  };

  // Submit Payment
  const handleSubmitPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedBillForPayment) return;

    const amt = parseFloat(paymentAmount);
    const bal = Number(selectedBillForPayment.totalAmount) - Number(selectedBillForPayment.paidAmount);

    if (isNaN(amt) || amt <= 0) {
      setPaymentError('Please enter a valid payment amount.');
      return;
    }

    if (amt > bal + 0.001) {
      setPaymentError(`Amount exceeds outstanding balance (${formatCurrency(bal)}).`);
      return;
    }

    setSubmittingPayment(true);
    setPaymentError(null);

    const res = await recordPaymentAction({
      billId: selectedBillForPayment.id,
      amount: amt,
      method: paymentMethod,
      transactionRef: transactionRef.trim() || undefined,
    });

    if (!res.success) {
      setPaymentError(res.message || 'Payment processing failed.');
      setSubmittingPayment(false);
      return;
    }

    setToastMessage(`Payment of ${formatCurrency(amt)} recorded successfully.`);
    setIsPaymentModalOpen(false);
    setSubmittingPayment(false);
    loadBills(statusFilter, searchQuery, page);
  };

  // Open Generate Bill Modal
  const handleOpenGenerateModal = async () => {
    setIsGenerateModalOpen(true);
    setGenError(null);
    setLoadingAppts(true);

    const res = await getAppointmentsAction({
      status: 'COMPLETED',
      limit: 50,
    });

    if (res.success && res.data) {
      // Only appointments that do NOT already have a bill
      const unbilled = res.data.appointments.filter((a: any) => !a.bill);
      setCompletedAppts(unbilled);
      if (unbilled.length > 0) {
        setSelectedApptId(unbilled[0].id);
      }
    }
    setLoadingAppts(false);
  };

  // Submit Generate Bill
  const handleSubmitGenerateBill = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedApptId) {
      setGenError('Please select a completed appointment.');
      return;
    }

    setSubmittingGen(true);
    setGenError(null);

    const res = await generateBillAction({
      appointmentId: selectedApptId,
      discountPercentage: discountPercent,
      taxPercentage: taxPercent,
    });

    if (!res.success) {
      setGenError(res.message || 'Failed to generate bill.');
      setSubmittingGen(false);
      return;
    }

    setToastMessage('Hospital bill and invoice successfully generated!');
    setIsGenerateModalOpen(false);
    setSubmittingGen(false);
    loadBills(statusFilter, searchQuery, page);
  };

  // Open Invoice View Modal
  const handleOpenInvoice = async (billId: string) => {
    setIsInvoiceModalOpen(true);
    setLoadingInvoice(true);
    const res = await getBillByIdAction(billId);
    if (res.success && res.data) {
      setInvoiceBill(res.data);
    }
    setLoadingInvoice(false);
  };

  const handlePrint = () => {
    window.print();
  };

  if (loadingUser || !currentUser) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white text-body text-sm">
        Loading billing & financial ledger...
      </div>
    );
  }

  const isStaffOrAdmin =
    currentUser.role === 'ADMIN' ||
    currentUser.role === 'RECEPTIONIST' ||
    currentUser.role === 'DOCTOR';

  return (
    <DashboardShell
      user={currentUser}
      title={currentUser.role === 'PATIENT' ? 'My Medical Bills & Invoices' : 'Hospital Billing & Invoicing Desk'}
      subtitle={
        currentUser.role === 'PATIENT'
          ? 'View your consultation fees, prescription charges, payment receipts, and download official invoices.'
          : 'Patient fee settlements, payment processing, itemized service charges, and downloadable invoices.'
      }
      badge="Billing & Accounts"
      actionButton={
        isStaffOrAdmin ? (
          <button
            onClick={handleOpenGenerateModal}
            className="btn-primary flex items-center gap-2 text-xs !py-2 !px-3"
          >
            <Plus className="h-4 w-4" /> Generate New Bill
          </button>
        ) : undefined
      }
    >
      {/* Toast */}
      {toastMessage && (
        <div className="mb-6 p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm flex items-center justify-between shadow-soft">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0" />
            <span>{toastMessage}</span>
          </div>
          <button onClick={() => setToastMessage(null)} className="text-emerald-600 hover:text-emerald-900">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="card-institutional">
          <div className="flex items-center justify-between">
            <span className="text-xs uppercase font-semibold text-muted tracking-wider">Total Invoiced</span>
            <div className="h-9 w-9 rounded-full bg-surface-strong flex items-center justify-center text-ink">
              <Receipt className="h-4 w-4" />
            </div>
          </div>
          <div className="text-3xl font-bold text-ink number-mono mt-3">
            {formatCurrency(summary.totalBilled)}
          </div>
          <div className="text-xs text-muted mt-2">Gross cumulative charges</div>
        </div>

        <div className="card-institutional">
          <div className="flex items-center justify-between">
            <span className="text-xs uppercase font-semibold text-muted tracking-wider">Total Collected</span>
            <div className="h-9 w-9 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <CheckCircle2 className="h-4 w-4" />
            </div>
          </div>
          <div className="text-3xl font-bold text-emerald-600 number-mono mt-3">
            {formatCurrency(summary.totalCollected)}
          </div>
          <div className="text-xs text-emerald-600 mt-2 font-medium">Realized revenue received</div>
        </div>

        <div className="card-institutional">
          <div className="flex items-center justify-between">
            <span className="text-xs uppercase font-semibold text-muted tracking-wider">Outstanding Balance</span>
            <div className="h-9 w-9 rounded-full bg-amber-50 text-amber-600 flex items-center justify-center">
              <AlertCircle className="h-4 w-4" />
            </div>
          </div>
          <div className="text-3xl font-bold text-amber-600 number-mono mt-3">
            {formatCurrency(summary.totalOutstanding)}
          </div>
          <div className="text-xs text-amber-700 mt-2 font-medium">Pending patient settlements</div>
        </div>

        <div className="card-institutional">
          <div className="flex items-center justify-between">
            <span className="text-xs uppercase font-semibold text-muted tracking-wider">Total Invoices</span>
            <div className="h-9 w-9 rounded-full bg-surface-strong flex items-center justify-center text-ink">
              <FileText className="h-4 w-4" />
            </div>
          </div>
          <div className="text-3xl font-bold text-ink number-mono mt-3">
            {total}
          </div>
          <div className="text-xs text-muted mt-2">Recorded billing transactions</div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white rounded-xl border border-hairline p-4 mb-6 shadow-soft flex flex-col md:flex-row gap-4 items-center justify-between">
        {/* Status Tabs */}
        <div className="flex items-center gap-1 overflow-x-auto w-full md:w-auto">
          {['ALL', 'UNPAID', 'PARTIALLY_PAID', 'PAID'].map((st) => (
            <button
              key={st}
              onClick={() => {
                setStatusFilter(st);
                setPage(1);
              }}
              className={`px-3 py-1.5 rounded-pill text-xs font-semibold whitespace-nowrap transition ${
                statusFilter === st
                  ? 'bg-ink text-white'
                  : 'bg-surface-soft text-body hover:bg-surface-strong hover:text-ink'
              }`}
            >
              {st === 'ALL'
                ? 'All Bills'
                : st === 'UNPAID'
                ? 'Pending Unpaid'
                : st === 'PARTIALLY_PAID'
                ? 'Partially Paid'
                : 'Fully Paid'}
            </button>
          ))}
        </div>

        {/* Search */}
        <form onSubmit={handleSearchSubmit} className="flex items-center gap-2 w-full md:w-80">
          <div className="relative w-full">
            <Search className="h-4 w-4 text-muted absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search patient, invoice ID..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="input-field text-xs pl-9 pr-3 py-1.5 w-full"
            />
          </div>
          <button type="submit" className="btn-secondary text-xs !py-1.5 !px-3">
            Search
          </button>
        </form>
      </div>

      {/* Bills Table */}
      <div className="bg-white rounded-xl border border-hairline overflow-hidden shadow-soft">
        {loadingBills ? (
          <div className="p-12 text-center text-body text-sm">
            <RefreshCw className="h-6 w-6 animate-spin mx-auto mb-3 text-muted" />
            Loading billing records...
          </div>
        ) : bills.length === 0 ? (
          <div className="p-12 text-center text-body">
            <Receipt className="h-10 w-10 mx-auto text-muted mb-3" />
            <div className="text-base font-medium text-ink">No billing records found</div>
            <p className="text-xs text-muted mt-1">
              {statusFilter !== 'ALL'
                ? `No bills currently matching status "${statusFilter}".`
                : 'Completed consultations will appear here once invoiced.'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-surface-soft text-muted font-semibold uppercase tracking-wider border-b border-hairline">
                <tr>
                  <th className="py-3 px-4">Invoice ID & Date</th>
                  <th className="py-3 px-4">Patient</th>
                  <th className="py-3 px-4">Consultation / Doctor</th>
                  <th className="py-3 px-4 text-right">Total Billed</th>
                  <th className="py-3 px-4 text-right">Amount Paid</th>
                  <th className="py-3 px-4 text-right">Balance Due</th>
                  <th className="py-3 px-4 text-center">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-hairline">
                {bills.map((bill) => {
                  const totalAmt = Number(bill.totalAmount);
                  const paidAmt = Number(bill.paidAmount);
                  const balance = Math.max(0, totalAmt - paidAmt);

                  return (
                    <tr key={bill.id} className="hover:bg-surface-soft/50 transition">
                      <td className="py-3.5 px-4 font-mono">
                        <div className="font-semibold text-ink">{bill.id.slice(-10).toUpperCase()}</div>
                        <div className="text-[11px] text-muted">
                          {new Date(bill.createdAt).toLocaleDateString(undefined, {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric',
                          })}
                        </div>
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="font-semibold text-ink">{bill.patient.user.name}</div>
                        <div className="text-[11px] text-muted">{bill.patient.user.email}</div>
                      </td>
                      <td className="py-3.5 px-4">
                        {bill.appointment ? (
                          <>
                            <div className="text-ink font-medium">
                              Dr. {bill.appointment.doctor.user.name}
                            </div>
                            <div className="text-[11px] text-muted">
                              {bill.appointment.doctor.department.name} • {bill.appointment.timeSlot}
                            </div>
                          </>
                        ) : (
                          <span className="text-muted">Direct Billing</span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-right font-mono font-bold text-ink">
                        {formatCurrency(totalAmt)}
                      </td>
                      <td className="py-3.5 px-4 text-right font-mono text-emerald-600 font-semibold">
                        {formatCurrency(paidAmt)}
                      </td>
                      <td className="py-3.5 px-4 text-right font-mono font-semibold">
                        {balance === 0 ? (
                          <span className="text-muted">{formatCurrency(0)}</span>
                        ) : (
                          <span className="text-amber-600">{formatCurrency(balance)}</span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <span
                          className={`badge-pill text-[11px] ${
                            bill.status === 'PAID'
                              ? '!bg-emerald-50 !text-emerald-700'
                              : bill.status === 'PARTIALLY_PAID'
                              ? '!bg-amber-50 !text-amber-700'
                              : '!bg-rose-50 !text-rose-700'
                          }`}
                        >
                          {bill.status === 'PAID'
                            ? 'Paid'
                            : bill.status === 'PARTIALLY_PAID'
                            ? 'Partial'
                            : 'Unpaid'}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          {balance > 0 && (
                            <button
                              onClick={() => handleOpenPaymentModal(bill)}
                              className="btn-primary !text-xs !py-1 !px-2.5 flex items-center gap-1"
                            >
                              <DollarSign className="h-3.5 w-3.5" /> Pay
                            </button>
                          )}
                          <button
                            onClick={() => handleOpenInvoice(bill.id)}
                            className="btn-secondary !text-xs !py-1 !px-2.5 flex items-center gap-1"
                            title="View / Print Official Invoice"
                          >
                            <Receipt className="h-3.5 w-3.5 text-brand" /> Invoice
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ========================================================================= */}
      {/* MODAL 1: RECORD PAYMENT                                                   */}
      {/* ========================================================================= */}
      <Modal
        isOpen={isPaymentModalOpen}
        onClose={() => setIsPaymentModalOpen(false)}
        title="Record Payment Settlement"
      >
        {selectedBillForPayment && (
          <form onSubmit={handleSubmitPayment} className="space-y-4">
            {paymentError && (
              <div className="p-3 rounded-lg bg-rose-50 text-rose-700 text-xs flex items-center gap-2">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{paymentError}</span>
              </div>
            )}

            {/* Bill Summary */}
            <div className="p-3.5 bg-surface-soft rounded-xl border border-hairline space-y-1 text-xs">
              <div className="flex justify-between">
                <span className="text-muted">Patient:</span>
                <span className="font-semibold text-ink">{selectedBillForPayment.patient.user.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted">Total Billed:</span>
                <span className="font-mono font-medium text-ink">
                  {formatCurrency(selectedBillForPayment.totalAmount)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted">Already Paid:</span>
                <span className="font-mono text-emerald-600">
                  {formatCurrency(selectedBillForPayment.paidAmount)}
                </span>
              </div>
              <div className="flex justify-between border-t border-hairline pt-1 text-sm font-bold">
                <span className="text-ink">Outstanding Balance:</span>
                <span className="font-mono text-amber-600">
                  {formatCurrency(
                    Number(selectedBillForPayment.totalAmount) -
                    Number(selectedBillForPayment.paidAmount)
                  )}
                </span>
              </div>
            </div>

            {/* Payment Method Selector */}
            <div>
              <label className="block text-xs font-semibold text-ink mb-1">
                Payment Method
              </label>
              <select
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value as PaymentMethod)}
                className="input-field text-xs w-full"
              >
                <option value={PaymentMethod.UPI}>📱 UPI / QR Transfer</option>
                <option value={PaymentMethod.CARD}>💳 Credit / Debit Card</option>
                <option value={PaymentMethod.CASH}>💵 Cash</option>
                <option value={PaymentMethod.INSURANCE}>🛡️ Health Insurance</option>
                <option value={PaymentMethod.NET_BANKING}>🏦 Online Net Banking</option>
              </select>
            </div>

            {/* Payment Amount */}
            <div>
              <div className="flex justify-between items-center mb-1">
                <label className="block text-xs font-semibold text-ink">
                  Payment Amount (₹)
                </label>
                <button
                  type="button"
                  onClick={() => {
                    const bal =
                      Number(selectedBillForPayment.totalAmount) -
                      Number(selectedBillForPayment.paidAmount);
                    setPaymentAmount(bal.toFixed(2));
                  }}
                  className="text-[11px] text-brand hover:underline font-medium"
                >
                  Pay Full Balance
                </button>
              </div>
              <input
                type="number"
                step="0.01"
                min="0.01"
                max={
                  Number(selectedBillForPayment.totalAmount) -
                  Number(selectedBillForPayment.paidAmount)
                }
                value={paymentAmount}
                onChange={(e) => setPaymentAmount(e.target.value)}
                required
                className="input-field text-sm font-mono w-full"
              />
            </div>

            {/* Transaction Ref */}
            <div>
              <label className="block text-xs font-semibold text-ink mb-1">
                Transaction Reference / Authorization ID (Optional)
              </label>
              <input
                type="text"
                placeholder="e.g. TXN-94827104 or Auth Code"
                value={transactionRef}
                onChange={(e) => setTransactionRef(e.target.value)}
                className="input-field text-xs w-full"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setIsPaymentModalOpen(false)}
                className="btn-secondary text-xs"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submittingPayment}
                className="btn-primary text-xs flex items-center gap-1.5"
              >
                {submittingPayment ? (
                  <>
                    <RefreshCw className="h-3.5 w-3.5 animate-spin" /> Processing...
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="h-3.5 w-3.5" /> Confirm Settlement
                  </>
                )}
              </button>
            </div>
          </form>
        )}
      </Modal>

      {/* ========================================================================= */}
      {/* MODAL 2: GENERATE NEW BILL                                                */}
      {/* ========================================================================= */}
      <Modal
        isOpen={isGenerateModalOpen}
        onClose={() => setIsGenerateModalOpen(false)}
        title="Generate Hospital Bill"
      >
        <form onSubmit={handleSubmitGenerateBill} className="space-y-4">
          {genError && (
            <div className="p-3 rounded-lg bg-rose-50 text-rose-700 text-xs flex items-center gap-2">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{genError}</span>
            </div>
          )}

          {loadingAppts ? (
            <div className="py-8 text-center text-xs text-muted">
              <RefreshCw className="h-5 w-5 animate-spin mx-auto mb-2" />
              Loading completed consultations...
            </div>
          ) : completedAppts.length === 0 ? (
            <div className="py-6 text-center text-xs text-muted">
              No unbilled completed consultations found.
            </div>
          ) : (
            <>
              <div>
                <label className="block text-xs font-semibold text-ink mb-1">
                  Select Completed Consultation
                </label>
                <select
                  value={selectedApptId}
                  onChange={(e) => setSelectedApptId(e.target.value)}
                  className="input-field text-xs w-full"
                >
                  {completedAppts.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.patient.user.name} • Dr. {a.doctor.user.name} ({a.doctor.department.name}) •{' '}
                      {new Date(a.appointmentDate).toISOString().split('T')[0]} at {a.timeSlot}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-ink mb-1">
                    Discount (%)
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={discountPercent}
                    onChange={(e) => setDiscountPercent(Number(e.target.value))}
                    className="input-field text-xs w-full"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-ink mb-1">
                    Tax / Surcharge (%)
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={taxPercent}
                    onChange={(e) => setTaxPercent(Number(e.target.value))}
                    className="input-field text-xs w-full"
                  />
                </div>
              </div>

              <div className="p-3 bg-surface-soft rounded-xl border border-hairline text-xs text-muted">
                💡 Consultation fee, prescribed medications, and diagnostic lab scans are automatically itemized from the clinical record.
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsGenerateModalOpen(false)}
                  className="btn-secondary text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingGen}
                  className="btn-primary text-xs flex items-center gap-1.5"
                >
                  {submittingGen ? 'Generating...' : 'Create Official Bill'}
                </button>
              </div>
            </>
          )}
        </form>
      </Modal>

      {/* ========================================================================= */}
      {/* MODAL 3: INVOICE VIEWER & PRINTER                                         */}
      {/* ========================================================================= */}
      <Modal
        isOpen={isInvoiceModalOpen}
        onClose={() => setIsInvoiceModalOpen(false)}
        title="Official Patient Invoice"
      >
        {loadingInvoice || !invoiceBill ? (
          <div className="py-12 text-center text-xs text-muted">
            <RefreshCw className="h-5 w-5 animate-spin mx-auto mb-2" />
            Loading invoice details...
          </div>
        ) : (
          <div className="space-y-6 print:m-0 print:p-0">
            {/* Action buttons (hidden when printing) */}
            <div className="flex items-center justify-between border-b border-hairline pb-4 print:hidden">
              <span className="text-xs text-muted font-mono">
                Invoice #{invoiceBill.id.slice(-10).toUpperCase()}
              </span>
              <button
                type="button"
                onClick={handlePrint}
                className="btn-primary text-xs flex items-center gap-2 !py-1.5 !px-3"
              >
                <Printer className="h-4 w-4" /> Print / Save PDF
              </button>
            </div>

            {/* Printable Document Sheet */}
            <div id="printable-invoice" className="bg-white p-4 space-y-6">
              {/* Hospital Header */}
              <div className="flex justify-between items-start border-b border-hairline pb-4">
                <div>
                  <div className="flex items-center gap-2">
                    <div className="h-7 w-7 rounded-full bg-brand text-white flex items-center justify-center font-bold text-xs">
                      HC
                    </div>
                    <span className="font-bold text-lg text-ink">HospitalCare System</span>
                  </div>
                  <div className="text-xs text-muted mt-1">
                    Plot 12, Bandra Kurla Complex (BKC), Bandra East<br />
                    Mumbai, MH 400051 • +91 98201 00001<br />
                    billing@hospitalcare.org
                  </div>
                </div>

                <div className="text-right font-mono">
                  <div className="text-xs font-semibold text-muted uppercase">Tax Invoice</div>
                  <div className="text-sm font-bold text-ink">{invoiceBill.id.slice(-10).toUpperCase()}</div>
                  <div className="text-[11px] text-muted">
                    Date: {new Date(invoiceBill.createdAt).toLocaleDateString()}
                  </div>
                  <div className="mt-1">
                    <span
                      className={`badge-pill text-[10px] ${
                        invoiceBill.status === 'PAID'
                          ? '!bg-emerald-50 !text-emerald-700'
                          : invoiceBill.status === 'PARTIALLY_PAID'
                          ? '!bg-amber-50 !text-amber-700'
                          : '!bg-rose-50 !text-rose-700'
                      }`}
                    >
                      {invoiceBill.status}
                    </span>
                  </div>
                </div>
              </div>

              {/* Patient & Doctor Demographics */}
              <div className="grid grid-cols-2 gap-4 text-xs bg-surface-soft p-3.5 rounded-xl border border-hairline">
                <div>
                  <div className="font-semibold text-muted uppercase tracking-wider text-[10px] mb-1">
                    Billed Patient
                  </div>
                  <div className="font-bold text-ink text-sm">{invoiceBill.patient.user.name}</div>
                  <div className="text-muted">Health ID: {invoiceBill.patientId.slice(-8).toUpperCase()}</div>
                  <div className="text-muted">Blood Group: {invoiceBill.patient.bloodGroup || 'O+'}</div>
                  <div className="text-muted">Contact: {invoiceBill.patient.user.phone || 'On file'}</div>
                </div>

                <div>
                  <div className="font-semibold text-muted uppercase tracking-wider text-[10px] mb-1">
                    Attending Physician
                  </div>
                  {invoiceBill.appointment ? (
                    <>
                      <div className="font-bold text-ink text-sm">
                        Dr. {invoiceBill.appointment.doctor.user.name}
                      </div>
                      <div className="text-muted">
                        {invoiceBill.appointment.doctor.department.name} •{' '}
                        {invoiceBill.appointment.doctor.specialization}
                      </div>
                      <div className="text-muted">
                        Consultation Date: {new Date(invoiceBill.appointment.appointmentDate).toISOString().split('T')[0]} at {invoiceBill.appointment.timeSlot}
                      </div>
                    </>
                  ) : (
                    <div className="text-muted">Outpatient Diagnostic Billing</div>
                  )}
                </div>
              </div>

              {/* Itemized Table */}
              <div>
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-hairline font-semibold text-muted text-left">
                      <th className="py-2">Description</th>
                      <th className="py-2">Category</th>
                      <th className="py-2 text-right">Unit Price</th>
                      <th className="py-2 text-center">Qty</th>
                      <th className="py-2 text-right">Line Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-hairline">
                    {(invoiceBill.items?.items || []).map((it: any, idx: number) => (
                      <tr key={idx}>
                        <td className="py-2.5 font-medium text-ink">{it.title}</td>
                        <td className="py-2.5 text-muted uppercase text-[10px]">{it.category}</td>
                        <td className="py-2.5 text-right font-mono">{formatCurrency(it.cost)}</td>
                        <td className="py-2.5 text-center font-mono">{it.quantity}</td>
                        <td className="py-2.5 text-right font-mono font-bold text-ink">
                          {formatCurrency(it.total)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Financial Calculation Breakdown */}
              <div className="flex justify-end border-t border-hairline pt-3">
                <div className="w-64 space-y-1.5 text-xs font-mono">
                  <div className="flex justify-between text-muted">
                    <span>Subtotal:</span>
                    <span>{formatCurrency(invoiceBill.items?.subtotal || invoiceBill.totalAmount)}</span>
                  </div>
                  {Number(invoiceBill.discount) > 0 && (
                    <div className="flex justify-between text-emerald-600">
                      <span>Discount ({invoiceBill.items?.discountRate || 0}%):</span>
                      <span>-{formatCurrency(invoiceBill.discount)}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-muted">
                    <span>Service Tax ({invoiceBill.items?.taxRate || 5}%):</span>
                    <span>+{formatCurrency(invoiceBill.items?.tax || 0)}</span>
                  </div>
                  <div className="flex justify-between border-t border-hairline pt-1 font-bold text-sm text-ink">
                    <span>Total Due:</span>
                    <span>{formatCurrency(invoiceBill.totalAmount)}</span>
                  </div>
                  <div className="flex justify-between text-emerald-600 font-semibold">
                    <span>Amount Paid:</span>
                    <span>{formatCurrency(invoiceBill.paidAmount)}</span>
                  </div>
                  <div className="flex justify-between border-t border-hairline pt-1 text-sm font-bold text-amber-600">
                    <span>Outstanding:</span>
                    <span>{formatCurrency(invoiceBill.balance || 0)}</span>
                  </div>
                </div>
              </div>

              {/* Payment Receipts History */}
              {invoiceBill.payments && invoiceBill.payments.length > 0 && (
                <div className="border-t border-hairline pt-4">
                  <div className="font-semibold text-ink text-xs uppercase tracking-wider mb-2">
                    Payment Receipts
                  </div>
                  <div className="space-y-1 text-xs">
                    {invoiceBill.payments.map((p: any) => (
                      <div
                        key={p.id}
                        className="flex justify-between py-1 px-2.5 rounded bg-surface-soft font-mono"
                      >
                        <span>
                          {new Date(p.receivedAt).toLocaleDateString()} • {p.method} • Ref: {p.transactionRef || 'N/A'}
                        </span>
                        <span className="font-bold text-emerald-600">{formatCurrency(p.amount)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Footer Stamp */}
              <div className="border-t border-hairline pt-4 text-center text-[11px] text-muted space-y-1">
                <p>Thank you for choosing HospitalCare Health System.</p>
                <p>Computer-generated invoice. No physical signature required.</p>
              </div>
            </div>
          </div>
        )}
      </Modal>
    </DashboardShell>
  );
}
