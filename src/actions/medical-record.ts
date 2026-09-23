'use server';

import { prisma } from '@/lib/prisma';
import {
  createPrescriptionSchema,
  uploadMedicalReportSchema,
  CreatePrescriptionInput,
  UploadMedicalReportInput,
} from '@/lib/validations/medical-record';
import { requireAuth, requireRole } from '@/lib/auth/rbac';
import { logAudit } from '@/lib/auth/audit';
import { ActionResponse } from '@/types';
import { AppointmentStatus, Role } from '@prisma/client';
import { toPlainObject } from '@/lib/utils';
import { createNotificationHelper } from '@/actions/notification';

import { formatCurrency } from '@/lib/config/currency';
import { BillItem, BillItemsData } from '@/types';
import { PaymentStatus } from '@prisma/client';

export async function createPrescriptionAction(
  input: CreatePrescriptionInput
): Promise<ActionResponse<any>> {
  try {
    const currentUser = await requireRole([Role.DOCTOR, Role.ADMIN]);

    const validated = createPrescriptionSchema.safeParse(input);
    if (!validated.success) {
      return {
        success: false,
        message: 'Invalid prescription details.',
        errors: validated.error.flatten().fieldErrors,
      };
    }

    const { appointmentId, patientId, doctorId, diagnosis, symptoms, notes, followUpDate, medications } =
      validated.data;

    // Doctor ownership check
    if (currentUser.role === Role.DOCTOR && currentUser.doctorId !== doctorId) {
      return { success: false, message: 'Unauthorized to issue prescriptions for another physician.' };
    }

    const appointment = await prisma.appointment.findUnique({
      where: { id: appointmentId },
      include: {
        patient: { include: { user: true } },
        doctor: { include: { user: true, department: true } },
        bill: true,
      },
    });

    if (!appointment) {
      return { success: false, message: 'Appointment not found.' };
    }

    if (currentUser.role === Role.DOCTOR && appointment.doctorId !== currentUser.doctorId) {
      return { success: false, message: 'Unauthorized: You are not assigned to this appointment.' };
    }

    if (appointment.status === AppointmentStatus.CANCELLED) {
      return { success: false, message: 'Cannot write a prescription for a cancelled appointment.' };
    }

    const followUpDateObj = followUpDate
      ? new Date(Date.UTC(...(followUpDate.split('-').map(Number) as [number, number, number]).map((n, i) => i === 1 ? n - 1 : n) as [number, number, number]))
      : null;

    // Atomic transaction: Create/Upsert prescription, mark appointment COMPLETED, and auto-generate Bill
    const { prescription, createdBill } = await prisma.$transaction(
      async (tx) => {
        // 1. Upsert Prescription
        const rx = await tx.prescription.upsert({
          where: { appointmentId },
          update: {
            diagnosis: diagnosis.trim(),
            symptoms: symptoms?.trim() || null,
            notes: notes?.trim() || null,
            followUpDate: followUpDateObj,
            medications,
          },
          create: {
            appointmentId,
            patientId: appointment.patientId,
            doctorId: appointment.doctorId,
            diagnosis: diagnosis.trim(),
            symptoms: symptoms?.trim() || null,
            notes: notes?.trim() || null,
            followUpDate: followUpDateObj,
            medications,
          },
          include: {
            patient: { include: { user: true } },
            doctor: { include: { user: true, department: true } },
          },
        });

        // 2. Mark Appointment as COMPLETED
        await tx.appointment.update({
          where: { id: appointmentId },
          data: { status: AppointmentStatus.COMPLETED },
        });

        // 3. Auto-generate Hospital Bill if none exists yet
        let bill = appointment.bill;
        if (!bill) {
          const items: BillItem[] = [];

          // Consultation fee
          const consultFee = Number(appointment.doctor.consultationFee) || 800.0;
          items.push({
            title: `Specialist Clinical Consultation - Dr. ${appointment.doctor.user.name} (${appointment.doctor.department.name})`,
            category: 'CONSULTATION',
            cost: consultFee,
            quantity: 1,
            total: consultFee,
          });

          // Medication items
          if (Array.isArray(medications)) {
            medications.forEach((m) => {
              const medPrice = 250.0;
              items.push({
                title: `Pharmacy Rx: ${m.name} (${m.dosage})`,
                category: 'MEDICATION',
                cost: medPrice,
                quantity: 1,
                total: medPrice,
              });
            });
          }

          const subtotal = Math.round(items.reduce((acc, it) => acc + it.total, 0) * 100) / 100;
          const tax = Math.round(subtotal * 0.05 * 100) / 100; // 5% GST
          const total = Math.round((subtotal + tax) * 100) / 100;

          const itemsData: BillItemsData = {
            items,
            subtotal,
            discount: 0,
            discountRate: 0,
            tax,
            taxRate: 5,
            total,
          };

          bill = await tx.bill.create({
            data: {
              patientId: appointment.patientId,
              appointmentId: appointment.id,
              totalAmount: total,
              discount: 0,
              paidAmount: 0,
              status: PaymentStatus.UNPAID,
              items: itemsData as any,
            },
          });
        }

        return { prescription: rx, createdBill: bill };
      },
      {
        maxWait: 15000,
        timeout: 30000,
      }
    );

    const billTotal = createdBill ? Number(createdBill.totalAmount) : 0;

    await logAudit({
      userId: currentUser.id,
      action: 'CONSULTATION_COMPLETED',
      details: `Consultation completed for patient ${appointment.patient.user.name} by Dr. ${appointment.doctor.user.name}. Bill generated: ${formatCurrency(billTotal)}. Diagnosis: ${diagnosis}`,
    });

    // Notify Patient of completion & bill
    await createNotificationHelper({
      userId: appointment.patient.userId,
      title: 'Consultation Completed & Invoice Generated',
      message: `Dr. ${appointment.doctor.user.name} completed your consultation. Your digital prescription is ready, and invoice #${createdBill?.id?.slice(-6) || 'NEW'} (${formatCurrency(billTotal)}) has been generated.`,
    });

    // Notify Doctor
    await createNotificationHelper({
      userId: appointment.doctor.userId,
      title: 'Consultation Finalized',
      message: `Consultation for ${appointment.patient.user.name} recorded and marked completed.`,
    });

    return {
      success: true,
      message: `Consultation finalized! Prescription recorded and invoice (${formatCurrency(billTotal)}) generated.`,
      data: {
        prescription: toPlainObject(prescription),
        bill: toPlainObject(createdBill),
      },
    };
  } catch (error: any) {
    console.error('Error in createPrescriptionAction:', error);
    return { success: false, message: error.message || 'Failed to complete consultation and issue prescription.' };
  }
}

