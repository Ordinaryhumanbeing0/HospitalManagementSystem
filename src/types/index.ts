import { Role, AppointmentStatus, PaymentStatus } from '@prisma/client';

export type UserRole = Role;

export interface SessionUser {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  phone?: string | null;
  patientId?: string | null;
  doctorId?: string | null;
}

export interface ActionResponse<T = unknown> {
  success: boolean;
  message?: string;
  data?: T;
  errors?: Record<string, string[]>;
}

export interface SlotInfo {
  timeSlot: string; // e.g. "09:30"
  displayTime: string; // e.g. "09:30 AM"
  isAvailable: boolean;
  isPast: boolean;
  bookedReason?: string;
}

export interface DoctorDailyAvailability {
  doctorId: string;
  doctorName: string;
  departmentName: string;
  date: string;
  dayOfWeek: number;
  dayName: string;
  isOnDuty: boolean;
  shiftStart?: string;
  shiftEnd?: string;
  slotDuration?: number;
  slots: SlotInfo[];
}

export interface MedicationItemType {
  name: string;
  dosage: string;
  frequency: string;
  duration: string;
  instructions?: string;
}
