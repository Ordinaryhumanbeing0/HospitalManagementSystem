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

    const { appointmentId, patientId, doctorId, diagnosis, notes, medications } = validated.data;

    // Doctor ownership check
    if (currentUser.role === Role.DOCTOR && currentUser.doctorId !== doctorId) {
      return { success: false, message: 'Unauthorized to issue prescriptions for another physician.' };
    }

    const appointment = await prisma.appointment.findUnique({
      where: { id: appointmentId },
      include: {
        patient: { include: { user: true } },
        doctor: { include: { user: true } },
      },
    });

    if (!appointment) {
      return { success: false, message: 'Appointment not found.' };
    }

    if (appointment.status === AppointmentStatus.CANCELLED) {
      return { success: false, message: 'Cannot write a prescription for a cancelled appointment.' };
    }

    // Atomic transaction: Create/Upsert prescription and mark appointment COMPLETED
    const result = await prisma.$transaction(async (tx) => {
      const prescription = await tx.prescription.upsert({
        where: { appointmentId },
        update: {
          diagnosis: diagnosis.trim(),
          notes: notes?.trim() || null,
          medications,
        },
        create: {
          appointmentId,
          patientId,
          doctorId,
          diagnosis: diagnosis.trim(),
          notes: notes?.trim() || null,
          medications,
        },
        include: {
          patient: { include: { user: true } },
          doctor: { include: { user: true, department: true } },
        },
      });

      await tx.appointment.update({
        where: { id: appointmentId },
        data: { status: AppointmentStatus.COMPLETED },
      });

      return prescription;
    });

    await logAudit({
      userId: currentUser.id,
      action: 'PRESCRIPTION_ISSUED',
      details: `Prescription issued for patient ${appointment.patient.user.name} by Dr. ${appointment.doctor.user.name}. Diagnosis: ${diagnosis}`,
    });

    return {
      success: true,
      message: 'Prescription recorded and consultation marked as completed.',
      data: toPlainObject(result),
    };
  } catch (error: any) {
    console.error('Error in createPrescriptionAction:', error);
    return { success: false, message: error.message || 'Failed to issue prescription.' };
  }
}

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
