'use server';

import { prisma } from '@/lib/prisma';
import { requireRole } from '@/lib/auth/rbac';
import { ActionResponse } from '@/types';
import { Prisma, Role } from '@prisma/client';
import { toPlainObject } from '@/lib/utils';

export async function getAuditLogsAction(
  params: {
    page?: number;
    limit?: number;
    action?: string;
    userId?: string;
  } = {}
): Promise<
  ActionResponse<{
    logs: Array<any>;
    total: number;
    page: number;
    totalPages: number;
  }>
> {
  try {
    await requireRole([Role.ADMIN]);

    const page = params.page && params.page > 0 ? params.page : 1;
    const limit = params.limit && params.limit > 0 ? Math.min(params.limit, 100) : 20;
    const skip = (page - 1) * limit;

    const where: Prisma.AuditLogWhereInput = {};

    if (params.action && params.action.trim() !== '') {
      where.action = { contains: params.action.trim(), mode: 'insensitive' };
    }

    if (params.userId) {
      where.userId = params.userId;
    }

    const [total, logs] = await Promise.all([
      prisma.auditLog.count({ where }),
      prisma.auditLog.findMany({
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
              role: true,
            },
          },
        },
      }),
    ]);

    return {
      success: true,
      data: {
        logs: toPlainObject(logs),
        total,
        page,
        totalPages: Math.ceil(total / limit),
      },
    };
  } catch (error: any) {
    console.error('Error in getAuditLogsAction:', error);
    return {
      success: false,
      message: error.message || 'Failed to retrieve system audit logs.',
    };
  }
}
