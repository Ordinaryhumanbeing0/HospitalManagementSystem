import { z } from 'zod';

export const patientProfileSchema = z.object({
  name: z.string().trim().min(2, { message: 'Name must be at least 2 characters.' }),
  email: z.string().trim().email({ message: 'Please enter a valid email address.' }),
  phone: z.string().trim().min(7, { message: 'Phone number must be at least 7 digits.' }),
  dateOfBirth: z.string().refine((val) => !isNaN(Date.parse(val)), {
    message: 'Please provide a valid date of birth (YYYY-MM-DD).',
  }),
  gender: z.enum(['Male', 'Female', 'Other']),
  bloodGroup: z.enum(['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-']).optional().nullable(),
  address: z.string().trim().optional().nullable(),
  emergencyContact: z.string().trim().optional().nullable(),
  medicalHistorySummary: z.string().trim().optional().nullable(),
});

export const updatePatientSchema = patientProfileSchema.partial().extend({
  id: z.string().min(1, { message: 'Patient ID is required.' }),
});

export const patientSearchSchema = z.object({
  query: z.string().optional(),
  bloodGroup: z.string().optional(),
  gender: z.string().optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(10),
});

export type PatientProfileInput = z.infer<typeof patientProfileSchema>;
export type UpdatePatientInput = z.infer<typeof updatePatientSchema>;
export type PatientSearchInput = z.infer<typeof patientSearchSchema>;
