'use server';

import { prisma } from '@/lib/prisma';
import {
  generateBillSchema,
  recordPaymentSchema,
  billFilterSchema,
  GenerateBillInput,
  RecordPaymentInput,
  BillFilterInput,
} from '@/lib/validations/billing';
import { requireAuth, requireRole } from '@/lib/auth/rbac';
import { logAudit } from '@/lib/auth/audit';
import { ActionResponse, BillItem, BillItemsData } from '@/types';
import { AppointmentStatus, PaymentMethod, PaymentStatus, Prisma, Role } from '@prisma/client';
import { toPlainObject } from '@/lib/utils';
import { billingQueue } from '@/lib/queue/billing-queue';
import { BillModel, PaymentModel } from '@/lib/domain/models';
import { createNotificationHelper } from '@/actions/notification';
import { formatCurrency } from '@/lib/config/currency';

/**
 * Standard unit pricing for clinical services (INR)
 */
const PRICING_CATALOG = {
  DEFAULT_MEDICATION_PRICE: 250.0,
  DEFAULT_LAB_SCAN_PRICE: 750.0,
};

/**
 * Generates an itemized bill for a completed appointment
 */
export async function generateBillAction(input: GenerateBillInput): Promise<ActionResponse<any>> {
  try {
    const currentUser = await requireRole([Role.ADMIN, Role.RECEPTIONIST, Role.DOCTOR]);

    const validated = generateBillSchema.safeParse(input);
    if (!validated.success) {
      return {
        success: false,
        message: 'Invalid bill generation inputs.',
        errors: validated.error.flatten().fieldErrors,
      };
    }

    const { appointmentId, discountPercentage, taxPercentage, customItems } = validated.data;

    const appointment = await prisma.appointment.findUnique({
      where: { id: appointmentId },
      include: {
        patient: { include: { user: true } },
        doctor: { include: { user: true, department: true } },
        prescription: true,
        bill: true,
      },
    });

    if (!appointment) {
      return { success: false, message: 'Appointment not found.' };
    }

    // Business Rule: Cancelled appointments cannot generate bills
    if (appointment.status === AppointmentStatus.CANCELLED) {
      return {
        success: false,
        message: 'Cannot generate a bill for a CANCELLED appointment.',
      };
    }

    // If bill already exists, return existing bill
    if (appointment.bill) {
      return {
        success: true,
        message: 'A bill for this appointment already exists.',
        data: toPlainObject(appointment.bill),
      };
    }

    // Build Itemized Services
    const items: BillItem[] = [];

    // 1. Physician Consultation Fee
    const consultFee = Number(appointment.doctor.consultationFee) || 800.0;
    items.push({
      title: `Physician Consultation - Dr. ${appointment.doctor.user.name} (${appointment.doctor.department.name})`,
      category: 'CONSULTATION',
      cost: consultFee,
      quantity: 1,
      total: consultFee,
    });

    // 2. Prescribed Medications
    if (appointment.prescription && Array.isArray(appointment.prescription.medications)) {
      const meds = appointment.prescription.medications as any[];
      meds.forEach((m) => {
        const cost = PRICING_CATALOG.DEFAULT_MEDICATION_PRICE;
        items.push({
          title: `Pharmacy: ${m.name || 'Prescription Medication'} (${m.dosage || 'Standard'})`,
          category: 'MEDICATION',
          cost,
          quantity: 1,
          total: cost,
        });
      });
    }

    // 3. Diagnostic Lab Scans attached to patient & doctor
    const reports = await prisma.medicalReport.findMany({
      where: {
        patientId: appointment.patientId,
        doctorId: appointment.doctorId,
      },
      take: 2,
    });

    reports.forEach((rep) => {
      const cost = PRICING_CATALOG.DEFAULT_LAB_SCAN_PRICE;
      items.push({
        title: `Diagnostic Lab: ${rep.title} (${rep.reportType})`,
        category: 'LAB_TEST',
        cost,
        quantity: 1,
        total: cost,
      });
    });

    // 4. Custom line items if specified
    if (customItems && customItems.length > 0) {
      customItems.forEach((ci) => items.push(ci));
    }

    // Financial calculations
    const subtotal = Math.round(items.reduce((acc, it) => acc + it.total, 0) * 100) / 100;
    const discount = Math.round(subtotal * (discountPercentage / 100) * 100) / 100;
    const taxableAmount = Math.max(0, subtotal - discount);
    const tax = Math.round(taxableAmount * (taxPercentage / 100) * 100) / 100;
    const total = Math.round((taxableAmount + tax) * 100) / 100;

    const itemsData: BillItemsData = {
      items,
      subtotal,
      discount,
      discountRate: discountPercentage,
      tax,
      taxRate: taxPercentage,
      total,
    };

    // Serialize billing generation via FIFO Queue
    const createdBill = await billingQueue.enqueueTask(`bill_gen_${appointmentId}`, async () => {
      return await prisma.bill.create({
        data: {
          patientId: appointment.patientId,
          appointmentId: appointment.id,
          totalAmount: total,
          discount,
          paidAmount: 0,
          status: PaymentStatus.UNPAID,
          items: itemsData as any,
        },
        include: {
          patient: { include: { user: true } },
          appointment: {
            include: {
              doctor: { include: { user: true, department: true } },
            },
          },
        },
      });
    });

    // Audit Logging
    await logAudit({
      userId: currentUser.id,
      action: 'BILL_GENERATED',
      details: `Bill ${createdBill.id} for ${formatCurrency(total)} generated for patient ${appointment.patient.user.name} by ${currentUser.name}`,
    });

    // Asynchronous Notification to Patient
    await createNotificationHelper({
      userId: appointment.patient.userId,
      title: 'New Hospital Invoice Generated',
      message: `An invoice of ${formatCurrency(total)} has been generated for your appointment with Dr. ${appointment.doctor.user.name}.`,
    });

    return {
      success: true,
      message: 'Bill generated successfully.',
      data: toPlainObject(createdBill),
    };
  } catch (error: any) {
    console.error('Error in generateBillAction:', error);
    return {
      success: false,
      message: error.message || 'Failed to generate bill.',
    };
  }
}

