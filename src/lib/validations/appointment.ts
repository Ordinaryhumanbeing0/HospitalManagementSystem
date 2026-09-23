import { z } from 'zod';

export const slotQuerySchema = z.object({
  doctorId: z.string().min(1, 'Doctor ID is required.'),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format.'),
});

export type SlotQueryInput = z.infer<typeof slotQuerySchema>;

export const bookAppointmentSchema = z.object({
  patientId: z.string().min(1, 'Patient ID is required.'),
  doctorId: z.string().min(1, 'Doctor ID is required.'),
  appointmentDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format.'),
  timeSlot: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'Time slot must be in HH:mm format (e.g. 09:30).'),
  reason: z.string().max(500, 'Reason cannot exceed 500 characters.').optional().nullable(),
});

export type BookAppointmentInput = z.infer<typeof bookAppointmentSchema>;

export const rescheduleAppointmentSchema = z.object({
  appointmentId: z.string().min(1, 'Appointment ID is required.'),
  newDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format.'),
  newTimeSlot: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'Time slot must be in HH:mm format (e.g. 09:30).'),
  reason: z.string().max(500, 'Reason cannot exceed 500 characters.').optional().nullable(),
});

export type RescheduleAppointmentInput = z.infer<typeof rescheduleAppointmentSchema>;

export const cancelAppointmentSchema = z.object({
  appointmentId: z.string().min(1, 'Appointment ID is required.'),
  reason: z.string().max(500, 'Cancellation reason cannot exceed 500 characters.').optional().nullable(),
});

export type CancelAppointmentInput = z.infer<typeof cancelAppointmentSchema>;

export const reassignAppointmentSchema = z.object({
  appointmentId: z.string().min(1, 'Appointment ID is required.'),
  newDoctorId: z.string().min(1, 'New Doctor ID is required.'),
  reason: z.string().max(500).optional().nullable(),
});

export type ReassignAppointmentInput = z.infer<typeof reassignAppointmentSchema>;

export const appointmentFilterSchema = z.object({
  status: z
    .enum([
      'ALL',
      'SCHEDULED',
      'PENDING',
      'CONFIRMED',
      'CHECKED_IN',
      'IN_PROGRESS',
      'COMPLETED',
      'CANCELLED',
      'RESCHEDULED',
      'NO_SHOW',
    ])
    .default('ALL'),
  doctorId: z.string().optional(),
  patientId: z.string().optional(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  search: z.string().optional(),
  page: z.number().int().positive().default(1),
  limit: z.number().int().positive().max(100).default(20),
});

export type AppointmentFilterInput = z.infer<typeof appointmentFilterSchema>;
