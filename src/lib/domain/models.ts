import { AppointmentStatus } from '@prisma/client';
import { MedicationItemType } from '@/types';

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
    return this.status === AppointmentStatus.CONFIRMED || this.status === AppointmentStatus.PENDING;
  }

  /**
   * Check if appointment can be rescheduled to another slot.
   */
  public isReschedulable(): boolean {
    return this.status === AppointmentStatus.CONFIRMED || this.status === AppointmentStatus.PENDING;
  }

  /**
   * Check if the doctor can begin consultation or issue prescriptions.
   */
  public isConsultable(): boolean {
    return this.status === AppointmentStatus.CONFIRMED;
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
  public notes?: string | null;
  public medications: MedicationItemType[];
  public createdAt: Date;

  constructor(data: {
    id: string;
    appointmentId: string;
    patientId: string;
    doctorId: string;
    diagnosis: string;
    notes?: string | null;
    medications: any;
    createdAt: Date | string;
  }) {
    this.id = data.id;
    this.appointmentId = data.appointmentId;
    this.patientId = data.patientId;
    this.doctorId = data.doctorId;
    this.diagnosis = data.diagnosis;
    this.notes = data.notes;
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