/**
 * Record a payment against an existing bill
 */
export async function recordPaymentAction(input: RecordPaymentInput): Promise<ActionResponse<any>> {
  try {
    const currentUser = await requireAuth();

    const validated = recordPaymentSchema.safeParse(input);
    if (!validated.success) {
      return {
        success: false,
        message: 'Invalid payment parameters.',
        errors: validated.error.flatten().fieldErrors,
      };
    }

    const { billId, amount, method, transactionRef } = validated.data;

    // Fetch existing bill
    const bill = await prisma.bill.findUnique({
      where: { id: billId },
      include: {
        patient: { include: { user: true } },
        appointment: { include: { doctor: { include: { user: true } } } },
      },
    });

    if (!bill) {
      return { success: false, message: 'Bill record not found.' };
    }

    // Role check: Patients can only pay their own bills
    if (currentUser.role === Role.PATIENT && currentUser.patientId !== bill.patientId) {
      return { success: false, message: 'Unauthorized to make payment for another patient.' };
    }

    const currentTotal = Number(bill.totalAmount);
    const currentPaid = Number(bill.paidAmount);
    const remainingBalance = Math.round((currentTotal - currentPaid) * 100) / 100;

    // Business Rule & Validation: Payment cannot exceed outstanding balance
    const paymentModel = new PaymentModel({
      id: 'temp',
      billId,
      amount,
      method,
    });

    if (!paymentModel.isValidPayment(remainingBalance)) {
      return {
        success: false,
        message: `Invalid payment: Amount (${formatCurrency(amount)}) exceeds outstanding balance (${formatCurrency(remainingBalance)}).`,
      };
    }

    // Atomic transaction via FIFO billing queue with extended timeout for cloud databases
    const result = await billingQueue.enqueueTask(`pay_${billId}_${Date.now()}`, async () => {
      return await prisma.$transaction(
        async (tx) => {
          // Re-read with pessimistic balance check inside transaction
          const latestBill = await tx.bill.findUnique({ where: { id: billId } });
          if (!latestBill) throw new Error('Bill not found');

          const latestTotal = Number(latestBill.totalAmount);
          const latestPaid = Number(latestBill.paidAmount);
          const latestBalance = Math.round((latestTotal - latestPaid) * 100) / 100;

          if (amount > latestBalance + 0.001) {
            throw new Error(
              `Payment of ${formatCurrency(amount)} exceeds remaining balance (${formatCurrency(latestBalance)}).`
            );
          }

          const newPaid = Math.round((latestPaid + amount) * 100) / 100;
          const newStatus: PaymentStatus =
            newPaid >= latestTotal - 0.001 ? PaymentStatus.PAID : PaymentStatus.PARTIALLY_PAID;

          // 1. Create Payment record (lightweight write)
          const payment = await tx.payment.create({
            data: {
              billId,
              amount,
              method,
              transactionRef: transactionRef?.trim() || `TXN-${Date.now()}`,
            },
          });

          // 2. Update Bill status and paidAmount (fast update without nested includes)
          const updatedBill = await tx.bill.update({
            where: { id: billId },
            data: {
              paidAmount: newPaid,
              status: newStatus,
            },
          });

          return { payment, bill: updatedBill };
        },
        {
          maxWait: 15000,
          timeout: 30000,
        }
      );
    });

    // Populate full relations outside the ACID transaction block
    const populatedBill = await prisma.bill.findUnique({
      where: { id: billId },
      include: {
        patient: { include: { user: true } },
        payments: { orderBy: { receivedAt: 'desc' } },
        appointment: {
          include: {
            doctor: { include: { user: true, department: true } },
          },
        },
      },
    });

    // Audit Log
    await logAudit({
      userId: currentUser.id,
      action: 'PAYMENT_RECORDED',
      details: `Payment of ${formatCurrency(amount)} via ${method} recorded for Bill ${billId} (Status: ${result.bill.status}) by ${currentUser.name}`,
    });

    // Notification to Patient
    const rem = Math.max(0, Number(result.bill.totalAmount) - Number(result.bill.paidAmount));
    await createNotificationHelper({
      userId: bill.patient.userId,
      title: 'Payment Receipt Confirmed',
      message: `Payment of ${formatCurrency(amount)} received via ${paymentModel.getFormattedMethod()}. Remaining balance: ${formatCurrency(rem)}.`,
    });

    return {
      success: true,
      message: `Payment of ${formatCurrency(amount)} recorded successfully.`,
      data: toPlainObject({
        payment: result.payment,
        bill: populatedBill || result.bill,
      }),
    };
  } catch (error: any) {
    console.error('Error in recordPaymentAction:', error);
    return {
      success: false,
      message: error.message || 'Failed to record payment.',
    };
  }
}

