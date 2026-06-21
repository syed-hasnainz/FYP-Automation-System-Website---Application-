import { authDelete, authGet, authPut } from './apiClient';

export interface NotificationItem {
  id: string;
  title: string;
  message?: string;
  type?: string;
  isRead: boolean;
  createdAt?: string;
}

export function normalizeNotifications(raw: unknown): NotificationItem[] {
  const list = Array.isArray(raw) ? raw : [];
  return list
    .map((item) => {
      const row = item as Record<string, unknown>;
      const createdAt = row.createdAt ?? row.created_at;
      return {
        id: String(row.id ?? ''),
        title: String(row.title ?? row.message ?? 'Notification'),
        message: typeof row.message === 'string' ? row.message : undefined,
        type: typeof row.type === 'string' ? row.type : undefined,
        isRead: Boolean(row.isRead ?? row.read),
        createdAt:
          typeof createdAt === 'string' || createdAt instanceof Date
            ? String(createdAt)
            : undefined,
      };
    })
    .filter((item) => item.id.length > 0)
    .sort((a, b) => {
      const aTime = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const bTime = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return bTime - aTime;
    });
}

export async function fetchAllNotifications() {
  const raw = await authGet<unknown>('/api/notifications');
  return normalizeNotifications(raw);
}

export async function markNotificationsRead(notificationIds?: string[]) {
  return authPut('/api/notifications', {
    markAll: !notificationIds?.length,
    notificationIds,
  });
}

export async function deleteNotifications(notificationIds?: string[]) {
  const hasIds = !!notificationIds?.length;
  return authDelete('/api/notifications', {
    deleteAll: !hasIds,
    notificationIds: hasIds ? notificationIds : undefined,
  });
}
