import { z } from 'zod';

export const medicationItemSchema = z.object({
  name: z.string().min(1, 'Medication name is required.'),
  dosage: z.string().min(1, 'Dosage is required (e.g. 500mg, 1 tablet).'),
  frequency: z.string().min(1, 'Frequency is required (e.g. Twice daily, Once at night).'),
  duration: z.string().min(1, 'Duration is required (e.g. 5 days, 1 month).'),
  instructions: z.string().optional(),
});

export type MedicationItem = z.infer<typeof medicationItemSchema>;

export const createPrescriptionSchema = z.object({
  appointmentId: z.string().min(1, 'Appointment ID is required.'),
  patientId: z.string().min(1, 'Patient ID is required.'),
  doctorId: z.string().min(1, 'Doctor ID is required.'),
  diagnosis: z.string().min(2, 'Diagnosis must be at least 2 characters long.'),
  symptoms: z.string().max(1000).optional().nullable(),
  notes: z.string().max(2000, 'Clinical notes cannot exceed 2000 characters.').optional().nullable(),
  followUpDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format (YYYY-MM-DD)').optional().nullable(),
  medications: z.array(medicationItemSchema).min(1, 'At least one medication is required in the prescription.'),
});

export type CreatePrescriptionInput = z.infer<typeof createPrescriptionSchema>;

export const uploadMedicalReportSchema = z.object({
  patientId: z.string().min(1, 'Patient ID is required.'),
  doctorId: z.string().optional().nullable(),
  title: z.string().min(2, 'Report title must be at least 2 characters long.'),
  reportType: z.enum([
    'Blood Test',
    'X-Ray',
    'MRI Scan',
    'CT Scan',
    'Ultrasound',
    'Pathology',
    'ECG / Cardiology',
    'Discharge Summary',
    'General Medical Report',
  ]),
  fileUrl: z.string().min(1, 'File URL or document attachment is required.'),
  notes: z.string().max(2000, 'Report observations cannot exceed 2000 characters.').optional().nullable(),
});

export type UploadMedicalReportInput = z.infer<typeof uploadMedicalReportSchema>;
