import { randomUUID } from "node:crypto";

import { AppError } from "../../lib/errors";

export type NotificationRecord = {
  id: string;
  user_id: string;
  title: string;
  body: string;
  data: Record<string, unknown> | null;
  is_read: boolean;
  created_at: string;
};

type DeviceRecord = {
  token: string;
  platform: "ios" | "android" | "web";
};

const notifications = new Map<string, NotificationRecord[]>();
const devices = new Map<string, DeviceRecord[]>();

export const notificationsService = {
  create(
    userId: string,
    title: string,
    body: string,
    data?: Record<string, unknown>,
  ) {
    const now = new Date().toISOString();
    const note: NotificationRecord = {
      id: randomUUID(),
      user_id: userId,
      title,
      body,
      data: data ?? null,
      is_read: false,
      created_at: now,
    };
    const list = notifications.get(userId) ?? [];
    list.unshift(note);
    notifications.set(userId, list);
    // NOTE: push to devices would be implemented here (FCM/APNs integration)
    return note;
  },

  listForUser(userId: string, page = 1, per_page = 20, is_read?: boolean) {
    const list = notifications.get(userId) ?? [];
    const filtered =
      typeof is_read === "boolean"
        ? list.filter((n) => n.is_read === is_read)
        : list;
    const total = filtered.length;
    const start = (page - 1) * per_page;
    const data = filtered.slice(start, start + per_page);
    return { data, meta: { total, page, per_page } };
  },

  markRead(userId: string, notificationIds?: string[], markAll?: boolean) {
    const list = notifications.get(userId) ?? [];
    if (!markAll && (!notificationIds || notificationIds.length === 0)) {
      throw new AppError(
        400,
        "INVALID_INPUT",
        "Provide notification_ids or mark_all",
      );
    }

    let changed = 0;
    if (markAll) {
      const updated = list.map((n) => ({ ...n, is_read: true }));
      changed = updated.filter(
        (n, i) => n.is_read && list[i] && !list[i].is_read,
      ).length;
      notifications.set(userId, updated);
    } else if (notificationIds) {
      const updated = list.map((n) => {
        if (notificationIds.includes(n.id) && !n.is_read) {
          changed++;
          return { ...n, is_read: true };
        }
        return n;
      });
      notifications.set(userId, updated);
    }

    return { changed };
  },

  registerDevice(
    userId: string,
    token: string,
    platform: DeviceRecord["platform"],
  ) {
    if (!token)
      throw new AppError(400, "INVALID_INPUT", "Device token required");
    const list = devices.get(userId) ?? [];
    if (!list.find((d) => d.token === token)) {
      list.push({ token, platform });
      devices.set(userId, list);
    }
    return { token, platform };
  },

  // test helper
  _clear() {
    notifications.clear();
    devices.clear();
  },
};
