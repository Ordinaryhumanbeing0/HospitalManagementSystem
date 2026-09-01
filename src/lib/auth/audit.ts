import { prisma } from '@/lib/prisma';

export async function logAudit({
  userId,
  action,
  details,
  ipAddress,
}: {
  userId?: string | null;
  action: string;
  details?: string | null;
  ipAddress?: string | null;
}) {
  try {
    await prisma.auditLog.create({
      data: {
        userId: userId || null,
        action,
        details: details || null,
        ipAddress: ipAddress || null,
      },
    });
  } catch (error) {
    console.error('Failed to write audit log:', error);
  }
}
