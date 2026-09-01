import { z } from 'zod';

export const loginSchema = z.object({
  email: z.string().trim().email({ message: 'Please enter a valid email address.' }),
  password: z.string().min(6, { message: 'Password must be at least 6 characters long.' }),
});

export const registerPatientSchema = z.object({
  name: z.string().trim().min(2, { message: 'Name must be at least 2 characters.' }),
  email: z.string().trim().email({ message: 'Please enter a valid email address.' }),
  phone: z.string().trim().min(7, { message: 'Phone number must be at least 7 digits.' }),
  password: z
    .string()
    .min(8, { message: 'Password must be at least 8 characters.' })
    .regex(/[A-Z]/, { message: 'Password must contain at least one uppercase letter.' })
    .regex(/[0-9]/, { message: 'Password must contain at least one number.' }),
  dateOfBirth: z.string().refine((val) => !isNaN(Date.parse(val)), {
    message: 'Please provide a valid date of birth (YYYY-MM-DD).',
  }),
  gender: z.enum(['Male', 'Female', 'Other'], {
    errorMap: () => ({ message: 'Please select a valid gender.' }),
  }),
  bloodGroup: z.enum(['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-']).optional(),
  address: z.string().trim().optional(),
  emergencyContact: z.string().trim().optional(),
  medicalHistorySummary: z.string().trim().optional(),
});

export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, { message: 'Current password is required.' }),
    newPassword: z
      .string()
      .min(8, { message: 'New password must be at least 8 characters.' })
      .regex(/[A-Z]/, { message: 'Must contain an uppercase letter.' })
      .regex(/[0-9]/, { message: 'Must contain a number.' }),
    confirmPassword: z.string().min(1, { message: 'Please confirm your new password.' }),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "New passwords don't match.",
    path: ['confirmPassword'],
  });

export type LoginInput = z.infer<typeof loginSchema>;
export type RegisterPatientInput = z.infer<typeof registerPatientSchema>;
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;