/**
 * Fetch bills with filtering, search, and role isolation
 */
export async function getBillsAction(
  rawParams: Partial<BillFilterInput> = {}
): Promise<
  ActionResponse<{
    bills: Array<any>;
    total: number;
    page: number;
    totalPages: number;
    summary: {
      totalBilled: number;
      totalCollected: number;
      totalOutstanding: number;
    };
  }>
> {
  try {
    const currentUser = await requireAuth();

    const validated = billFilterSchema.parse(rawParams);
    const { status, patientId, date, search, page, limit } = validated;
    const skip = (page - 1) * limit;

    const where: Prisma.BillWhereInput = {};

    // Role-based filtering
    if (currentUser.role === Role.PATIENT) {
      where.patientId = currentUser.patientId || 'none';
    } else if (currentUser.role === Role.DOCTOR) {
      where.appointment = {
        doctorId: currentUser.doctorId || 'none',
      };
    } else {
      // Admin / Receptionist can filter by specific patient
      if (patientId && patientId !== 'ALL') {
        where.patientId = patientId;
      }
    }

    if (status && status !== 'ALL') {
      where.status = status as PaymentStatus;
    }

    if (date) {
      const [y, m, d] = date.split('-').map(Number);
      const start = new Date(Date.UTC(y, m - 1, d, 0, 0, 0));
      const end = new Date(Date.UTC(y, m - 1, d, 23, 59, 59));
      where.createdAt = { gte: start, lte: end };
    }

    if (search && search.trim() !== '') {
      const q = search.trim();
      where.OR = [
        { patient: { user: { name: { contains: q, mode: 'insensitive' } } } },
        { id: { contains: q, mode: 'insensitive' } },
        { appointment: { doctor: { user: { name: { contains: q, mode: 'insensitive' } } } } },
      ];
    }

    const [total, bills, aggregateData] = await Promise.all([
      prisma.bill.count({ where }),
      prisma.bill.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          patient: {
            include: {
              user: {
                select: { name: true, email: true, phone: true },
              },
            },
          },
          appointment: {
            include: {
              doctor: {
                include: {
                  user: { select: { name: true } },
                  department: { select: { name: true } },
                },
              },
            },
          },
          payments: {
            orderBy: { receivedAt: 'desc' },
          },
        },
      }),
      prisma.bill.aggregate({
        where,
        _sum: {
          totalAmount: true,
          paidAmount: true,
        },
      }),
    ]);

    const totalBilled = Number(aggregateData._sum.totalAmount || 0);
    const totalCollected = Number(aggregateData._sum.paidAmount || 0);
    const totalOutstanding = Math.max(0, totalBilled - totalCollected);

    return {
      success: true,
      data: {
        bills: toPlainObject(bills),
        total,
        page,
        totalPages: Math.ceil(total / limit),
        summary: {
          totalBilled: Math.round(totalBilled * 100) / 100,
          totalCollected: Math.round(totalCollected * 100) / 100,
          totalOutstanding: Math.round(totalOutstanding * 100) / 100,
        },
      },
    };
  } catch (error: any) {
    console.error('Error in getBillsAction:', error);
    return {
      success: false,
      message: error.message || 'Failed to fetch bills.',
    };
  }
}

