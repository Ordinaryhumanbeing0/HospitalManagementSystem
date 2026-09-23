'use server';

import bcrypt from 'bcryptjs';
import { prisma } from '@/lib/prisma';
import {
  createDoctorSchema,
  updateDoctorSchema,
  doctorSearchSchema,
  doctorScheduleItemSchema,
  doctorLeaveSchema,
  CreateDoctorInput,
  UpdateDoctorInput,
  DoctorSearchInput,
  DoctorScheduleItemInput,
  DoctorLeaveInput,
} from '@/lib/validations/doctor';
import { requireRole, requireAuth } from '@/lib/auth/rbac';
import { logAudit } from '@/lib/auth/audit';
import { createNotificationHelper } from '@/actions/notification';
import { ActionResponse } from '@/types';
import { AppointmentStatus, Prisma, Role } from '@prisma/client';
import { z } from 'zod';
import { toPlainObject } from '@/lib/utils';

export async function getDoctorsAction(
  rawParams: Partial<DoctorSearchInput> = {}
): Promise<
  ActionResponse<{
    doctors: Array<any>;
    total: number;
    page: number;
    totalPages: number;
  }>
> {
  try {
    const validated = doctorSearchSchema.parse(rawParams);
    const { departmentId, search, page, limit } = validated;
    const skip = (page - 1) * limit;

    const where: Prisma.DoctorWhereInput = {};

    if (departmentId && departmentId !== 'ALL') {
      where.departmentId = departmentId;
    }

    if (search && search.trim() !== '') {
      const q = search.trim();
      where.OR = [
        { user: { name: { contains: q, mode: 'insensitive' } } },
        { user: { email: { contains: q, mode: 'insensitive' } } },
        { specialization: { contains: q, mode: 'insensitive' } },
        { qualification: { contains: q, mode: 'insensitive' } },
      ];
    }

    const [total, doctors] = await Promise.all([
      prisma.doctor.count({ where }),
      prisma.doctor.findMany({
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
            },
          },
          department: {
            select: {
              id: true,
              name: true,
            },
          },
          schedules: {
            where: { isActive: true },
            orderBy: { dayOfWeek: 'asc' },
          },
          _count: {
            select: {
              appointments: true,
              prescriptions: true,
            },
          },
        },
      }),
    ]);

    return {
      success: true,
      data: {
        doctors: toPlainObject(doctors),
        total,
        page,
        totalPages: Math.ceil(total / limit),
      },
    };
  } catch (error: any) {
    console.error('Error in getDoctorsAction:', error);
    return {
      success: false,
      message: error.message || 'Failed to fetch doctors.',
    };
  }
}

export async function getDoctorByIdAction(id: string): Promise<ActionResponse<any>> {
  try {
    const doctor = await prisma.doctor.findUnique({
      where: { id },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
          },
        },
        department: true,
        schedules: {
          orderBy: { dayOfWeek: 'asc' },
        },
      },
    });

    if (!doctor) {
      return { success: false, message: 'Doctor not found.' };
    }

    return { success: true, data: toPlainObject(doctor) };
  } catch (error: any) {
    console.error('Error in getDoctorByIdAction:', error);
    return { success: false, message: error.message || 'Failed to retrieve doctor details.' };
  }
}

