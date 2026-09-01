'use server';

import { prisma } from '@/lib/prisma';
import {
  departmentSchema,
  updateDepartmentSchema,
  DepartmentInput,
  UpdateDepartmentInput,
} from '@/lib/validations/department';
import { requireRole } from '@/lib/auth/rbac';
import { logAudit } from '@/lib/auth/audit';
import { ActionResponse } from '@/types';
import { Role } from '@prisma/client';
import { toPlainObject } from '@/lib/utils';

export async function getDepartmentsAction(): Promise<
  ActionResponse<
    Array<{
      id: string;
      name: string;
      description: string | null;
      createdAt: Date;
      _count: { doctors: number };
      doctors?: Array<any>;
    }>
  >
> {
  try {
    const departments = await prisma.department.findMany({
      orderBy: { name: 'asc' },
      include: {
        _count: {
          select: { doctors: true },
        },
        doctors: {
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
      },
    });

    return {
      success: true,
      data: toPlainObject(departments),
    };
  } catch (error: any) {
    console.error('Error in getDepartmentsAction:', error);
    return {
      success: false,
      message: error.message || 'Failed to fetch hospital departments.',
    };
  }
}

export async function getDepartmentByIdAction(id: string): Promise<ActionResponse<any>> {
  try {
    const department = await prisma.department.findUnique({
      where: { id },
      include: {
        doctors: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
                phone: true,
              },
            },
            schedules: true,
          },
        },
      },
    });

    if (!department) {
      return { success: false, message: 'Department not found.' };
    }

    return { success: true, data: toPlainObject(department) };
  } catch (error: any) {
    console.error('Error in getDepartmentByIdAction:', error);
    return { success: false, message: error.message || 'Failed to load department.' };
  }
}

export async function createDepartmentAction(input: DepartmentInput): Promise<ActionResponse<any>> {
  try {
    const currentUser = await requireRole([Role.ADMIN]);

    const validated = departmentSchema.safeParse(input);
    if (!validated.success) {
      return {
        success: false,
        message: 'Invalid department data.',
        errors: validated.error.flatten().fieldErrors,
      };
    }

    const { name, description } = validated.data;

    const existing = await prisma.department.findUnique({
      where: { name: name.trim() },
    });

    if (existing) {
      return { success: false, message: `Department '${name}' already exists.` };
    }

    const created = await prisma.department.create({
      data: {
        name: name.trim(),
        description: description?.trim() || null,
      },
    });

    await logAudit({
      userId: currentUser.id,
      action: 'DEPARTMENT_CREATED',
      details: `Department '${created.name}' created by Admin ${currentUser.name}`,
    });

    return {
      success: true,
      message: 'Department created successfully.',
      data: toPlainObject(created),
    };
  } catch (error: any) {
    console.error('Error in createDepartmentAction:', error);
    return { success: false, message: error.message || 'Failed to create department.' };
  }
}

export async function updateDepartmentAction(input: UpdateDepartmentInput): Promise<ActionResponse<any>> {
  try {
    const currentUser = await requireRole([Role.ADMIN]);

    const validated = updateDepartmentSchema.safeParse(input);
    if (!validated.success) {
      return {
        success: false,
        message: 'Invalid update details.',
        errors: validated.error.flatten().fieldErrors,
      };
    }

    const { id, name, description } = validated.data;

    const updated = await prisma.department.update({
      where: { id },
      data: {
        name: name.trim(),
        description: description !== undefined ? description?.trim() || null : undefined,
      },
    });

    await logAudit({
      userId: currentUser.id,
      action: 'DEPARTMENT_UPDATED',
      details: `Department '${updated.name}' updated by Admin ${currentUser.name}`,
    });

    return {
      success: true,
      message: 'Department updated successfully.',
      data: toPlainObject(updated),
    };
  } catch (error: any) {
    console.error('Error in updateDepartmentAction:', error);
    return { success: false, message: error.message || 'Failed to update department.' };
  }
}

export async function deleteDepartmentAction(id: string): Promise<ActionResponse<void>> {
  try {
    const currentUser = await requireRole([Role.ADMIN]);

    const department = await prisma.department.findUnique({
      where: { id },
      include: {
        _count: {
          select: { doctors: true },
        },
      },
    });

    if (!department) {
      return { success: false, message: 'Department not found.' };
    }

    if (department._count.doctors > 0) {
      return {
        success: false,
        message: `Cannot delete department '${department.name}'. There are ${department._count.doctors} active doctor(s) assigned to it.`,
      };
    }

    await prisma.department.delete({
      where: { id },
    });

    await logAudit({
      userId: currentUser.id,
      action: 'DEPARTMENT_DELETED',
      details: `Department '${department.name}' deleted by Admin ${currentUser.name}`,
    });

    return { success: true, message: 'Department deleted successfully.' };
  } catch (error: any) {
    console.error('Error in deleteDepartmentAction:', error);
    return { success: false, message: error.message || 'Failed to delete department.' };
  }
}