// Alias for clinical completeness
export const completeConsultationAction = createPrescriptionAction;

export async function uploadMedicalReportAction(
  input: UploadMedicalReportInput
): Promise<ActionResponse<any>> {
  try {
    const currentUser = await requireAuth();

    const validated = uploadMedicalReportSchema.safeParse(input);
    if (!validated.success) {
      return {
        success: false,
        message: 'Invalid medical report details.',
        errors: validated.error.flatten().fieldErrors,
      };
    }

    const { patientId, doctorId, title, reportType, fileUrl, notes } = validated.data;

    // RBAC: Patient can only upload to own record
    if (currentUser.role === Role.PATIENT && currentUser.patientId !== patientId) {
      return { success: false, message: 'Unauthorized to upload reports to this patient record.' };
    }

    if (currentUser.role === Role.DOCTOR) {
      if (!currentUser.doctorId) {
        return { success: false, message: 'Doctor profile not found.' };
      }
      const relationship = await prisma.appointment.findFirst({
        where: {
          doctorId: currentUser.doctorId,
          patientId: patientId,
        },
      });
      if (!relationship) {
        return { success: false, message: 'Unauthorized doctor: No clinical relationship with this patient.' };
      }
    }

    const report = await prisma.medicalReport.create({
      data: {
        patientId,
        doctorId: doctorId || (currentUser.role === Role.DOCTOR ? currentUser.doctorId : null),
        title: title.trim(),
        reportType,
        fileUrl,
        notes: notes?.trim() || null,
      },
      include: {
        patient: { include: { user: true } },
        doctor: { include: { user: true } },
      },
    });

    await logAudit({
      userId: currentUser.id,
      action: 'MEDICAL_REPORT_UPLOADED',
      details: `${reportType} report titled '${title}' uploaded for patient ${report.patient.user.name} by ${currentUser.name}`,
    });

    // Notify Patient
    await createNotificationHelper({
      userId: report.patient.userId,
      title: 'Diagnostic Lab Report Uploaded',
      message: `A new ${reportType} report titled '${title}' has been uploaded to your health records.`,
    });

    return {
      success: true,
      message: 'Medical report uploaded successfully.',
      data: toPlainObject(report),
    };
  } catch (error: any) {
    console.error('Error in uploadMedicalReportAction:', error);
    return { success: false, message: error.message || 'Failed to upload medical report.' };
  }
}

