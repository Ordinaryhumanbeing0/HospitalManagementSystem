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

export async function requireAuth(): Promise<SessionUser> {
  const user = await getSessionUser();
  if (!user) {
    throw new Error('UNAUTHORIZED: You must be logged in to perform this action.');
  }
  return user;
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
