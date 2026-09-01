import { z } from 'zod';

export const doctorScheduleItemSchema = z.object({
  dayOfWeek: z.number().int().min(0).max(6), // 0: Sun ... 6: Sat
  startTime: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, { message: 'Invalid start time format (HH:MM).' }),
  endTime: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, { message: 'Invalid end time format (HH:MM).' }),
  slotDuration: z.number().int().min(10).max(120).default(30),
  isActive: z.boolean().default(true),
});

export const createDoctorSchema = z.object({
  name: z.string().trim().min(2, { message: 'Doctor name is required.' }),
  email: z.string().trim().email({ message: 'Valid email is required.' }),
  phone: z.string().trim().min(7, { message: 'Valid phone number is required.' }),
  password: z
    .string()
    .min(8, { message: 'Password must be at least 8 characters.' })
    .regex(/[A-Z]/, { message: 'Must contain an uppercase letter.' })
    .regex(/[0-9]/, { message: 'Must contain a number.' }),
  departmentId: z.string().min(1, { message: 'Please select a hospital department.' }),
  specialization: z.string().trim().min(2, { message: 'Specialization is required.' }),
  qualification: z.string().trim().min(2, { message: 'Qualification is required.' }),
  consultationFee: z.coerce.number().positive({ message: 'Consultation fee must be greater than 0.' }),
  schedules: z.array(doctorScheduleItemSchema).optional(),
});

export const updateDoctorSchema = z.object({
  id: z.string().min(1, { message: 'Doctor ID is required.' }),
  name: z.string().trim().min(2).optional(),
  phone: z.string().trim().min(7).optional(),
  departmentId: z.string().min(1).optional(),
  specialization: z.string().trim().min(2).optional(),
  qualification: z.string().trim().min(2).optional(),
  consultationFee: z.coerce.number().positive().optional(),
});

export const doctorSearchSchema = z.object({
  departmentId: z.string().optional(),
  search: z.string().optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(10),
});

export type CreateDoctorInput = z.infer<typeof createDoctorSchema>;
export type UpdateDoctorInput = z.infer<typeof updateDoctorSchema>;
export type DoctorScheduleItemInput = z.infer<typeof doctorScheduleItemSchema>;
export type DoctorSearchInput = z.infer<typeof doctorSearchSchema>;