export async function getPatientMedicalHistoryAction(patientId: string): Promise<
  ActionResponse<{
    patient: any;
    appointments: any[];
    prescriptions: any[];
    reports: any[];
    timeline: any[];
  }>
> {
  try {
    const currentUser = await requireAuth();

    if (currentUser.role === Role.PATIENT && currentUser.patientId !== patientId) {
      return { success: false, message: 'Access denied to this clinical history.' };
    }

    if (currentUser.role === Role.DOCTOR) {
      if (!currentUser.doctorId) {
        return { success: false, message: 'Doctor profile not found.' };
      }
      const relationship = await prisma.appointment.findFirst({
        where: {
          doctorId: currentUser.doctorId,
          patientId: patientId,
        },
      });
      if (!relationship) {
        return { success: false, message: 'Unauthorized doctor: No clinical relationship with this patient.' };
      }
    }

    const patient = await prisma.patient.findUnique({
      where: { id: patientId },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
            createdAt: true,
          },
        },
      },
    });

    if (!patient) {
      return { success: false, message: 'Patient not found.' };
    }

    const [appointments, prescriptions, reports] = await Promise.all([
      prisma.appointment.findMany({
        where: { patientId },
        orderBy: { appointmentDate: 'desc' },
        include: {
          doctor: {
            include: {
              user: { select: { name: true, email: true } },
              department: { select: { name: true } },
            },
          },
          prescription: true,
        },
      }),
      prisma.prescription.findMany({
        where: { patientId },
        orderBy: { createdAt: 'desc' },
        include: {
          doctor: {
            include: {
              user: { select: { name: true } },
              department: { select: { name: true } },
            },
          },
          appointment: true,
        },
      }),
      prisma.medicalReport.findMany({
        where: { patientId },
        orderBy: { createdAt: 'desc' },
        include: {
          doctor: {
            include: {
              user: { select: { name: true } },
            },
          },
        },
      }),
    ]);

    // Build unified chronological timeline events
    const timeline: any[] = [];

    prescriptions.forEach((rx) => {
      timeline.push({
        id: `rx-${rx.id}`,
        type: 'PRESCRIPTION',
        title: `Prescription: ${rx.diagnosis}`,
        subtitle: `Issued by Dr. ${rx.doctor.user.name} (${rx.doctor.department.name})`,
        date: rx.createdAt,
        data: rx,
      });
    });

    reports.forEach((rep) => {
      timeline.push({
        id: `rep-${rep.id}`,
        type: 'LAB_REPORT',
        title: `Diagnostic Lab: ${rep.title}`,
        subtitle: `${rep.reportType} ${rep.doctor ? `• Ordered by Dr. ${rep.doctor.user.name}` : ''}`,
        date: rep.createdAt,
        data: rep,
      });
    });

    appointments.forEach((appt) => {
      timeline.push({
        id: `appt-${appt.id}`,
        type: 'CONSULTATION',
        title: `Consultation (${appt.status})`,
        subtitle: `Dr. ${appt.doctor.user.name} (${appt.doctor.department.name}) at ${appt.timeSlot}`,
        date: appt.appointmentDate,
        data: appt,
      });
    });

    // Sort timeline descending by date
    timeline.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    return {
      success: true,
      data: {
        patient: toPlainObject(patient),
        appointments: toPlainObject(appointments),
        prescriptions: toPlainObject(prescriptions),
        reports: toPlainObject(reports),
        timeline: toPlainObject(timeline),
      },
    };
  } catch (error: any) {
    console.error('Error in getPatientMedicalHistoryAction:', error);
    return { success: false, message: error.message || 'Failed to retrieve patient medical history.' };
  }
}
