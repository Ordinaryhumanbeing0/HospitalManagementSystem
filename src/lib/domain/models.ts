import { AppointmentStatus } from '@prisma/client';
import { MedicationItemType, BillItemsData, RevenueReportData } from '@/types';
import { formatCurrency } from '@/lib/config/currency';

/**
 * Domain Model for Appointment
 * Encapsulates state transitions, slot formatting, and validation rules.
 */
export class AppointmentModel {
  public id: string;
  public patientId: string;
  public doctorId: string;
  public appointmentDate: Date;
  public timeSlot: string; // e.g. "10:30"
  public status: AppointmentStatus;
  public reason?: string | null;

  constructor(data: {
    id: string;
    patientId: string;
    doctorId: string;
    appointmentDate: Date | string;
    timeSlot: string;
    status: AppointmentStatus;
    reason?: string | null;
  }) {
    this.id = data.id;
    this.patientId = data.patientId;
    this.doctorId = data.doctorId;
    this.appointmentDate =
      typeof data.appointmentDate === 'string'
        ? new Date(data.appointmentDate)
        : data.appointmentDate;
    this.timeSlot = data.timeSlot;
    this.status = data.status;
    this.reason = data.reason;
  }

  /**
   * Check if appointment can be cancelled by patient or staff.
   */
  public isCancellable(): boolean {
    return this.status !== AppointmentStatus.COMPLETED && this.status !== AppointmentStatus.CANCELLED;
  }

  /**
   * Check if appointment can be rescheduled to another slot.
   */
  public isReschedulable(): boolean {
    return this.status !== AppointmentStatus.COMPLETED && this.status !== AppointmentStatus.CANCELLED;
  }

  /**
   * Check if the patient or receptionist can check-in for the visit today.
   */
  public isCheckableIn(): boolean {
    return (
      (this.status === AppointmentStatus.CONFIRMED || this.status === AppointmentStatus.SCHEDULED) &&
      !this.isPastDate()
    );
  }

  /**
   * Check if doctor can call patient into examination room.
   */
  public isStartable(): boolean {
    return (
      this.status === AppointmentStatus.CHECKED_IN ||
      this.status === AppointmentStatus.CONFIRMED ||
      this.status === AppointmentStatus.SCHEDULED
    );
  }

  /**
   * Check if the doctor can begin consultation or record findings.
   */
  public isConsultable(): boolean {
    return (
      this.status === AppointmentStatus.IN_PROGRESS ||
      this.status === AppointmentStatus.CHECKED_IN ||
      this.status === AppointmentStatus.CONFIRMED ||
      this.status === AppointmentStatus.SCHEDULED
    );
  }

  /**
   * Formatted time in 12-hour AM/PM notation
   */
  public getFormattedTime(): string {
    const [hStr, mStr] = this.timeSlot.split(':');
    const h = parseInt(hStr, 10);
    const ampm = h >= 12 ? 'PM' : 'AM';
    const displayH = h % 12 === 0 ? 12 : h % 12;
    return `${displayH.toString().padStart(2, '0')}:${mStr} ${ampm}`;
  }

  /**
   * Formatted ISO Date string (YYYY-MM-DD)
   */
  public getDateString(): string {
    return this.appointmentDate.toISOString().split('T')[0];
  }

  /**
   * Check if appointment date is in the past
   */
  public isPastDate(): boolean {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const apptDate = new Date(this.appointmentDate);
    apptDate.setHours(0, 0, 0, 0);
    return apptDate < today;
  }
}

/**
 * Domain Model for Medical Report
 * Encapsulates report classification, file references, and notes.
 */
export class MedicalReportModel {
  public id: string;
  public patientId: string;
  public doctorId?: string | null;
  public title: string;
  public reportType: string;
  public fileUrl: string;
  public notes?: string | null;
  public createdAt: Date;

