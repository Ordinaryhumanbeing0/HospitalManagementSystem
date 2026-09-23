import { z } from 'zod';
import { PaymentMethod, PaymentStatus } from '@prisma/client';

export const billItemSchema = z.object({
  title: z.string().min(1, 'Item title is required.'),
  category: z.enum(['CONSULTATION', 'LAB_TEST', 'MEDICATION', 'PROCEDURE', 'OTHER']),
  cost: z.number().min(0, 'Cost cannot be negative.'),
  quantity: z.number().int().min(1, 'Quantity must be at least 1.'),
  total: z.number().min(0, 'Total cannot be negative.'),
});

export const generateBillSchema = z.object({
  appointmentId: z.string().min(1, 'Appointment ID is required.'),
  discountPercentage: z.number().min(0).max(100).default(0),
  taxPercentage: z.number().min(0).max(100).default(5), // Default 5% healthcare service tax
  customItems: z.array(billItemSchema).optional(),
});

export type GenerateBillInput = z.infer<typeof generateBillSchema>;

export const recordPaymentSchema = z.object({
  billId: z.string().min(1, 'Bill ID is required.'),
  amount: z.number().positive('Payment amount must be greater than zero.'),
  method: z.nativeEnum(PaymentMethod),
  transactionRef: z.string().max(100).optional().nullable(),
});

export type RecordPaymentInput = z.infer<typeof recordPaymentSchema>;

export const billFilterSchema = z.object({
  status: z.enum(['ALL', 'UNPAID', 'PARTIALLY_PAID', 'PAID', 'REFUNDED']).default('ALL'),
  patientId: z.string().optional(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  search: z.string().optional(),
  page: z.number().int().positive().default(1),
  limit: z.number().int().positive().max(100).default(20),
});

export type BillFilterInput = z.infer<typeof billFilterSchema>;

export const reportFilterSchema = z.object({
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  departmentId: z.string().optional(),
});

export type ReportFilterInput = z.infer<typeof reportFilterSchema>;
