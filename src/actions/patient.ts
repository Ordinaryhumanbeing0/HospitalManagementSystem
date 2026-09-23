'use server';

import bcrypt from 'bcryptjs';
import { prisma } from '@/lib/prisma';
import {
  patientProfileSchema,
  updatePatientSchema,
  patientSearchSchema,
  PatientProfileInput,
  UpdatePatientInput,
  PatientSearchInput,
} from '@/lib/validations/patient';
import { requireAuth, requireRole } from '@/lib/auth/rbac';
import { logAudit } from '@/lib/auth/audit';
import { ActionResponse } from '@/types';
import { Prisma, Role } from '@prisma/client';
import { toPlainObject } from '@/lib/utils';

export async function getPatientsAction(
  rawParams: Partial<PatientSearchInput> = {}
): Promise<
  ActionResponse<{
    patients: Array<any>;
    total: number;
    page: number;
    totalPages: number;
  }>
> {
  try {
    const currentUser = await requireRole([Role.ADMIN, Role.DOCTOR, Role.RECEPTIONIST]);

    const validated = patientSearchSchema.parse(rawParams);
    const { query, bloodGroup, gender, page, limit } = validated;
    const skip = (page - 1) * limit;

    const where: Prisma.PatientWhereInput = {};

    if (query && query.trim() !== '') {
      const q = query.trim();
      where.OR = [
        { id: { contains: q, mode: 'insensitive' } },
        { user: { name: { contains: q, mode: 'insensitive' } } },
        { user: { email: { contains: q, mode: 'insensitive' } } },
        { user: { phone: { contains: q, mode: 'insensitive' } } },
        { address: { contains: q, mode: 'insensitive' } },
      ];
    }

    if (bloodGroup && bloodGroup !== 'ALL') {
      where.bloodGroup = bloodGroup;
    }

    if (gender && gender !== 'ALL') {
      where.gender = gender;
    }

    const [total, patients] = await Promise.all([
      prisma.patient.count({ where }),
      prisma.patient.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              phone: true,
              role: true,
              createdAt: true,
            },
          },
          _count: {
            select: {
              appointments: true,
              medicalReports: true,
              prescriptions: true,
              bills: true,
            },
          },
        },
      }),
    ]);

    return {
      success: true,
      data: {
        patients: toPlainObject(patients),
        total,
        page,
        totalPages: Math.ceil(total / limit),
      },
    };
  } catch (error: any) {
    console.error('Error in getPatientsAction:', error);
    return {
      success: false,
      message: error.message || 'Failed to fetch patient records.',
    };
  }
}

export async function getPatientByIdAction(id: string): Promise<ActionResponse<any>> {
  try {
    const currentUser = await requireAuth();

    const patient = await prisma.patient.findUnique({
      where: { id },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
            role: true,
            createdAt: true,
          },
        },
        appointments: {
          take: 5,
          orderBy: { appointmentDate: 'desc' },
          include: {
            doctor: {
              include: {
                user: { select: { name: true } },
                department: { select: { name: true } },
              },
            },
          },
        },
        medicalReports: {
          take: 5,
          orderBy: { createdAt: 'desc' },
        },
        prescriptions: {
          take: 5,
          orderBy: { createdAt: 'desc' },
        },
        bills: {
          take: 5,
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!patient) {
      return { success: false, message: 'Patient record not found.' };
    }

    // Permission guard: Patients can only view their own record unless staff/admin/doctor
    if (currentUser.role === Role.PATIENT && currentUser.patientId !== patient.id) {
      return { success: false, message: 'Access denied to this patient profile.' };
    }

    return { success: true, data: toPlainObject(patient) };
  } catch (error: any) {
    console.error('Error in getPatientByIdAction:', error);
    return { success: false, message: error.message || 'Failed to retrieve patient profile.' };
  }
}

export async function createPatientAction(
  input: PatientProfileInput & { password?: string }
): Promise<ActionResponse<any>> {
  try {
    const currentUser = await requireRole([Role.ADMIN, Role.RECEPTIONIST]);

    const validated = patientProfileSchema.safeParse(input);
    if (!validated.success) {
      return {
        success: false,
        message: 'Invalid patient profile data.',
        errors: validated.error.flatten().fieldErrors,
      };
    }

    const data = validated.data;
    const existing = await prisma.user.findUnique({
      where: { email: data.email.toLowerCase() },
    });

    if (existing) {
      return { success: false, message: 'A user with this email already exists.' };
    }

    const defaultPassword = input.password || 'Patient@12345';
    const passwordHash = await bcrypt.hash(defaultPassword, 10);

    const result = await prisma.$transaction(async (tx) => {
      const newUser = await tx.user.create({
        data: {
          name: data.name,
          email: data.email.toLowerCase(),
          phone: data.phone,
          passwordHash,
          role: Role.PATIENT,
        },
      });

      const newPatient = await tx.patient.create({
        data: {
          userId: newUser.id,
          dateOfBirth: new Date(data.dateOfBirth),
          gender: data.gender,
          bloodGroup: data.bloodGroup || null,
          address: data.address || null,
          emergencyContact: data.emergencyContact || null,
          medicalHistorySummary: data.medicalHistorySummary || null,
        },
        include: {
          user: true,
        },
      });

      return newPatient;
    }, {
      maxWait: 15000,
      timeout: 30000,
    });

    await logAudit({
      userId: currentUser.id,
      action: 'PATIENT_CREATED_BY_STAFF',
      details: `Patient ${result.user.name} registered by ${currentUser.name} (${currentUser.role})`,
    });

    return {
      success: true,
      message: 'Patient registered successfully.',
      data: toPlainObject(result),
    };
  } catch (error: any) {
    console.error('Error in createPatientAction:', error);
    return { success: false, message: error.message || 'Failed to create patient profile.' };
  }
}