  constructor(data: {
    id: string;
    patientId: string;
    doctorId?: string | null;
    title: string;
    reportType: string;
    fileUrl: string;
    notes?: string | null;
    createdAt: Date | string;
  }) {
    this.id = data.id;
    this.patientId = data.patientId;
    this.doctorId = data.doctorId;
    this.title = data.title;
    this.reportType = data.reportType;
    this.fileUrl = data.fileUrl;
    this.notes = data.notes;
    this.createdAt = typeof data.createdAt === 'string' ? new Date(data.createdAt) : data.createdAt;
  }

  /**
   * Check if report represents diagnostic imaging (MRI, X-Ray, CT, Ultrasound)
   */
  public isImagingReport(): boolean {
    const imagingKeywords = ['x-ray', 'mri', 'ct', 'ultrasound', 'scan', 'radiology'];
    const lowerType = this.reportType.toLowerCase();
    return imagingKeywords.some((k) => lowerType.includes(k));
  }

  /**
   * Summary line for timeline display
   */
  public getDisplaySummary(): string {
    return `${this.reportType}: ${this.title} (${this.createdAt.toLocaleDateString()})`;
  }
}

/**
 * Domain Model for Digital Prescription
 * Encapsulates diagnosis, instructions, and medication item list.
 */
export class PrescriptionModel {
  public id: string;
  public appointmentId: string;
  public patientId: string;
  public doctorId: string;
  public diagnosis: string;
  public symptoms?: string | null;
  public notes?: string | null;
  public followUpDate?: Date | null;
  public medications: MedicationItemType[];
  public createdAt: Date;

  constructor(data: {
    id: string;
    appointmentId: string;
    patientId: string;
    doctorId: string;
    diagnosis: string;
    symptoms?: string | null;
    notes?: string | null;
    followUpDate?: Date | string | null;
    medications: any;
    createdAt: Date | string;
  }) {
    this.id = data.id;
    this.appointmentId = data.appointmentId;
    this.patientId = data.patientId;
    this.doctorId = data.doctorId;
    this.diagnosis = data.diagnosis;
    this.symptoms = data.symptoms;
    this.notes = data.notes;
    this.followUpDate = data.followUpDate
      ? typeof data.followUpDate === 'string'
        ? new Date(data.followUpDate)
        : data.followUpDate
      : null;
    this.medications = Array.isArray(data.medications) ? data.medications : [];
    this.createdAt = typeof data.createdAt === 'string' ? new Date(data.createdAt) : data.createdAt;
  }

  /**
   * Number of medications prescribed
   */
  public getMedicationCount(): number {
    return this.medications.length;
  }

  /**
   * Formatted medication summary list
   */
  public getFormattedMedicationList(): string[] {
    return this.medications.map(
      (med) => `${med.name} - ${med.dosage} (${med.frequency} for ${med.duration})`
    );
  }
}

/**
 * Domain Model for Patient Bill & Invoicing
 * Encapsulates subtotal calculation, tax, discounts, balance remaining, and payment status transitions.
 */
export class BillModel {
  public id: string;
  public patientId: string;
  public appointmentId?: string | null;
  public totalAmount: number;
  public discount: number;
  public paidAmount: number;
  public status: string;
  public itemsData: BillItemsData;
  public createdAt: Date;

