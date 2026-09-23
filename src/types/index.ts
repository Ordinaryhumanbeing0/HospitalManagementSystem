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
  isBreak?: boolean;
  isLeave?: boolean;
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
  isOnLeave?: boolean;
  leaveReason?: string;
  isInactive?: boolean;
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

export interface DoctorLeaveItem {
  id: string;
  doctorId: string;
  doctorName?: string;
  departmentName?: string;
  startDate: string;
  endDate: string;
  reason?: string | null;
  createdAt: string | Date;
}

export interface AdminOperationalMetrics {
  totalPatients: number;
  activePatients: number;
  totalDoctors: number;
  activeDoctors: number;
  doctorsOnLeave: number;
  doctorsAvailableToday: number;
  todayAppointmentsCount: number;
  upcomingAppointmentsCount: number;
  todayCompletedCount: number;
  todayPendingCount: number;
  cancelledAppointmentsCount: number;
  noShowAppointmentsCount: number;
  statusDistribution: Record<string, number>;
  todayRevenue: number;
  totalRevenue: number;
  pendingBillsCount: number;
  pendingBillsAmount: number;
  doctorWorkload: Array<{
    doctorId: string;
    doctorName: string;
    departmentName: string;
    specialization: string;
    isActive: boolean;
    isOnLeaveToday: boolean;
    todayAppointments: number;
    completedTotal: number;
    revenueTotal: number;
    cancelledCount: number;
    noShowCount: number;
  }>;
  leaveConflictedAppointments: Array<{
    appointmentId: string;
    patientName: string;
    doctorName: string;
    departmentName: string;
    appointmentDate: string;
    timeSlot: string;
    status: AppointmentStatus;
    leaveReason?: string | null;
  }>;
}

// -----------------------------------------------------------------------------
// TEAM 3: Billing, Payments, Invoicing & Reports Types
// -----------------------------------------------------------------------------

export interface BillItem {
  title: string;
  category: 'CONSULTATION' | 'LAB_TEST' | 'MEDICATION' | 'PROCEDURE' | 'OTHER';
  cost: number;
  quantity: number;
  total: number;
}

export interface BillItemsData {
  items: BillItem[];
  subtotal: number;
  discount: number;
  discountRate: number; // percentage, e.g. 10 for 10%
  tax: number;
  taxRate: number; // percentage, e.g. 5 for 5%
  total: number;
}

export interface BillWithRelations {
  id: string;
  patientId: string;
  appointmentId: string | null;
  totalAmount: number;
  discount: number;
  paidAmount: number;
  status: PaymentStatus;
  items: BillItemsData;
  createdAt: string | Date;
  updatedAt: string | Date;
  patient: {
    id: string;
    bloodGroup?: string | null;
    dateOfBirth: string | Date;
    emergencyContact?: string | null;
    address?: string | null;
    user: {
      name: string;
      email: string;
      phone?: string | null;
    };
  };
  appointment?: {
    id: string;
    appointmentDate: string | Date;
    timeSlot: string;
    status: AppointmentStatus;
    reason?: string | null;
    doctor: {
      id: string;
      specialization: string;
      qualification: string;
      consultationFee: number;
      user: {
        name: string;
        email: string;
      };
      department: {
        id: string;
        name: string;
      };
    };
    prescription?: {
      id: string;
      diagnosis: string;
      medications: any;
    } | null;
  } | null;
  payments: Array<{
    id: string;
    amount: number;
    method: string;
    transactionRef?: string | null;
    receivedAt: string | Date;
  }>;
}

export interface RevenueReportData {
  summary: {
    totalRevenue: number;
    totalBilled: number;
    totalOutstanding: number;
    collectionRate: number; // e.g. 85.5%
    totalPatients: number;
    totalConsultations: number;
    averageBillValue: number;
  };
  revenueByCategory: {
    consultation: number;
    lab: number;
    medication: number;
    procedure: number;
    other: number;
  };
  departmentRevenue: Array<{
    departmentName: string;
    revenue: number;
    consultationCount: number;
    percentage: number;
  }>;
  dailyTrends: Array<{
    date: string;
    revenue: number;
    patientCount: number;
  }>;
}

export interface NotificationItem {
  id: string;
  userId: string;
  title: string;
  message: string;
  isRead: boolean;
  createdAt: string | Date;
}