export async function createDoctorAction(input: CreateDoctorInput): Promise<ActionResponse<any>> {
  try {
    const currentUser = await requireRole([Role.ADMIN]);

    const validated = createDoctorSchema.safeParse(input);
    if (!validated.success) {
      return {
        success: false,
        message: 'Invalid doctor details.',
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

    const passwordHash = await bcrypt.hash(data.password, 10);

    const result = await prisma.$transaction(async (tx) => {
      const newUser = await tx.user.create({
        data: {
          name: data.name,
          email: data.email.toLowerCase(),
          phone: data.phone,
          passwordHash,
          role: Role.DOCTOR,
        },
      });

      const newDoctor = await tx.doctor.create({
        data: {
          userId: newUser.id,
          departmentId: data.departmentId,
          specialization: data.specialization,
          qualification: data.qualification,
          consultationFee: data.consultationFee,
          schedules:
            data.schedules && data.schedules.length > 0
              ? {
                  create: data.schedules.map((s) => ({
                    dayOfWeek: s.dayOfWeek,
                    startTime: s.startTime,
                    endTime: s.endTime,
                    slotDuration: s.slotDuration || 30,
                    isActive: s.isActive ?? true,
                  })),
                }
              : undefined,
        },
        include: {
          user: true,
          department: true,
          schedules: true,
        },
      });

      return newDoctor;
    }, {
      maxWait: 15000,
      timeout: 30000,
    });

    await logAudit({
      userId: currentUser.id,
      action: 'DOCTOR_CREATED',
      details: `Doctor ${result.user.name} created by Admin ${currentUser.name}`,
    });

    return {
      success: true,
      message: 'Doctor profile created successfully.',
      data: toPlainObject(result),
    };
  } catch (error: any) {
    console.error('Error in createDoctorAction:', error);
    return { success: false, message: error.message || 'Failed to create doctor.' };
  }
}

export async function updateDoctorAction(input: UpdateDoctorInput): Promise<ActionResponse<any>> {
  try {
    const currentUser = await requireAuth();

    const validated = updateDoctorSchema.safeParse(input);
    if (!validated.success) {
      return {
        success: false,
        message: 'Invalid update details.',
        errors: validated.error.flatten().fieldErrors,
      };
    }

    const { id, name, phone, departmentId, specialization, qualification, consultationFee } = validated.data;

    const doctor = await prisma.doctor.findUnique({
      where: { id },
      include: { user: true },
    });

    if (!doctor) {
      return { success: false, message: 'Doctor not found.' };
    }

    // Role check: Only admin or the doctor themselves can update
    if (currentUser.role !== Role.ADMIN && currentUser.doctorId !== doctor.id) {
      return { success: false, message: 'Unauthorized to update this doctor profile.' };
    }

    const updated = await prisma.$transaction(async (tx) => {
      if (name || phone) {
        await tx.user.update({
          where: { id: doctor.userId },
          data: {
            ...(name && { name }),
            ...(phone && { phone }),
          },
        });
      }

      return await tx.doctor.update({
        where: { id },
        data: {
          ...(departmentId && { departmentId }),
          ...(specialization && { specialization }),
          ...(qualification && { qualification }),
          ...(consultationFee !== undefined && { consultationFee }),
        },
        include: {
          user: true,
          department: true,
        },
      });
    }, {
      maxWait: 15000,
      timeout: 30000,
    });

    await logAudit({
      userId: currentUser.id,
      action: 'DOCTOR_UPDATED',
      details: `Doctor ${updated.user.name} profile updated by ${currentUser.name}`,
    });

    return {
      success: true,
      message: 'Doctor updated successfully.',
      data: toPlainObject(updated),
    };
  } catch (error: any) {
    console.error('Error in updateDoctorAction:', error);
    return { success: false, message: error.message || 'Failed to update doctor profile.' };
  }
}

export async function updateDoctorScheduleAction(
  doctorId: string,
  schedules: DoctorScheduleItemInput[]
): Promise<ActionResponse<any>> {
  try {
    const currentUser = await requireAuth();

    const doctor = await prisma.doctor.findUnique({
      where: { id: doctorId },
      include: { user: true },
    });

    if (!doctor) {
      return { success: false, message: 'Doctor not found.' };
    }

    if (currentUser.role !== Role.ADMIN && currentUser.doctorId !== doctor.id) {
      return { success: false, message: 'Unauthorized to update schedules for this doctor.' };
    }

    const validatedSchedules = z.array(doctorScheduleItemSchema).parse(schedules);

    await prisma.$transaction(async (tx) => {
      // Delete old schedules
      await tx.doctorSchedule.deleteMany({
        where: { doctorId },
      });

      // Insert new schedules
      if (validatedSchedules.length > 0) {
        await tx.doctorSchedule.createMany({
          data: validatedSchedules.map((s) => ({
            doctorId,
            dayOfWeek: s.dayOfWeek,
            startTime: s.startTime,
            endTime: s.endTime,
            breakStartTime: s.breakStartTime || null,
            breakEndTime: s.breakEndTime || null,
            slotDuration: s.slotDuration,
            isActive: s.isActive,
          })),
        });
      }
    }, {
      maxWait: 15000,
      timeout: 30000,
    });

    await logAudit({
      userId: currentUser.id,
      action: 'DOCTOR_SCHEDULE_UPDATED',
      details: `Weekly schedule updated for Doctor ${doctor.user.name}`,
    });

    return { success: true, message: 'Doctor schedule updated successfully.' };
  } catch (error: any) {
    console.error('Error in updateDoctorScheduleAction:', error);
    return { success: false, message: error.message || 'Failed to update schedule.' };
  }
}

export async function toggleDoctorActiveAction(id: string): Promise<ActionResponse<any>> {
  try {
    const currentUser = await requireRole([Role.ADMIN]);

    const doctor = await prisma.doctor.findUnique({
      where: { id },
      include: { user: true },
    });

    if (!doctor) {
      return { success: false, message: 'Doctor not found.' };
    }

    const nextState = !doctor.isActive;

    await prisma.$transaction([
      prisma.doctor.update({
        where: { id },
        data: { isActive: nextState },
      }),
      prisma.user.update({
        where: { id: doctor.userId },
        data: { isActive: nextState },
      }),
    ]);

    await logAudit({
      userId: currentUser.id,
      action: nextState ? 'DOCTOR_ACTIVATED' : 'DOCTOR_DEACTIVATED',
      details: `Doctor ${doctor.user.name} was ${nextState ? 'reactivated' : 'deactivated'} by Admin ${currentUser.name}`,
    });

    return {
      success: true,
      message: `Doctor ${doctor.user.name} is now ${nextState ? 'Active' : 'Inactive'}.`,
      data: { isActive: nextState },
    };
  } catch (error: any) {
    console.error('Error in toggleDoctorActiveAction:', error);
    return { success: false, message: error.message || 'Failed to toggle doctor status.' };
  }
}

export async function addDoctorLeaveAction(input: DoctorLeaveInput): Promise<ActionResponse<any>> {
  try {
    const currentUser = await requireAuth();

    const validated = doctorLeaveSchema.safeParse(input);
    if (!validated.success) {
      return {
        success: false,
        message: 'Invalid leave dates or reason.',
        errors: validated.error.flatten().fieldErrors,
      };
    }

    const { doctorId, startDate, endDate, reason } = validated.data;

    const doctor = await prisma.doctor.findUnique({
      where: { id: doctorId },
      include: { user: true },
    });

    if (!doctor) {
      return { success: false, message: 'Doctor not found.' };
    }

    if (currentUser.role !== Role.ADMIN && currentUser.doctorId !== doctor.id) {
      return { success: false, message: 'Unauthorized to schedule leave for another physician.' };
    }

    if (startDate > endDate) {
      return { success: false, message: 'Leave start date cannot be after end date.' };
    }

    const [sY, sM, sD] = startDate.split('-').map(Number);
    const [eY, eM, eD] = endDate.split('-').map(Number);
    const startObj = new Date(Date.UTC(sY, sM - 1, sD, 0, 0, 0));
    const endObj = new Date(Date.UTC(eY, eM - 1, eD, 23, 59, 59));

    // Create Leave
    const leave = await prisma.doctorLeave.create({
      data: {
        doctorId,
        startDate: startObj,
        endDate: endObj,
        reason: reason?.trim() || 'Unavailable / Personal Leave',
      },
      include: { doctor: { include: { user: true } } },
    });

    // Check for conflicting appointments
    const conflictingAppts = await prisma.appointment.findMany({
      where: {
        doctorId,
        appointmentDate: {
          gte: startObj,
          lte: endObj,
        },
        status: { in: [AppointmentStatus.CONFIRMED, AppointmentStatus.SCHEDULED] },
      },
      include: {
        patient: { include: { user: true } },
      },
    });

    await logAudit({
      userId: currentUser.id,
      action: 'DOCTOR_LEAVE_SCHEDULED',
      details: `Leave from ${startDate} to ${endDate} scheduled for Dr. ${doctor.user.name}. ${conflictingAppts.length} appointments flagged for rescheduling.`,
    });

    // Notify affected patients and admin
    for (const appt of conflictingAppts) {
      await createNotificationHelper({
        userId: appt.patient.userId,
        title: 'Doctor Unavailable - Rescheduling Needed',
        message: `Dr. ${doctor.user.name} is on leave on ${appt.appointmentDate.toISOString().split('T')[0]}. Please reschedule your appointment or contact reception.`,
      });
    }

    return {
      success: true,
      message: `Leave recorded successfully. ${conflictingAppts.length} existing appointment(s) flagged.`,
      data: {
        ...toPlainObject(leave),
        conflictedCount: conflictingAppts.length,
      },
    };
  } catch (error: any) {
    console.error('Error in addDoctorLeaveAction:', error);
    return { success: false, message: error.message || 'Failed to schedule doctor leave.' };
  }
}

export async function getDoctorLeavesAction(doctorId?: string): Promise<ActionResponse<any[]>> {
  try {
    await requireAuth();

    const where: Prisma.DoctorLeaveWhereInput = {};
    if (doctorId && doctorId !== 'ALL') {
      where.doctorId = doctorId;
    }

    const leaves = await prisma.doctorLeave.findMany({
      where,
      orderBy: { startDate: 'desc' },
      include: {
        doctor: {
          include: {
            user: { select: { id: true, name: true, email: true } },
            department: { select: { id: true, name: true } },
          },
        },
      },
    });

    return {
      success: true,
      data: toPlainObject(leaves),
    };
  } catch (error: any) {
    return { success: false, message: 'Failed to fetch doctor leaves.' };
  }
}

export async function deleteDoctorLeaveAction(leaveId: string): Promise<ActionResponse<void>> {
  try {
    const currentUser = await requireAuth();

    const leave = await prisma.doctorLeave.findUnique({
      where: { id: leaveId },
      include: { doctor: { include: { user: true } } },
    });

    if (!leave) {
      return { success: false, message: 'Leave record not found.' };
    }

    if (currentUser.role !== Role.ADMIN && currentUser.doctorId !== leave.doctorId) {
      return { success: false, message: 'Unauthorized to delete this leave.' };
    }

    await prisma.doctorLeave.delete({ where: { id: leaveId } });

    await logAudit({
      userId: currentUser.id,
      action: 'DOCTOR_LEAVE_CANCELLED',
      details: `Leave ID ${leaveId} for Dr. ${leave.doctor.user.name} removed by ${currentUser.name}`,
    });

    return { success: true, message: 'Leave cancelled successfully.' };
  } catch (error: any) {
    return { success: false, message: error.message || 'Failed to remove leave.' };
  }
}

export async function deleteDoctorAction(id: string): Promise<ActionResponse<void>> {
  try {
    const currentUser = await requireRole([Role.ADMIN]);

    const doctor = await prisma.doctor.findUnique({
      where: { id },
      include: { user: true },
    });

    if (!doctor) {
      return { success: false, message: 'Doctor not found.' };
    }

    await prisma.user.delete({
      where: { id: doctor.userId },
    });

    await logAudit({
      userId: currentUser.id,
      action: 'DOCTOR_DELETED',
      details: `Doctor ${doctor.user.name} removed by Admin ${currentUser.name}`,
    });

    return { success: true, message: 'Doctor removed successfully.' };
  } catch (error: any) {
    console.error('Error in deleteDoctorAction:', error);
    return { success: false, message: error.message || 'Failed to delete doctor.' };
  }
}