export async function updatePatientAction(input: UpdatePatientInput): Promise<ActionResponse<any>> {
  try {
    const currentUser = await requireAuth();

    const validated = updatePatientSchema.safeParse(input);
    if (!validated.success) {
      return {
        success: false,
        message: 'Validation failed for update data.',
        errors: validated.error.flatten().fieldErrors,
      };
    }

    const { id, name, email, phone, dateOfBirth, gender, bloodGroup, address, emergencyContact, medicalHistorySummary } =
      validated.data;

    const patient = await prisma.patient.findUnique({
      where: { id },
      include: { user: true },
    });

    if (!patient) {
      return { success: false, message: 'Patient not found.' };
    }

    // Permission guard
    if (
      currentUser.role === Role.PATIENT &&
      currentUser.patientId !== patient.id
    ) {
      return { success: false, message: 'Unauthorized to modify this profile.' };
    }

    const updated = await prisma.$transaction(async (tx) => {
      if (name || phone || email) {
        await tx.user.update({
          where: { id: patient.userId },
          data: {
            ...(name && { name }),
            ...(phone && { phone }),
            ...(email && { email: email.toLowerCase() }),
          },
        });
      }

      return await tx.patient.update({
        where: { id },
        data: {
          ...(dateOfBirth && { dateOfBirth: new Date(dateOfBirth) }),
          ...(gender && { gender }),
          ...(bloodGroup !== undefined && { bloodGroup }),
          ...(address !== undefined && { address }),
          ...(emergencyContact !== undefined && { emergencyContact }),
          ...(medicalHistorySummary !== undefined && { medicalHistorySummary }),
        },
        include: {
          user: true,
        },
      });
    }, {
      maxWait: 15000,
      timeout: 30000,
    });

    await logAudit({
      userId: currentUser.id,
      action: 'PATIENT_UPDATED',
      details: `Patient profile for ${updated.user.name} updated by ${currentUser.name}`,
    });

    return {
      success: true,
      message: 'Patient profile updated successfully.',
      data: toPlainObject(updated),
    };
  } catch (error: any) {
    console.error('Error in updatePatientAction:', error);
    return { success: false, message: error.message || 'Failed to update patient profile.' };
  }
}

export async function deletePatientAction(id: string): Promise<ActionResponse<void>> {
  try {
    const currentUser = await requireRole([Role.ADMIN]);

    const patient = await prisma.patient.findUnique({
      where: { id },
      include: { user: true },
    });

    if (!patient) {
      return { success: false, message: 'Patient not found.' };
    }

    await prisma.user.delete({
      where: { id: patient.userId },
    });

    await logAudit({
      userId: currentUser.id,
      action: 'PATIENT_DELETED',
      details: `Patient ${patient.user.name} (${patient.id}) deleted by Admin ${currentUser.name}`,
    });

    return { success: true, message: 'Patient profile removed successfully.' };
  } catch (error: any) {
    console.error('Error in deletePatientAction:', error);
    return { success: false, message: error.message || 'Failed to delete patient profile.' };
  }
}

export async function getPatientFullDossierAction(id: string): Promise<ActionResponse<any>> {
  try {
    const currentUser = await requireAuth();

    const patient = await prisma.patient.findUnique({
      where: { id },
      include: {
        user: true,
        appointments: {
          orderBy: { appointmentDate: 'desc' },
          include: {
            doctor: {
              include: {
                user: { select: { name: true, email: true, phone: true } },
                department: { select: { name: true } },
              },
            },
            prescription: true,
            bill: { include: { payments: true } },
          },
        },
        medicalReports: {
          orderBy: { createdAt: 'desc' },
          include: {
            doctor: {
              include: { user: { select: { name: true } } },
            },
          },
        },
        prescriptions: {
          orderBy: { createdAt: 'desc' },
          include: {
            doctor: {
              include: {
                user: { select: { name: true } },
                department: { select: { name: true } },
              },
            },
          },
        },
        bills: {
          orderBy: { createdAt: 'desc' },
          include: {
            payments: { orderBy: { receivedAt: 'desc' } },
            appointment: {
              include: {
                doctor: { include: { user: { select: { name: true } } } },
              },
            },
          },
        },
      },
    });

    if (!patient) {
      return { success: false, message: 'Patient record not found.' };
    }

    if (currentUser.role === Role.PATIENT && currentUser.patientId !== patient.id) {
      return { success: false, message: 'Access denied.' };
    }

    return {
      success: true,
      data: toPlainObject(patient),
    };
  } catch (error: any) {
    console.error('Error in getPatientFullDossierAction:', error);
    return { success: false, message: error.message || 'Failed to retrieve patient dossier.' };
  }
}

export async function togglePatientActiveAction(id: string): Promise<ActionResponse<any>> {
  try {
    const currentUser = await requireRole([Role.ADMIN]);

    const patient = await prisma.patient.findUnique({
      where: { id },
      include: { user: true },
    });

    if (!patient) {
      return { success: false, message: 'Patient not found.' };
    }

    const nextState = !patient.user.isActive;

    await prisma.user.update({
      where: { id: patient.userId },
      data: { isActive: nextState },
    });

    await logAudit({
      userId: currentUser.id,
      action: nextState ? 'PATIENT_ACTIVATED' : 'PATIENT_DEACTIVATED',
      details: `Patient ${patient.user.name} (${patient.id}) account was ${nextState ? 'reactivated' : 'deactivated'} by Admin ${currentUser.name}`,
    });

    return {
      success: true,
      message: `Patient account is now ${nextState ? 'Active' : 'Deactivated'}.`,
      data: { isActive: nextState },
    };
  } catch (error: any) {
    return { success: false, message: error.message || 'Failed to toggle patient status.' };
  }
}
