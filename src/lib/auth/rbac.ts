import { Role } from '@prisma/client';
import { SessionUser, UserRole } from '@/types';
import { getSessionUser } from './session';

export const ROLE_HIERARCHY: Record<UserRole, number> = {
  ADMIN: 4,
  DOCTOR: 3,
  RECEPTIONIST: 2,
  PATIENT: 1,
};

export function hasRole(user: SessionUser | null, allowedRoles: UserRole[]): boolean {
  if (!user) return false;
  return allowedRoles.includes(user.role);
}

import { prisma } from '@/lib/prisma';

import { createSessionCookie } from './session';

export async function requireAuth(): Promise<SessionUser> {
  const user = await getSessionUser();
  if (!user) {
    throw new Error('UNAUTHORIZED: You must be logged in to perform this action.');
  }

  // Verify against database to heal stale cookies after seeds/migrations
  const dbUser = await prisma.user.findFirst({
    where: {
      OR: [
        { id: user.id },
        { email: user.email.toLowerCase() },
      ],
    },
    include: {
      patient: { select: { id: true } },
      doctor: { select: { id: true } },
    },
  });

  if (!dbUser || !dbUser.isActive) {
    throw new Error('UNAUTHORIZED: User session expired or user no longer exists. Please log in again.');
  }

  let patientId = dbUser.patient?.id || null;
  if (dbUser.role === Role.PATIENT && !patientId) {
    const newPatient = await prisma.patient.create({
      data: {
        userId: dbUser.id,
        dateOfBirth: new Date('2000-01-01'),
        gender: 'OTHER',
      },
    });
    patientId = newPatient.id;
  }

  const freshUser: SessionUser = {
    ...user,
    id: dbUser.id,
    role: dbUser.role,
    name: dbUser.name,
    email: dbUser.email,
    phone: dbUser.phone,
    patientId,
    doctorId: dbUser.doctor?.id || null,
  };

  if (
    user.id !== freshUser.id ||
    user.patientId !== freshUser.patientId ||
    user.doctorId !== freshUser.doctorId ||
    user.role !== freshUser.role
  ) {
    try {
      await createSessionCookie(freshUser);
    } catch {
      // Ignore cookie write failure in read-only render contexts
    }
  }

  return freshUser;
}

export async function requireRole(allowedRoles: UserRole[]): Promise<SessionUser> {
  const user = await requireAuth();
  if (!allowedRoles.includes(user.role)) {
    throw new Error(`FORBIDDEN: Access restricted. Requires one of [${allowedRoles.join(', ')}] role.`);
  }
  return user;
}

export function getDefaultDashboardPath(role: UserRole): string {
  switch (role) {
    case Role.ADMIN:
      return '/admin/dashboard';
    case Role.DOCTOR:
      return '/doctor/dashboard';
    case Role.RECEPTIONIST:
      return '/receptionist/dashboard';
    case Role.PATIENT:
    default:
      return '/patient/dashboard';
  }
}
