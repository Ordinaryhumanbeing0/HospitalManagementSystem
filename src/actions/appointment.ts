'use server';

import { prisma } from '@/lib/prisma';
import {
  slotQuerySchema,
  bookAppointmentSchema,
  rescheduleAppointmentSchema,
  cancelAppointmentSchema,
  appointmentFilterSchema,
  SlotQueryInput,
  BookAppointmentInput,
  RescheduleAppointmentInput,
  CancelAppointmentInput,
  AppointmentFilterInput,
} from '@/lib/validations/appointment';
import { requireAuth, requireRole } from '@/lib/auth/rbac';
import { logAudit } from '@/lib/auth/audit';
import { ActionResponse, DoctorDailyAvailability, SlotInfo } from '@/types';
import { AppointmentStatus, Prisma, Role } from '@prisma/client';
import { toPlainObject } from '@/lib/utils';

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

function formatTime12h(time24: string): string {
  const [hStr, mStr] = time24.split(':');
  const h = parseInt(hStr, 10);
  const ampm = h >= 12 ? 'PM' : 'AM';
  const displayH = h % 12 === 0 ? 12 : h % 12;
  return `${displayH.toString().padStart(2, '0')}:${mStr} ${ampm}`;
}

function generateTimeSlots(startTime: string, endTime: string, durationMinutes: number): string[] {
  const slots: string[] = [];
  const [startH, startM] = startTime.split(':').map(Number);
  const [endH, endM] = endTime.split(':').map(Number);

  let currentMinutes = startH * 60 + startM;
  const endMinutes = endH * 60 + endM;

  while (currentMinutes + durationMinutes <= endMinutes) {
    const h = Math.floor(currentMinutes / 60);
    const m = currentMinutes % 60;
    const timeStr = `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
    slots.push(timeStr);
    currentMinutes += durationMinutes;
  }

  return slots;
}

export async function getAvailableSlotsAction(
  doctorId: string,
  dateString: string
): Promise<ActionResponse<DoctorDailyAvailability>> {
  try {
    const validated = slotQuerySchema.safeParse({ doctorId, date: dateString });
    if (!validated.success) {
      return {
        success: false,
        message: 'Invalid doctor ID or date format.',
        errors: validated.error.flatten().fieldErrors,
      };
    }

    const doctor = await prisma.doctor.findUnique({
      where: { id: doctorId },
      include: {
        user: { select: { name: true } },
        department: { select: { name: true } },
        schedules: { where: { isActive: true } },
      },
    });

    if (!doctor) {
      return { success: false, message: 'Doctor not found.' };
    }

    const [year, month, day] = dateString.split('-').map(Number);
    const selectedDate = new Date(year, month - 1, day);
    const dayOfWeek = selectedDate.getDay();

    const schedule = doctor.schedules.find((s) => s.dayOfWeek === dayOfWeek);

    if (!schedule) {
      return {
        success: true,
        data: {
          doctorId: doctor.id,
          doctorName: doctor.user.name,
          departmentName: doctor.department.name,
          date: dateString,
          dayOfWeek,
          dayName: DAYS[dayOfWeek],
          isOnDuty: false,
          slots: [],
        },
      };
    }

    // 1. Generate all base slots for the shift
    const baseSlots = generateTimeSlots(schedule.startTime, schedule.endTime, schedule.slotDuration || 30);

    // 2. Fetch existing active bookings on this date
    // Convert to start of day and end of day UTC or exact Date match
    const startOfDay = new Date(Date.UTC(year, month - 1, day, 0, 0, 0));
    const endOfDay = new Date(Date.UTC(year, month - 1, day, 23, 59, 59));

    const existingAppointments = await prisma.appointment.findMany({
      where: {
        doctorId,
        appointmentDate: {
          gte: startOfDay,
          lte: endOfDay,
        },
        status: {
          not: AppointmentStatus.CANCELLED,
        },
      },
      select: {
        timeSlot: true,
        status: true,
      },
    });

    const bookedSlotsSet = new Set(existingAppointments.map((a) => a.timeSlot));

    // 3. Check if date is today and calculate past slots
    const now = new Date();
    const isToday =
      now.getFullYear() === year &&
      now.getMonth() === month - 1 &&
      now.getDate() === day;

    const currentHours = now.getHours();
    const currentMinutes = now.getMinutes();

    const slots: SlotInfo[] = baseSlots.map((slot) => {
      const [sH, sM] = slot.split(':').map(Number);
      const isBooked = bookedSlotsSet.has(slot);
      const isPast = isToday && (sH < currentHours || (sH === currentHours && sM <= currentMinutes));

      return {
        timeSlot: slot,
        displayTime: formatTime12h(slot),
        isAvailable: !isBooked && !isPast,
        isPast,
        bookedReason: isBooked ? 'Reserved' : isPast ? 'Past hours' : undefined,
      };
    });

    return {
      success: true,
      data: {
        doctorId: doctor.id,
        doctorName: doctor.user.name,
        departmentName: doctor.department.name,
        date: dateString,
        dayOfWeek,
        dayName: DAYS[dayOfWeek],
        isOnDuty: true,
        shiftStart: formatTime12h(schedule.startTime),
        shiftEnd: formatTime12h(schedule.endTime),
        slotDuration: schedule.slotDuration,
        slots,
      },
    };
  } catch (error: any) {
    console.error('Error in getAvailableSlotsAction:', error);
    return { success: false, message: error.message || 'Failed to fetch doctor availability.' };
  }
}

export async function bookAppointmentAction(
  input: BookAppointmentInput
): Promise<ActionResponse<any>> {
  try {
    const currentUser = await requireAuth();

    const validated = bookAppointmentSchema.safeParse(input);
    if (!validated.success) {
      return {
        success: false,
        message: 'Invalid booking data. Please check all fields.',
        errors: validated.error.flatten().fieldErrors,
      };
    }

    const { patientId, doctorId, appointmentDate, timeSlot, reason } = validated.data;

    // RBAC check: Patients can only book for themselves
    if (currentUser.role === Role.PATIENT) {
      if (!currentUser.patientId || currentUser.patientId !== patientId) {
        return { success: false, message: 'You can only book appointments for your own patient profile.' };
      }
    }

    const [year, month, day] = appointmentDate.split('-').map(Number);
    const appointmentDateObj = new Date(Date.UTC(year, month - 1, day, 0, 0, 0));

    // Concurrency-safe atomic booking transaction
    const appointment = await prisma.$transaction(async (tx) => {
      // 1. Check if doctor exists
      const doctor = await tx.doctor.findUnique({
        where: { id: doctorId },
        include: { user: true },
      });
      if (!doctor) {
        throw new Error('Selected doctor does not exist.');
      }

      // 2. Check for active appointment on the exact slot (Pessimistic conflict check)
      const existing = await tx.appointment.findFirst({
        where: {
          doctorId,
          appointmentDate: appointmentDateObj,
          timeSlot,
          status: {
            not: AppointmentStatus.CANCELLED,
          },
        },
      });

      if (existing) {
        throw new Error(`Time slot ${formatTime12h(timeSlot)} is already reserved. Please choose another time.`);
      }

      // 3. Create appointment
      const created = await tx.appointment.create({
        data: {
          patientId,
          doctorId,
          appointmentDate: appointmentDateObj,
          timeSlot,
          status: AppointmentStatus.CONFIRMED,
          reason: reason?.trim() || null,
        },
        include: {
          patient: {
            include: { user: true },
          },
          doctor: {
            include: {
              user: true,
              department: true,
            },
          },
        },
      });

      return created;
    });

    await logAudit({
      userId: currentUser.id,
      action: 'APPOINTMENT_BOOKED',
      details: `Appointment booked with Dr. ${appointment.doctor.user.name} on ${appointmentDate} at ${timeSlot} for patient ${appointment.patient.user.name}`,
    });

    return {
      success: true,
      message: 'Appointment booked successfully!',
      data: toPlainObject(appointment),
    };
  } catch (error: any) {
    console.error('Error in bookAppointmentAction:', error);
    return {
      success: false,
      message: error.message || 'Failed to book appointment due to a scheduling conflict.',
    };
  }
}

export async function rescheduleAppointmentAction(
  input: RescheduleAppointmentInput
): Promise<ActionResponse<any>> {
  try {
    const currentUser = await requireAuth();

    const validated = rescheduleAppointmentSchema.safeParse(input);
    if (!validated.success) {
      return {
        success: false,
        message: 'Invalid rescheduling details.',
        errors: validated.error.flatten().fieldErrors,
      };
    }

    const { appointmentId, newDate, newTimeSlot, reason } = validated.data;

    const existingAppt = await prisma.appointment.findUnique({
      where: { id: appointmentId },
      include: { patient: true, doctor: { include: { user: true } } },
    });

    if (!existingAppt) {
      return { success: false, message: 'Appointment not found.' };
    }

    // Role check
    if (currentUser.role === Role.PATIENT && currentUser.patientId !== existingAppt.patientId) {
      return { success: false, message: 'Unauthorized to reschedule this appointment.' };
    }

    if (existingAppt.status === AppointmentStatus.CANCELLED || existingAppt.status === AppointmentStatus.COMPLETED) {
      return { success: false, message: `Cannot reschedule a ${existingAppt.status.toLowerCase()} appointment.` };
    }

    const [year, month, day] = newDate.split('-').map(Number);
    const newDateObj = new Date(Date.UTC(year, month - 1, day, 0, 0, 0));

    // Atomic rescheduling transaction
    const updated = await prisma.$transaction(async (tx) => {
      // Check if new slot is taken
      const slotConflict = await tx.appointment.findFirst({
        where: {
          id: { not: appointmentId },
          doctorId: existingAppt.doctorId,
          appointmentDate: newDateObj,
          timeSlot: newTimeSlot,
          status: { not: AppointmentStatus.CANCELLED },
        },
      });

      if (slotConflict) {
        throw new Error(`The requested new slot (${formatTime12h(newTimeSlot)} on ${newDate}) is already booked.`);
      }

      return await tx.appointment.update({
        where: { id: appointmentId },
        data: {
          appointmentDate: newDateObj,
          timeSlot: newTimeSlot,
          reason: reason ? reason.trim() : existingAppt.reason,
          status: AppointmentStatus.CONFIRMED,
        },
        include: {
          patient: { include: { user: true } },
          doctor: { include: { user: true, department: true } },
        },
      });
    });

    await logAudit({
      userId: currentUser.id,
      action: 'APPOINTMENT_RESCHEDULED',
      details: `Appointment ID ${appointmentId} rescheduled to ${newDate} at ${newTimeSlot} by ${currentUser.name}`,
    });

    return {
      success: true,
      message: 'Appointment rescheduled successfully.',
      data: toPlainObject(updated),
    };
  } catch (error: any) {
    console.error('Error in rescheduleAppointmentAction:', error);
    return { success: false, message: error.message || 'Failed to reschedule appointment.' };
  }
}

export async function cancelAppointmentAction(
  input: CancelAppointmentInput
): Promise<ActionResponse<any>> {
  try {
    const currentUser = await requireAuth();

    const validated = cancelAppointmentSchema.safeParse(input);
    if (!validated.success) {
      return { success: false, message: 'Invalid cancellation request.' };
    }

    const { appointmentId, reason } = validated.data;

    const appointment = await prisma.appointment.findUnique({
      where: { id: appointmentId },
      include: { patient: true, doctor: { include: { user: true } } },
    });

    if (!appointment) {
      return { success: false, message: 'Appointment record not found.' };
    }

    if (currentUser.role === Role.PATIENT && currentUser.patientId !== appointment.patientId) {
      return { success: false, message: 'Unauthorized to cancel this appointment.' };
    }

    if (appointment.status === AppointmentStatus.CANCELLED) {
      return { success: false, message: 'Appointment is already cancelled.' };
    }

    if (appointment.status === AppointmentStatus.COMPLETED) {
      return { success: false, message: 'Cannot cancel a completed consultation.' };
    }

    const cancelled = await prisma.appointment.update({
      where: { id: appointmentId },
      data: {
        status: AppointmentStatus.CANCELLED,
        reason: reason ? `[Cancelled]: ${reason.trim()} | Orig: ${appointment.reason || 'None'}` : appointment.reason,
      },
      include: {
        patient: { include: { user: true } },
        doctor: { include: { user: true, department: true } },
      },
    });

    await logAudit({
      userId: currentUser.id,
      action: 'APPOINTMENT_CANCELLED',
      details: `Appointment ID ${appointmentId} cancelled by ${currentUser.name} (${currentUser.role}). Reason: ${reason || 'Not specified'}`,
    });

    return {
      success: true,
      message: 'Appointment cancelled successfully.',
      data: toPlainObject(cancelled),
    };
  } catch (error: any) {
    console.error('Error in cancelAppointmentAction:', error);
    return { success: false, message: error.message || 'Failed to cancel appointment.' };
  }
}

export async function getAppointmentsAction(
  rawParams: Partial<AppointmentFilterInput> = {}
): Promise<
  ActionResponse<{
    appointments: Array<any>;
    total: number;
    page: number;
    totalPages: number;
  }>
> {
  try {
    const currentUser = await requireAuth();

    const validated = appointmentFilterSchema.parse(rawParams);
    const { status, doctorId, patientId, date, search, page, limit } = validated;
    const skip = (page - 1) * limit;

    const where: Prisma.AppointmentWhereInput = {};

    // Role-based restrictions
    if (currentUser.role === Role.PATIENT) {
      where.patientId = currentUser.patientId || 'none';
    } else if (currentUser.role === Role.DOCTOR) {
      where.doctorId = currentUser.doctorId || 'none';
    } else {
      // Admin / Receptionist can filter by specific doctor or patient
      if (doctorId && doctorId !== 'ALL') where.doctorId = doctorId;
      if (patientId && patientId !== 'ALL') where.patientId = patientId;
    }

    // Status filter
    if (status && status !== 'ALL') {
      where.status = status as AppointmentStatus;
    }

    // Date filter
    if (date) {
      const [year, month, day] = date.split('-').map(Number);
      const startOfDay = new Date(Date.UTC(year, month - 1, day, 0, 0, 0));
      const endOfDay = new Date(Date.UTC(year, month - 1, day, 23, 59, 59));
      where.appointmentDate = {
        gte: startOfDay,
        lte: endOfDay,
      };
    }

    // Free text search
    if (search && search.trim() !== '') {
      const q = search.trim();
      where.OR = [
        { patient: { user: { name: { contains: q, mode: 'insensitive' } } } },
        { patient: { user: { phone: { contains: q, mode: 'insensitive' } } } },
        { doctor: { user: { name: { contains: q, mode: 'insensitive' } } } },
        { doctor: { department: { name: { contains: q, mode: 'insensitive' } } } },
        { reason: { contains: q, mode: 'insensitive' } },
      ];
    }

    const [total, appointments] = await Promise.all([
      prisma.appointment.count({ where }),
      prisma.appointment.findMany({
        where,
        skip,
        take: limit,
        orderBy: [{ appointmentDate: 'desc' }, { timeSlot: 'asc' }],
        include: {
          patient: {
            include: {
              user: {
                select: {
                  id: true,
                  name: true,
                  email: true,
                  phone: true,
                },
              },
            },
          },
          doctor: {
            include: {
              user: {
                select: {
                  id: true,
                  name: true,
                  email: true,
                  phone: true,
                },
              },
              department: {
                select: {
                  id: true,
                  name: true,
                },
              },
            },
          },
          prescription: {
            select: {
              id: true,
              diagnosis: true,
              medications: true,
              createdAt: true,
            },
          },
          bill: {
            select: {
              id: true,
              totalAmount: true,
              status: true,
            },
          },
        },
      }),
    ]);

    return {
      success: true,
      data: {
        appointments: toPlainObject(appointments),
        total,
        page,
        totalPages: Math.ceil(total / limit),
      },
    };
  } catch (error: any) {
    console.error('Error in getAppointmentsAction:', error);
    return {
      success: false,
      message: error.message || 'Failed to fetch appointments.',
    };
  }
}

export async function getAppointmentByIdAction(id: string): Promise<ActionResponse<any>> {
  try {
    const currentUser = await requireAuth();

    const appointment = await prisma.appointment.findUnique({
      where: { id },
      include: {
        patient: { include: { user: true } },
        doctor: { include: { user: true, department: true, schedules: true } },
        prescription: true,
        bill: { include: { payments: true } },
      },
    });

    if (!appointment) {
      return { success: false, message: 'Appointment not found.' };
    }

    if (currentUser.role === Role.PATIENT && currentUser.patientId !== appointment.patientId) {
      return { success: false, message: 'Access denied to this appointment.' };
    }

    return { success: true, data: toPlainObject(appointment) };
  } catch (error: any) {
    console.error('Error in getAppointmentByIdAction:', error);
    return { success: false, message: error.message || 'Failed to load appointment details.' };
  }
}