  constructor(data: {
    id: string;
    patientId: string;
    appointmentId?: string | null;
    totalAmount: number | string;
    discount?: number | string;
    paidAmount?: number | string;
    status?: string;
    items: any;
    createdAt?: Date | string;
  }) {
    this.id = data.id;
    this.patientId = data.patientId;
    this.appointmentId = data.appointmentId;
    this.totalAmount = typeof data.totalAmount === 'string' ? parseFloat(data.totalAmount) : data.totalAmount;
    this.discount = data.discount ? (typeof data.discount === 'string' ? parseFloat(data.discount) : data.discount) : 0;
    this.paidAmount = data.paidAmount ? (typeof data.paidAmount === 'string' ? parseFloat(data.paidAmount) : data.paidAmount) : 0;
    this.status = data.status || 'UNPAID';
    this.createdAt = data.createdAt ? (typeof data.createdAt === 'string' ? new Date(data.createdAt) : data.createdAt) : new Date();

    // Parse items structure
    if (data.items && typeof data.items === 'object' && Array.isArray(data.items.items)) {
      this.itemsData = data.items;
    } else if (Array.isArray(data.items)) {
      const sub = data.items.reduce((acc: number, it: any) => acc + (it.total || it.cost * it.quantity || 0), 0);
      this.itemsData = {
        items: data.items,
        subtotal: sub,
        discount: this.discount,
        discountRate: sub > 0 ? (this.discount / sub) * 100 : 0,
        tax: 0,
        taxRate: 0,
        total: this.totalAmount,
      };
    } else {
      this.itemsData = {
        items: [],
        subtotal: this.totalAmount,
        discount: 0,
        discountRate: 0,
        tax: 0,
        taxRate: 0,
        total: this.totalAmount,
      };
    }
  }

  /**
   * Outstanding balance remaining to be paid
   */
  public getBalance(): number {
    const bal = this.totalAmount - this.paidAmount;
    return bal > 0 ? Math.round(bal * 100) / 100 : 0;
  }

  /**
   * Determine whether the bill is fully paid
   */
  public isFullyPaid(): boolean {
    return this.paidAmount >= this.totalAmount;
  }

  /**
   * Determine whether the bill is partially paid
   */
  public isPartiallyPaid(): boolean {
    return this.paidAmount > 0 && this.paidAmount < this.totalAmount;
  }

  /**
   * Formatted currency string
   */
  public static formatCurrency(val: number): string {
    return formatCurrency(val);
  }

  /**
   * Itemized breakdown line count
   */
  public getItemCount(): number {
    return this.itemsData.items.length;
  }

  /**
   * Percentage of bill collected
   */
  public getCollectionPercentage(): number {
    if (this.totalAmount === 0) return 100;
    return Math.min(100, Math.round((this.paidAmount / this.totalAmount) * 100));
  }
}

/**
 * Domain Model for Payment Transaction
 * Encapsulates payment validation, methods, and audit verification.
 */
export class PaymentModel {
  public id: string;
  public billId: string;
  public amount: number;
  public method: string;
  public transactionRef?: string | null;
  public receivedAt: Date;

  constructor(data: {
    id: string;
    billId: string;
    amount: number | string;
    method: string;
    transactionRef?: string | null;
    receivedAt?: Date | string;
  }) {
    this.id = data.id;
    this.billId = data.billId;
    this.amount = typeof data.amount === 'string' ? parseFloat(data.amount) : data.amount;
    this.method = data.method;
    this.transactionRef = data.transactionRef;
    this.receivedAt = data.receivedAt ? (typeof data.receivedAt === 'string' ? new Date(data.receivedAt) : data.receivedAt) : new Date();
  }

  /**
   * Validate that the payment amount is positive and does not exceed the bill's outstanding balance
   */
  public isValidPayment(outstandingBalance: number): boolean {
    return this.amount > 0 && this.amount <= outstandingBalance + 0.001;
  }

  /**
   * Human-readable payment method description
   */
  public getFormattedMethod(): string {
    switch (this.method) {
      case 'CASH':
        return '💵 Cash Payment';
      case 'CARD':
        return '💳 Credit / Debit Card';
      case 'UPI':
        return '📱 UPI Instant Transfer';
      case 'INSURANCE':
        return '🛡️ Health Insurance Claim';
      case 'NET_BANKING':
        return '🏦 Online Net Banking';
      default:
        return this.method;
    }
  }
}

/**
 * Domain Model for Report & Financial Analytics
 * Encapsulates DBMS aggregations and CSV data export formatting.
 */
export class ReportModel {
  public data: RevenueReportData;

  constructor(data: RevenueReportData) {
    this.data = data;
  }

