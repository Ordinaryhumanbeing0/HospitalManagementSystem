'use server';

import { prisma } from '@/lib/prisma';
import {
  slotQuerySchema,
  bookAppointmentSchema,
  rescheduleAppointmentSchema,
  cancelAppointmentSchema,
  appointmentFilterSchema,
  reassignAppointmentSchema,
  SlotQueryInput,
  BookAppointmentInput,
  RescheduleAppointmentInput,
  CancelAppointmentInput,
  AppointmentFilterInput,
  ReassignAppointmentInput,
} from '@/lib/validations/appointment';
import { requireAuth, requireRole } from '@/lib/auth/rbac';
import { logAudit } from '@/lib/auth/audit';
import { ActionResponse, DoctorDailyAvailability, SlotInfo } from '@/types';
import { AppointmentStatus, Prisma, Role } from '@prisma/client';
import { toPlainObject } from '@/lib/utils';
import { appointmentQueue } from '@/lib/queue/appointment-queue';
import { AppointmentModel } from '@/lib/domain/models';
import { createNotificationHelper } from '@/actions/notification';

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
        user: { select: { name: true, isActive: true } },
        department: { select: { name: true } },
        schedules: { where: { isActive: true } },
        leaves: true,
      },
    });

    if (!doctor) {
      return { success: false, message: 'Doctor not found.' };
    }

    if (!doctor.isActive || (doctor.user && !doctor.user.isActive)) {
      return {
        success: true,
        data: {
          doctorId: doctor.id,
          doctorName: doctor.user.name,
          departmentName: doctor.department.name,
          date: dateString,
          dayOfWeek: 0,
          dayName: '',
          isOnDuty: false,
          isInactive: true,
          slots: [],
        },
      };
    }

    const [year, month, day] = dateString.split('-').map(Number);
    const selectedDateObj = new Date(Date.UTC(year, month - 1, day, 0, 0, 0));
    const dayOfWeek = new Date(year, month - 1, day).getDay();

    // Check if doctor is on scheduled leave on this date
    const onLeave = doctor.leaves.find(
      (l) => l.startDate <= selectedDateObj && selectedDateObj <= l.endDate
    );

    if (onLeave) {
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
          isOnLeave: true,
          leaveReason: onLeave.reason || 'Doctor is on scheduled leave',
          slots: [],
        },
      };
    }

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

      let isBreak = false;
      if (schedule.breakStartTime && schedule.breakEndTime) {
        if (slot >= schedule.breakStartTime && slot < schedule.breakEndTime) {
          isBreak = true;
        }
      }

      return {
        timeSlot: slot,
        displayTime: formatTime12h(slot),
        isAvailable: !isBooked && !isPast && !isBreak,
        isPast,
        isBreak,
        bookedReason: isBooked ? 'Reserved' : isPast ? 'Past hours' : isBreak ? 'Break Time' : undefined,
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

    // Resilient Patient Resolution:
    // Support patient booking for themselves as well as staff booking on behalf of patients
    let resolvedPatientId = patientId;

    if (currentUser.role === Role.PATIENT) {
      // Find patient record for current user by patientId or userId
      let patientRecord = await prisma.patient.findFirst({
        where: {
          OR: [
            ...(currentUser.patientId ? [{ id: currentUser.patientId }] : []),
            { userId: currentUser.id },
            { id: patientId },
            { userId: patientId },
          ],
        },
      });

      if (!patientRecord) {
        // Auto-provision missing patient profile for PATIENT user
        patientRecord = await prisma.patient.create({
          data: {
            userId: currentUser.id,
            dateOfBirth: new Date('2000-01-01'),
            gender: 'OTHER',
          },
        });
      }

      resolvedPatientId = patientRecord.id;
    } else {
      // Staff (Admin, Receptionist, Doctor) booking on behalf of a patient
      const patientRecord = await prisma.patient.findFirst({
        where: {
          OR: [
            { id: patientId },
            { userId: patientId },
          ],
        },
      });

      if (!patientRecord) {
        return {
          success: false,
          message: 'Selected patient does not exist in the database. Please select a registered patient.',
        };
      }

      resolvedPatientId = patientRecord.id;
    }

    const [year, month, day] = appointmentDate.split('-').map(Number);
    const appointmentDateObj = new Date(Date.UTC(year, month - 1, day, 0, 0, 0));

    // 1. Past date & time validation
    const now = new Date();
    const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    if (appointmentDate < todayStr) {
      return { success: false, message: 'Cannot book an appointment for a past date.' };
    }
    if (appointmentDate === todayStr) {
      const [slotH, slotM] = timeSlot.split(':').map(Number);
      if (slotH < now.getHours() || (slotH === now.getHours() && slotM <= now.getMinutes())) {
        return { success: false, message: 'Cannot book a past time slot for today.' };
      }
    }

    // Concurrency-safe atomic booking transaction executed via FIFO request queue
    const appointment = await appointmentQueue.enqueueTask(
      `${doctorId}_${appointmentDate}_${timeSlot}`,
      async () => {
        return await prisma.$transaction(async (tx) => {
          // 1. Check if doctor exists
          const doctor = await tx.doctor.findUnique({
            where: { id: doctorId },
            include: { user: true, schedules: { where: { isActive: true } }, leaves: true },
          });
          if (!doctor) {
            throw new Error('Selected doctor does not exist.');
          }
          if (!doctor.isActive || (doctor.user && !doctor.user.isActive)) {
            throw new Error('Doctor is currently inactive and cannot accept bookings.');
          }

          // Check if doctor is on scheduled leave
          const onLeave = doctor.leaves.find(
            (l) => l.startDate <= appointmentDateObj && appointmentDateObj <= l.endDate
          );
          if (onLeave) {
            throw new Error(`Doctor is on leave on this date (${onLeave.reason || 'Leave'}). Please choose another date.`);
          }

          // 2. Validate doctor schedule (off-day check & working hours check)
          const selectedDayOfWeek = new Date(year, month - 1, day).getDay();
          const schedule = doctor.schedules.find((s) => s.dayOfWeek === selectedDayOfWeek);
          if (!schedule) {
            throw new Error(`Doctor is not on duty on ${DAYS[selectedDayOfWeek]}s.`);
          }

          const validSlots = generateTimeSlots(schedule.startTime, schedule.endTime, schedule.slotDuration || 30);
          if (!validSlots.includes(timeSlot)) {
            throw new Error(`Selected time slot ${timeSlot} is outside the doctor's working shift (${schedule.startTime} - ${schedule.endTime}).`);
          }

          if (schedule.breakStartTime && schedule.breakEndTime) {
            if (timeSlot >= schedule.breakStartTime && timeSlot < schedule.breakEndTime) {
              throw new Error('Selected time slot falls in doctor break hours.');
            }
          }

          // 3. Prevent duplicate active booking by same patient on the same slot
          const duplicateBooking = await tx.appointment.findFirst({
            where: {
              patientId: resolvedPatientId,
              appointmentDate: appointmentDateObj,
              timeSlot,
              status: { not: AppointmentStatus.CANCELLED },
            },
          });
          if (duplicateBooking) {
            throw new Error('You already have an active appointment scheduled at this date and time.');
          }

          // 4. Check for active appointment on the exact slot (Pessimistic conflict check)
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

          // 5. Create appointment
          const created = await tx.appointment.create({
            data: {
              patientId: resolvedPatientId,
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
        }, {
          maxWait: 15000,
          timeout: 30000,
        });
      }
    );

    // Instantiate OOP Domain Model for object-oriented encapsulation
    const domainModel = new AppointmentModel({
      id: appointment.id,
      patientId: appointment.patientId,
      doctorId: appointment.doctorId,
      appointmentDate: appointment.appointmentDate,
      timeSlot: appointment.timeSlot,
      status: appointment.status,
      reason: appointment.reason,
    });

    await logAudit({
      userId: currentUser.id,
      action: 'APPOINTMENT_BOOKED',
      details: `Appointment booked with Dr. ${appointment.doctor.user.name} on ${appointmentDate} at ${timeSlot} for patient ${appointment.patient.user.name}`,
    });

    // Notify Patient & Doctor
    await createNotificationHelper({
      userId: appointment.patient.userId,
      title: 'Appointment Confirmed',
      message: `Your appointment with Dr. ${appointment.doctor.user.name} on ${appointmentDate} at ${domainModel.getFormattedTime()} has been confirmed.`,
    });
    await createNotificationHelper({
      userId: appointment.doctor.userId,
      title: 'New Patient Appointment',
      message: `New consultation booked with ${appointment.patient.user.name} on ${appointmentDate} at ${domainModel.getFormattedTime()}.`,
    });

    return {
      success: true,
      message: 'Appointment booked successfully!',
      data: {
        ...toPlainObject(appointment),
        formattedTime: domainModel.getFormattedTime(),
        isCancellable: domainModel.isCancellable(),
      },
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
    if (currentUser.role === Role.DOCTOR && currentUser.doctorId !== existingAppt.doctorId) {
      return { success: false, message: "Unauthorized to reschedule another doctor's appointment." };
    }

    if (existingAppt.status === AppointmentStatus.CANCELLED || existingAppt.status === AppointmentStatus.COMPLETED) {
      return { success: false, message: `Cannot reschedule a ${existingAppt.status.toLowerCase()} appointment.` };
    }

    const [year, month, day] = newDate.split('-').map(Number);
    const newDateObj = new Date(Date.UTC(year, month - 1, day, 0, 0, 0));

    // Past date/time validation
    const now = new Date();
    const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    if (newDate < todayStr) {
      return { success: false, message: 'Cannot reschedule an appointment to a past date.' };
    }
    if (newDate === todayStr) {
      const [slotH, slotM] = newTimeSlot.split(':').map(Number);
      if (slotH < now.getHours() || (slotH === now.getHours() && slotM <= now.getMinutes())) {
        return { success: false, message: 'Cannot reschedule to a past time slot for today.' };
      }
    }

    // Atomic rescheduling transaction
    const updated = await prisma.$transaction(async (tx) => {
      // Validate doctor schedule on newDate
      const selectedDayOfWeek = new Date(year, month - 1, day).getDay();
      const schedule = await tx.doctorSchedule.findFirst({
        where: {
          doctorId: existingAppt.doctorId,
          dayOfWeek: selectedDayOfWeek,
          isActive: true,
        },
      });

      if (!schedule) {
        throw new Error(`Doctor is not on duty on ${DAYS[selectedDayOfWeek]}s.`);
      }

      const validSlots = generateTimeSlots(schedule.startTime, schedule.endTime, schedule.slotDuration || 30);
      if (!validSlots.includes(newTimeSlot)) {
        throw new Error(`The requested new slot (${formatTime12h(newTimeSlot)}) is outside the doctor's working hours (${formatTime12h(schedule.startTime)} - ${formatTime12h(schedule.endTime)}).`);
      }

      // Check if patient already has another appointment at this slot
      const patientConflict = await tx.appointment.findFirst({
        where: {
          id: { not: appointmentId },
          patientId: existingAppt.patientId,
          appointmentDate: newDateObj,
          timeSlot: newTimeSlot,
          status: { not: AppointmentStatus.CANCELLED },
        },
      });
      if (patientConflict) {
        throw new Error('You already have another active appointment scheduled at this date and time.');
      }

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
    }, {
      maxWait: 15000,
      timeout: 30000,
    });

    await logAudit({
      userId: currentUser.id,
      action: 'APPOINTMENT_RESCHEDULED',
      details: `Appointment ID ${appointmentId} rescheduled to ${newDate} at ${newTimeSlot} by ${currentUser.name}`,
    });

    // Notify Patient & Doctor
    await createNotificationHelper({
      userId: updated.patient.userId,
      title: 'Appointment Rescheduled',
      message: `Your appointment with Dr. ${updated.doctor.user.name} has been rescheduled to ${newDate} at ${formatTime12h(newTimeSlot)}.`,
    });
    await createNotificationHelper({
      userId: updated.doctor.userId,
      title: 'Appointment Rescheduled',
      message: `Appointment with ${updated.patient.user.name} rescheduled to ${newDate} at ${formatTime12h(newTimeSlot)}.`,
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

    if (currentUser.role === Role.DOCTOR && currentUser.doctorId !== appointment.doctorId) {
      return { success: false, message: 'Unauthorized: You can only cancel appointments for your own schedule.' };
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

    // Notify Patient & Doctor
    await createNotificationHelper({
      userId: cancelled.patient.userId,
      title: 'Appointment Cancelled',
      message: `Your appointment with Dr. ${cancelled.doctor.user.name} has been cancelled.`,
    });
    await createNotificationHelper({
      userId: cancelled.doctor.userId,
      title: 'Appointment Cancelled',
      message: `Appointment with ${cancelled.patient.user.name} has been cancelled.`,
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

    if (currentUser.role === Role.DOCTOR && currentUser.doctorId !== appointment.doctorId) {
      return { success: false, message: 'Access denied: You are not assigned to this appointment.' };
    }

    return { success: true, data: toPlainObject(appointment) };
  } catch (error: any) {
    console.error('Error in getAppointmentByIdAction:', error);
    return { success: false, message: error.message || 'Failed to load appointment details.' };
  }
}

export async function updateAppointmentStatusAction(
  appointmentId: string,
  newStatus: AppointmentStatus
): Promise<ActionResponse<any>> {
  try {
    const currentUser = await requireRole([Role.DOCTOR, Role.ADMIN, Role.RECEPTIONIST]);

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

    if (currentUser.role === Role.DOCTOR && currentUser.doctorId !== appointment.doctorId) {
      return { success: false, message: "Unauthorized to modify another doctor's appointment." };
    }

    const updated = await prisma.appointment.update({
      where: { id: appointmentId },
      data: { status: newStatus },
      include: {
        patient: { include: { user: true } },
        doctor: { include: { user: true, department: true } },
      },
    });

    await logAudit({
      userId: currentUser.id,
      action: 'APPOINTMENT_STATUS_UPDATED',
      details: `Appointment ID ${appointmentId} status changed to ${newStatus} by ${currentUser.name}`,
    });

    return {
      success: true,
      message: `Appointment marked as ${newStatus}.`,
      data: toPlainObject(updated),
    };
  } catch (error: any) {
    console.error('Error in updateAppointmentStatusAction:', error);
    return { success: false, message: error.message || 'Failed to update appointment status.' };
  }
}

export async function getAppointmentQueueMetricsAction(): Promise<ActionResponse<any>> {
  try {
    await requireAuth();
    return {
      success: true,
      data: appointmentQueue.getStats(),
    };
  } catch (error: any) {
    return { success: false, message: 'Failed to read queue stats.' };
  }
}

export async function checkInAppointmentAction(appointmentId: string): Promise<ActionResponse<any>> {
  try {
    const currentUser = await requireAuth();

    const appointment = await prisma.appointment.findUnique({
      where: { id: appointmentId },
      include: {
        patient: { include: { user: true } },
        doctor: { include: { user: true, department: true } },
      },
    });

    if (!appointment) {
      return { success: false, message: 'Appointment not found.' };
    }

    if (currentUser.role === Role.PATIENT && currentUser.patientId !== appointment.patientId) {
      return { success: false, message: 'Unauthorized to check in for another patient.' };
    }

    if (appointment.status === AppointmentStatus.COMPLETED) {
      return { success: false, message: 'Cannot check-in a completed consultation.' };
    }

    if (appointment.status === AppointmentStatus.CANCELLED) {
      return { success: false, message: 'Cannot check-in a cancelled appointment.' };
    }

    const updated = await prisma.appointment.update({
      where: { id: appointmentId },
      data: { status: AppointmentStatus.CHECKED_IN },
      include: {
        patient: { include: { user: true } },
        doctor: { include: { user: true, department: true } },
      },
    });

    await logAudit({
      userId: currentUser.id,
      action: 'PATIENT_CHECKED_IN',
      details: `Patient ${appointment.patient.user.name} checked in for appointment with Dr. ${appointment.doctor.user.name} (${appointment.timeSlot})`,
    });

    // Notify Doctor that patient is in the waiting room
    await createNotificationHelper({
      userId: appointment.doctor.userId,
      title: 'Patient Checked In (Waiting Room)',
      message: `${appointment.patient.user.name} has checked in for the ${appointment.timeSlot} consultation.`,
    });

    return {
      success: true,
      message: 'Check-in confirmed! You are queued in the clinical waiting room.',
      data: toPlainObject(updated),
    };
  } catch (error: any) {
    console.error('Error in checkInAppointmentAction:', error);
    return { success: false, message: error.message || 'Failed to check in.' };
  }
}

export async function startConsultationAction(appointmentId: string): Promise<ActionResponse<any>> {
  try {
    const currentUser = await requireRole([Role.DOCTOR, Role.ADMIN]);

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

    if (currentUser.role === Role.DOCTOR && currentUser.doctorId !== appointment.doctorId) {
      return { success: false, message: "Unauthorized to start another physician's consultation." };
    }

    const updated = await prisma.appointment.update({
      where: { id: appointmentId },
      data: { status: AppointmentStatus.IN_PROGRESS },
      include: {
        patient: { include: { user: true } },
        doctor: { include: { user: true, department: true } },
      },
    });

    await logAudit({
      userId: currentUser.id,
      action: 'CONSULTATION_STARTED',
      details: `Dr. ${appointment.doctor.user.name} initiated clinical consultation with patient ${appointment.patient.user.name}`,
    });

    await createNotificationHelper({
      userId: appointment.patient.userId,
      title: 'Consultation In Progress',
      message: `Dr. ${appointment.doctor.user.name} is ready for you in the consultation room.`,
    });

    return {
      success: true,
      message: 'Consultation started. Patient examination is in progress.',
      data: toPlainObject(updated),
    };
  } catch (error: any) {
    console.error('Error in startConsultationAction:', error);
    return { success: false, message: error.message || 'Failed to start consultation.' };
  }
}

export async function markNoShowAction(appointmentId: string): Promise<ActionResponse<any>> {
  try {
    const currentUser = await requireRole([Role.DOCTOR, Role.ADMIN, Role.RECEPTIONIST]);

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

    if (currentUser.role === Role.DOCTOR && currentUser.doctorId !== appointment.doctorId) {
      return { success: false, message: 'Unauthorized.' };
    }

    const updated = await prisma.appointment.update({
      where: { id: appointmentId },
      data: { status: AppointmentStatus.NO_SHOW },
      include: {
        patient: { include: { user: true } },
        doctor: { include: { user: true, department: true } },
      },
    });

    await logAudit({
      userId: currentUser.id,
      action: 'APPOINTMENT_NO_SHOW',
      details: `Appointment ID ${appointmentId} marked as No Show by ${currentUser.name}`,
    });

    return {
      success: true,
      message: 'Appointment marked as No-Show.',
      data: toPlainObject(updated),
    };
  } catch (error: any) {
    return { success: false, message: error.message || 'Failed to mark no-show.' };
  }
}

export async function reassignAppointmentAction(
  input: ReassignAppointmentInput
): Promise<ActionResponse<any>> {
  try {
    const currentUser = await requireRole([Role.ADMIN, Role.RECEPTIONIST]);

    const validated = reassignAppointmentSchema.safeParse(input);
    if (!validated.success) {
      return {
        success: false,
        message: 'Invalid reassignment parameters.',
        errors: validated.error.flatten().fieldErrors,
      };
    }

    const { appointmentId, newDoctorId, reason } = validated.data;

    const appointment = await prisma.appointment.findUnique({
      where: { id: appointmentId },
      include: {
        patient: { include: { user: true } },
        doctor: { include: { user: true, department: true } },
      },
    });

    if (!appointment) {
      return { success: false, message: 'Appointment not found.' };
    }

    if (appointment.status === AppointmentStatus.COMPLETED || appointment.status === AppointmentStatus.CANCELLED) {
      return { success: false, message: `Cannot reassign a ${appointment.status.toLowerCase()} appointment.` };
    }

    const newDoctor = await prisma.doctor.findUnique({
      where: { id: newDoctorId },
      include: {
        user: true,
        department: true,
        schedules: { where: { isActive: true } },
        leaves: true,
      },
    });

    if (!newDoctor) {
      return { success: false, message: 'New doctor not found.' };
    }

    if (!newDoctor.isActive) {
      return { success: false, message: `Dr. ${newDoctor.user.name} is currently inactive.` };
    }

    const apptDateObj = new Date(appointment.appointmentDate);
    const dayOfWeek = apptDateObj.getDay();

    // Check if new doctor is on leave
    const onLeave = newDoctor.leaves.find(
      (l) => l.startDate <= apptDateObj && apptDateObj <= l.endDate
    );
    if (onLeave) {
      return {
        success: false,
        message: `Dr. ${newDoctor.user.name} is on leave on this date (${onLeave.reason || 'Leave'}).`,
      };
    }

    // Check if new doctor works on this day
    const schedule = newDoctor.schedules.find((s) => s.dayOfWeek === dayOfWeek);
    if (!schedule) {
      return {
        success: false,
        message: `Dr. ${newDoctor.user.name} is not scheduled to work on ${DAYS[dayOfWeek]}s.`,
      };
    }

    // Check if slot is already occupied for the new doctor
    const existingBooking = await prisma.appointment.findFirst({
      where: {
        id: { not: appointmentId },
        doctorId: newDoctorId,
        appointmentDate: apptDateObj,
        timeSlot: appointment.timeSlot,
        status: { not: AppointmentStatus.CANCELLED },
      },
    });

    if (existingBooking) {
      return {
        success: false,
        message: `Dr. ${newDoctor.user.name} already has an appointment scheduled at ${formatTime12h(appointment.timeSlot)}.`,
      };
    }

    const oldDoctorName = appointment.doctor.user.name;

    const updated = await prisma.appointment.update({
      where: { id: appointmentId },
      data: {
        doctorId: newDoctorId,
        reason: reason
          ? `[Reassigned from Dr. ${oldDoctorName}]: ${reason.trim()} | Orig: ${appointment.reason || 'None'}`
          : `[Reassigned from Dr. ${oldDoctorName}] ${appointment.reason || ''}`.trim(),
      },
      include: {
        patient: { include: { user: true } },
        doctor: { include: { user: true, department: true } },
      },
    });

    await logAudit({
      userId: currentUser.id,
      action: 'APPOINTMENT_REASSIGNED',
      details: `Appointment ID ${appointmentId} reassigned from Dr. ${oldDoctorName} to Dr. ${newDoctor.user.name} by ${currentUser.name}`,
    });

    // Notify Patient, Old Doctor, New Doctor
    await createNotificationHelper({
      userId: appointment.patient.userId,
      title: 'Appointment Physician Reassigned',
      message: `Your appointment on ${appointment.appointmentDate.toISOString().split('T')[0]} at ${formatTime12h(appointment.timeSlot)} has been reassigned to Dr. ${newDoctor.user.name} (${newDoctor.department.name}).`,
    });

    await createNotificationHelper({
      userId: appointment.doctor.userId,
      title: 'Appointment Reassigned Away',
      message: `Appointment for ${appointment.patient.user.name} at ${formatTime12h(appointment.timeSlot)} was reassigned to Dr. ${newDoctor.user.name}.`,
    });

    await createNotificationHelper({
      userId: newDoctor.userId,
      title: 'New Reassigned Patient Appointment',
      message: `Patient ${appointment.patient.user.name} has been reassigned to your schedule for ${formatTime12h(appointment.timeSlot)}.`,
    });

    return {
      success: true,
      message: `Appointment successfully reassigned to Dr. ${newDoctor.user.name}.`,
      data: toPlainObject(updated),
    };
  } catch (error: any) {
    console.error('Error in reassignAppointmentAction:', error);
    return { success: false, message: error.message || 'Failed to reassign appointment.' };
  }
}
