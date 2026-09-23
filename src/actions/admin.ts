'use server';

import { prisma } from '@/lib/prisma';
import { requireRole } from '@/lib/auth/rbac';
import { ActionResponse, AdminOperationalMetrics } from '@/types';
import { AppointmentStatus, PaymentStatus, Role } from '@prisma/client';
import { toPlainObject } from '@/lib/utils';

export async function getAdminOperationalMetricsAction(): Promise<ActionResponse<AdminOperationalMetrics>> {
  try {
    await requireRole([Role.ADMIN]);

    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth();
    const day = now.getDate();
    const todayStart = new Date(Date.UTC(year, month, day, 0, 0, 0));
    const todayEnd = new Date(Date.UTC(year, month, day, 23, 59, 59));
    const dayOfWeek = now.getDay();

    // Parallel optimized DB queries
    const [
      totalPatients,
      activePatients,
      totalDoctors,
      activeDoctors,
      doctorsWithLeavesAndSchedules,
      todayAppts,
      futureApptsCount,
      allAppointmentsByStatus,
      paymentsToday,
      allPayments,
      pendingBills,
      allLeaves,
    ] = await Promise.all([
      // 1. Patient counts
      prisma.patient.count(),
      prisma.patient.count({ where: { user: { isActive: true } } }),

      // 2. Doctor counts
      prisma.doctor.count(),
      prisma.doctor.count({ where: { isActive: true } }),

      // 3. Doctors with details for workload & availability
      prisma.doctor.findMany({
        include: {
          user: { select: { name: true, isActive: true } },
          department: { select: { name: true } },
          schedules: { where: { isActive: true } },
          leaves: true,
          appointments: {
            select: {
              id: true,
              appointmentDate: true,
              status: true,
              bill: {
                select: {
                  paidAmount: true,
                  status: true,
                },
              },
            },
          },
        },
      }),

      // 4. Today's appointments
      prisma.appointment.findMany({
        where: {
          appointmentDate: {
            gte: todayStart,
            lte: todayEnd,
          },
        },
        select: {
          id: true,
          status: true,
        },
      }),

      // 5. Future appointments
      prisma.appointment.count({
        where: {
          appointmentDate: {
            gt: todayEnd,
          },
          status: { in: [AppointmentStatus.CONFIRMED, AppointmentStatus.SCHEDULED] },
        },
      }),

      // 6. Status distribution
      prisma.appointment.groupBy({
        by: ['status'],
        _count: { status: true },
      }),

      // 7. Today's payments
      prisma.payment.findMany({
        where: {
          receivedAt: {
            gte: todayStart,
            lte: todayEnd,
          },
        },
        select: { amount: true },
      }),

      // 8. All payments
      prisma.payment.findMany({
        select: { amount: true },
      }),

      // 9. Pending bills
      prisma.bill.findMany({
        where: {
          status: { in: [PaymentStatus.UNPAID, PaymentStatus.PARTIALLY_PAID] },
        },
        select: {
          totalAmount: true,
          paidAmount: true,
        },
      }),

      // 10. All active leaves
      prisma.doctorLeave.findMany({
        include: {
          doctor: { include: { user: true, department: true } },
        },
      }),
    ]);

    // Calculate Today's Appointments breakdown
    let todayCompletedCount = 0;
    let todayPendingCount = 0;
    todayAppts.forEach((a) => {
      if (a.status === AppointmentStatus.COMPLETED) todayCompletedCount++;
      if (
        a.status === AppointmentStatus.CONFIRMED ||
        a.status === AppointmentStatus.SCHEDULED ||
        a.status === AppointmentStatus.CHECKED_IN ||
        a.status === AppointmentStatus.IN_PROGRESS
      ) {
        todayPendingCount++;
      }
    });

    // Status map
    const statusDistribution: Record<string, number> = {};
    let cancelledAppointmentsCount = 0;
    let noShowAppointmentsCount = 0;
    allAppointmentsByStatus.forEach((g) => {
      statusDistribution[g.status] = g._count.status;
      if (g.status === AppointmentStatus.CANCELLED) cancelledAppointmentsCount = g._count.status;
      if (g.status === AppointmentStatus.NO_SHOW) noShowAppointmentsCount = g._count.status;
    });

    // Revenue calculations
    const todayRevenue = paymentsToday.reduce((acc, p) => acc + Number(p.amount), 0);
    const totalRevenue = allPayments.reduce((acc, p) => acc + Number(p.amount), 0);
    const pendingBillsCount = pendingBills.length;
    const pendingBillsAmount = pendingBills.reduce(
      (acc, b) => acc + Math.max(0, Number(b.totalAmount) - Number(b.paidAmount)),
      0
    );

    // Doctors on leave today & available today
    let doctorsOnLeave = 0;
    let doctorsAvailableToday = 0;

    const doctorWorkload = doctorsWithLeavesAndSchedules.map((doc) => {
      const isOnLeaveToday = doc.leaves.some(
        (l) => l.startDate <= todayEnd && todayStart <= l.endDate
      );
      if (isOnLeaveToday) doctorsOnLeave++;

      const worksToday = doc.schedules.some((s) => s.dayOfWeek === dayOfWeek);
      if (worksToday && !isOnLeaveToday && doc.isActive) {
        doctorsAvailableToday++;
      }

      let todayAppointments = 0;
      let completedTotal = 0;
      let revenueTotal = 0;
      let cancelledCount = 0;
      let noShowCount = 0;

      doc.appointments.forEach((appt) => {
        const apptDate = new Date(appt.appointmentDate);
        if (apptDate >= todayStart && apptDate <= todayEnd) {
          todayAppointments++;
        }
        if (appt.status === AppointmentStatus.COMPLETED) {
          completedTotal++;
        }
        if (appt.status === AppointmentStatus.CANCELLED) {
          cancelledCount++;
        }
        if (appt.status === AppointmentStatus.NO_SHOW) {
          noShowCount++;
        }
        if (appt.bill) {
          revenueTotal += Number(appt.bill.paidAmount) || 0;
        }
      });

      return {
        doctorId: doc.id,
        doctorName: doc.user.name,
        departmentName: doc.department.name,
        specialization: doc.specialization,
        isActive: doc.isActive,
        isOnLeaveToday,
        todayAppointments,
        completedTotal,
        revenueTotal: Math.round(revenueTotal * 100) / 100,
        cancelledCount,
        noShowCount,
      };
    });

    // Detect appointments conflicting with doctor leaves
    const conflictedAppointments: Array<any> = [];
    for (const doc of doctorsWithLeavesAndSchedules) {
      if (doc.leaves.length === 0) continue;
      for (const leave of doc.leaves) {
        const conflicts = await prisma.appointment.findMany({
          where: {
            doctorId: doc.id,
            appointmentDate: {
              gte: leave.startDate,
              lte: leave.endDate,
            },
            status: { in: [AppointmentStatus.CONFIRMED, AppointmentStatus.SCHEDULED] },
          },
          include: {
            patient: { include: { user: true } },
            doctor: { include: { user: true, department: true } },
          },
        });

        conflicts.forEach((c) => {
          conflictedAppointments.push({
            appointmentId: c.id,
            patientName: c.patient.user.name,
            doctorName: c.doctor.user.name,
            departmentName: c.doctor.department.name,
            appointmentDate: c.appointmentDate.toISOString().split('T')[0],
            timeSlot: c.timeSlot,
            status: c.status,
            leaveReason: leave.reason,
          });
        });
      }
    }

    return {
      success: true,
      data: {
        totalPatients,
        activePatients,
        totalDoctors,
        activeDoctors,
        doctorsOnLeave,
        doctorsAvailableToday,
        todayAppointmentsCount: todayAppts.length,
        upcomingAppointmentsCount: futureApptsCount,
        todayCompletedCount,
        todayPendingCount,
        cancelledAppointmentsCount,
        noShowAppointmentsCount,
        statusDistribution,
        todayRevenue: Math.round(todayRevenue * 100) / 100,
        totalRevenue: Math.round(totalRevenue * 100) / 100,
        pendingBillsCount,
        pendingBillsAmount: Math.round(pendingBillsAmount * 100) / 100,
        doctorWorkload,
        leaveConflictedAppointments: conflictedAppointments,
      },
    };
  } catch (error: any) {
    console.error('Error in getAdminOperationalMetricsAction:', error);
    return {
      success: false,
      message: error.message || 'Failed to aggregate administrative metrics.',
    };
  }
}