  /**
   * Generates formatted CSV string for export
   */
  public toCsvString(): string {
    const lines: string[] = [];

    // Header section
    lines.push('HOSPITAL MANAGEMENT SYSTEM - FINANCIAL & CLINICAL PERFORMANCE REPORT');
    lines.push(`Generated On,"${new Date().toISOString()}"`);
    lines.push('');

    // Summary Section
    lines.push('EXECUTIVE SUMMARY METRICS');
    lines.push('Metric,Value');
    lines.push(`Total Gross Revenue Billed,${this.data.summary.totalBilled.toFixed(2)}`);
    lines.push(`Total Revenue Collected,${this.data.summary.totalRevenue.toFixed(2)}`);
    lines.push(`Outstanding Receivables,${this.data.summary.totalOutstanding.toFixed(2)}`);
    lines.push(`Collection Rate,${this.data.summary.collectionRate}%`);
    lines.push(`Total Patients Seen,${this.data.summary.totalPatients}`);
    lines.push(`Completed Consultations,${this.data.summary.totalConsultations}`);
    lines.push(`Average Bill Value,${this.data.summary.averageBillValue.toFixed(2)}`);
    lines.push('');

    // Revenue by Category
    lines.push('REVENUE BREAKDOWN BY SERVICE CATEGORY');
    lines.push('Service Category,Revenue (₹)');
    lines.push(`Physician Consultations,${this.data.revenueByCategory.consultation.toFixed(2)}`);
    lines.push(`Laboratory & Diagnostic Scans,${this.data.revenueByCategory.lab.toFixed(2)}`);
    lines.push(`Pharmacy & Medications,${this.data.revenueByCategory.medication.toFixed(2)}`);
    lines.push(`Clinical Procedures,${this.data.revenueByCategory.procedure.toFixed(2)}`);
    lines.push(`Other Services,${this.data.revenueByCategory.other.toFixed(2)}`);
    lines.push('');

    // Department breakdown
    lines.push('DEPARTMENTAL REVENUE DISTRIBUTION');
    lines.push('Department,Revenue (₹),Consultations,Share (%)');
    this.data.departmentRevenue.forEach((dept: any) => {
      lines.push(`"${dept.departmentName}",${dept.revenue.toFixed(2)},${dept.consultationCount},${dept.percentage}%`);
    });
    lines.push('');

    // Daily trends
    lines.push('DAILY ACTIVITY TRENDS');
    lines.push('Date,Revenue (₹),Patient Footfall');
    this.data.dailyTrends.forEach((trend: any) => {
      lines.push(`${trend.date},${trend.revenue.toFixed(2)},${trend.patientCount}`);
    });

    return lines.join('\n');
  }
}

/**
 * Domain Model for Notification
 * Encapsulates read state, time-ago, and notification icons.
 */
export class NotificationModel {
  public id: string;
  public userId: string;
  public title: string;
  public message: string;
  public isRead: boolean;
  public createdAt: Date;

  constructor(data: {
    id: string;
    userId: string;
    title: string;
    message: string;
    isRead: boolean;
    createdAt: Date | string;
  }) {
    this.id = data.id;
    this.userId = data.userId;
    this.title = data.title;
    this.message = data.message;
    this.isRead = data.isRead;
    this.createdAt = typeof data.createdAt === 'string' ? new Date(data.createdAt) : data.createdAt;
  }

  /**
   * Relative time string (e.g. "5m ago", "2h ago", "Yesterday")
   */
  public getTimeAgo(): string {
    const now = Date.now();
    const diffMs = now - this.createdAt.getTime();
    const diffSec = Math.floor(diffMs / 1000);
    const diffMin = Math.floor(diffSec / 60);
    const diffHr = Math.floor(diffMin / 60);
    const diffDays = Math.floor(diffHr / 24);

    if (diffSec < 60) return 'Just now';
    if (diffMin < 60) return `${diffMin}m ago`;
    if (diffHr < 24) return `${diffHr}h ago`;
    if (diffDays === 1) return 'Yesterday';
    return `${diffDays}d ago`;
  }
}