/**
 * Fetch a single bill with full details for printable/downloadable invoice
 */
export async function getBillByIdAction(billId: string): Promise<ActionResponse<any>> {
  try {
    const currentUser = await requireAuth();

    const bill = await prisma.bill.findUnique({
      where: { id: billId },
      include: {
        patient: {
          include: {
            user: { select: { name: true, email: true, phone: true } },
          },
        },
        appointment: {
          include: {
            doctor: {
              include: {
                user: { select: { name: true, email: true } },
                department: { select: { name: true } },
              },
            },
            prescription: true,
          },
        },
        payments: {
          orderBy: { receivedAt: 'asc' },
        },
      },
    });

    if (!bill) {
      return { success: false, message: 'Bill not found.' };
    }

    // Role check: Patient can only view their own bill
    if (currentUser.role === Role.PATIENT && currentUser.patientId !== bill.patientId) {
      return { success: false, message: 'Access denied to this invoice.' };
    }

    const domainModel = new BillModel({
      id: bill.id,
      patientId: bill.patientId,
      appointmentId: bill.appointmentId,
      totalAmount: Number(bill.totalAmount),
      discount: Number(bill.discount),
      paidAmount: Number(bill.paidAmount),
      status: bill.status,
      items: bill.items,
      createdAt: bill.createdAt,
    });

    return {
      success: true,
      data: {
        ...toPlainObject(bill),
        balance: domainModel.getBalance(),
        isFullyPaid: domainModel.isFullyPaid(),
        isPartiallyPaid: domainModel.isPartiallyPaid(),
      },
    };
  } catch (error: any) {
    console.error('Error in getBillByIdAction:', error);
    return {
      success: false,
      message: error.message || 'Failed to load invoice.',
    };
  }
}
