'use server';

import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth/rbac';
import { ActionResponse } from '@/types';
import { toPlainObject } from '@/lib/utils';
import { notificationQueue } from '@/lib/queue/billing-queue';
import { NotificationModel } from '@/lib/domain/models';

/**
 * Creates and queues a notification for a user.
 * Dispatched asynchronously via NotificationRequestQueue.
 */
export async function createNotificationHelper(data: {
  userId: string;
  title: string;
  message: string;
}): Promise<void> {
  try {
    await notificationQueue.enqueueTask(`notify_${data.userId}_${Date.now()}`, async () => {
      return await prisma.notification.create({
        data: {
          userId: data.userId,
          title: data.title.trim(),
          message: data.message.trim(),
          isRead: false,
        },
      });
    });
  } catch (error) {
    console.error('Failed to dispatch notification:', error);
  }
}

/**
 * Get notifications for the currently logged-in user
 */
export async function getNotificationsAction(): Promise<
  ActionResponse<{
    notifications: Array<any>;
    unreadCount: number;
  }>
> {
  try {
    const currentUser = await requireAuth();

    const [unreadCount, notifications] = await Promise.all([
      prisma.notification.count({
        where: {
          userId: currentUser.id,
          isRead: false,
        },
      }),
      prisma.notification.findMany({
        where: {
          userId: currentUser.id,
        },
        orderBy: {
          createdAt: 'desc',
        },
        take: 20,
      }),
    ]);

    const formattedNotifications = notifications.map((n) => {
      const model = new NotificationModel(n);
      return {
        ...toPlainObject(n),
        timeAgo: model.getTimeAgo(),
      };
    });

    return {
      success: true,
      data: {
        notifications: formattedNotifications,
        unreadCount,
      },
    };
  } catch (error: any) {
    return {
      success: false,
      message: error.message || 'Failed to load notifications.',
    };
  }
}

/**
 * Mark a single notification as read
 */
export async function markNotificationAsReadAction(
  notificationId: string
): Promise<ActionResponse<any>> {
  try {
    const currentUser = await requireAuth();

    const notification = await prisma.notification.findUnique({
      where: { id: notificationId },
    });

    if (!notification || notification.userId !== currentUser.id) {
      return { success: false, message: 'Notification not found or access denied.' };
    }

    const updated = await prisma.notification.update({
      where: { id: notificationId },
      data: { isRead: true },
    });

    return {
      success: true,
      data: toPlainObject(updated),
    };
  } catch (error: any) {
    return {
      success: false,
      message: error.message || 'Failed to update notification.',
    };
  }
}

/**
 * Mark all notifications as read for current user
 */
export async function markAllNotificationsAsReadAction(): Promise<ActionResponse<any>> {
  try {
    const currentUser = await requireAuth();

    await prisma.notification.updateMany({
      where: {
        userId: currentUser.id,
        isRead: false,
      },
      data: {
        isRead: true,
      },
    });

    return {
      success: true,
      message: 'All notifications marked as read.',
    };
  } catch (error: any) {
    return {
      success: false,
      message: error.message || 'Failed to mark all notifications as read.',
    };
  }
}
