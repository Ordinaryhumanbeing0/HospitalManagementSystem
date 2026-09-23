'use server';

import { prisma } from '@/lib/prisma';
import { reportFilterSchema, ReportFilterInput } from '@/lib/validations/billing';
import { requireRole } from '@/lib/auth/rbac';
import { ActionResponse, RevenueReportData } from '@/types';
import { AppointmentStatus, PaymentStatus, Prisma, Role } from '@prisma/client';
import { toPlainObject } from '@/lib/utils';
import { ReportModel } from '@/lib/domain/models';

/**
 * Generate DBMS aggregated financial & clinical performance reports
 */
export async function getRevenueAndFootfallReportsAction(
  rawParams: Partial<ReportFilterInput> = {}
): Promise<ActionResponse<RevenueReportData>> {
  try {
    // Only administrators have access to comprehensive hospital revenue analytics
    await requireRole([Role.ADMIN]);

    const validated = reportFilterSchema.parse(rawParams);
    const { startDate, endDate, departmentId } = validated;

    // Date range conditions
    const dateFilter: Prisma.DateTimeFilter = {};
    if (startDate) {
      const [y, m, d] = startDate.split('-').map(Number);
      dateFilter.gte = new Date(Date.UTC(y, m - 1, d, 0, 0, 0));
    }
    if (endDate) {
      const [y, m, d] = endDate.split('-').map(Number);
      dateFilter.lte = new Date(Date.UTC(y, m - 1, d, 23, 59, 59));
    }

    const billWhere: Prisma.BillWhereInput = {};
    if (startDate || endDate) {
      billWhere.createdAt = dateFilter;
    }
    if (departmentId && departmentId !== 'ALL') {
      billWhere.appointment = {
        doctor: { departmentId },
      };
    }

    const apptWhere: Prisma.AppointmentWhereInput = {};
    if (startDate || endDate) {
      apptWhere.appointmentDate = dateFilter;
    }
    if (departmentId && departmentId !== 'ALL') {
      apptWhere.doctor = { departmentId };
    }

    // 1. Fetch Bills with Line Items and Payments
    const [bills, appointments, departments] = await Promise.all([
      prisma.bill.findMany({
        where: billWhere,
        include: {
          appointment: {
            include: {
              doctor: {
                include: { department: true },
              },
            },
          },
          payments: true,
        },
      }),
      prisma.appointment.findMany({
        where: apptWhere,
        select: {
          id: true,
          patientId: true,
          status: true,
          appointmentDate: true,
        },
      }),
      prisma.department.findMany({
        select: { id: true, name: true },
      }),
    ]);

    // 2. Aggregate Overall Summary Metrics
    let totalBilled = 0;
    let totalRevenue = 0;

    const categoryRevenue = {
      consultation: 0,
      lab: 0,
      medication: 0,
      procedure: 0,
      other: 0,
    };

    const deptRevenueMap: Record<string, { name: string; revenue: number; consultations: number }> = {};
    departments.forEach((d) => {
      deptRevenueMap[d.id] = { name: d.name, revenue: 0, consultations: 0 };
    });

    const dailyTrendsMap: Record<string, { revenue: number; patients: Set<string> }> = {};

    // Process Bills
    bills.forEach((b) => {
      const bTotal = Number(b.totalAmount) || 0;
      const bPaid = Number(b.paidAmount) || 0;

      totalBilled += bTotal;
      totalRevenue += bPaid;

      // Category breakdown from items JSON
      const itemsData = (b.items as any)?.items || [];
      if (Array.isArray(itemsData)) {
        itemsData.forEach((it: any) => {
          const itemTotal = Number(it.total) || (Number(it.cost) * Number(it.quantity)) || 0;
          switch (it.category) {
            case 'CONSULTATION':
              categoryRevenue.consultation += itemTotal;
              break;
            case 'LAB_TEST':
              categoryRevenue.lab += itemTotal;
              break;
            case 'MEDICATION':
              categoryRevenue.medication += itemTotal;
              break;
            case 'PROCEDURE':
              categoryRevenue.procedure += itemTotal;
              break;
            default:
              categoryRevenue.other += itemTotal;
              break;
          }
        });
      }

      // Department breakdown
      const docDept = b.appointment?.doctor?.department;
      if (docDept && deptRevenueMap[docDept.id]) {
        deptRevenueMap[docDept.id].revenue += bPaid;
      }

      // Daily trend mapping
      const dateStr = b.createdAt.toISOString().split('T')[0];
      if (!dailyTrendsMap[dateStr]) {
        dailyTrendsMap[dateStr] = { revenue: 0, patients: new Set<string>() };
      }
      dailyTrendsMap[dateStr].revenue += bPaid;
      dailyTrendsMap[dateStr].patients.add(b.patientId);
    });

    // Count consultations per department
    appointments.forEach((a) => {
      const dateStr = a.appointmentDate.toISOString().split('T')[0];
      if (!dailyTrendsMap[dateStr]) {
        dailyTrendsMap[dateStr] = { revenue: 0, patients: new Set<string>() };
      }
      dailyTrendsMap[dateStr].patients.add(a.patientId);
    });

    // Department consultation counts
    const completedConsultations = appointments.filter(
      (a) => a.status === AppointmentStatus.COMPLETED
    ).length;

    const totalOutstanding = Math.max(0, totalBilled - totalRevenue);
    const collectionRate =
      totalBilled > 0 ? Math.round((totalRevenue / totalBilled) * 1000) / 10 : 0;

    const uniquePatients = new Set(appointments.map((a) => a.patientId)).size;
    const averageBillValue = bills.length > 0 ? totalBilled / bills.length : 0;

    // Build department distribution list
    const departmentRevenue = Object.values(deptRevenueMap).map((d) => ({
      departmentName: d.name,
      revenue: Math.round(d.revenue * 100) / 100,
      consultationCount: d.consultations,
      percentage: totalRevenue > 0 ? Math.round((d.revenue / totalRevenue) * 100) : 0,
    }));

    // Build daily trends
    const dailyTrends = Object.entries(dailyTrendsMap)
      .sort(([a], [b]) => a.localeCompare(b))
      .slice(-14) // Last 14 active days
      .map(([date, val]) => ({
        date,
        revenue: Math.round(val.revenue * 100) / 100,
        patientCount: val.patients.size,
      }));

    const reportData: RevenueReportData = {
      summary: {
        totalRevenue: Math.round(totalRevenue * 100) / 100,
        totalBilled: Math.round(totalBilled * 100) / 100,
        totalOutstanding: Math.round(totalOutstanding * 100) / 100,
        collectionRate,
        totalPatients: uniquePatients,
        totalConsultations: completedConsultations,
        averageBillValue: Math.round(averageBillValue * 100) / 100,
      },
      revenueByCategory: {
        consultation: Math.round(categoryRevenue.consultation * 100) / 100,
        lab: Math.round(categoryRevenue.lab * 100) / 100,
        medication: Math.round(categoryRevenue.medication * 100) / 100,
        procedure: Math.round(categoryRevenue.procedure * 100) / 100,
        other: Math.round(categoryRevenue.other * 100) / 100,
      },
      departmentRevenue,
      dailyTrends,
    };

    return {
      success: true,
      data: toPlainObject(reportData),
    };
  } catch (error: any) {
    console.error('Error in getRevenueAndFootfallReportsAction:', error);
    return {
      success: false,
      message: error.message || 'Failed to generate financial reports.',
    };
  }
}

/**
 * Export date-filtered report metrics to a downloadable CSV format
 */
export async function exportReportCsvAction(
  rawParams: Partial<ReportFilterInput> = {}
): Promise<ActionResponse<{ csvContent: string; filename: string }>> {
  try {
    const reportRes = await getRevenueAndFootfallReportsAction(rawParams);
    if (!reportRes.success || !reportRes.data) {
      return { success: false, message: reportRes.message || 'Failed to generate report for export.' };
    }

    const domainReport = new ReportModel(reportRes.data);
    const csvContent = domainReport.toCsvString();
    const filename = `hospital-performance-report-${new Date().toISOString().split('T')[0]}.csv`;

    return {
      success: true,
      data: {
        csvContent,
        filename,
      },
    };
  } catch (error: any) {
    console.error('Error in exportReportCsvAction:', error);
    return {
      success: false,
      message: error.message || 'Failed to export CSV report.',
    };
  }
}
