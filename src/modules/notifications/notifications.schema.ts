import { z } from "zod";

export const listNotificationsQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  per_page: z.coerce.number().int().positive().default(20),
  is_read: z.coerce.boolean().optional(),
});

export const markReadSchema = z.object({
  notification_ids: z.array(z.string()).optional(),
  mark_all: z.coerce.boolean().optional(),
});

export const registerDeviceSchema = z.object({
  token: z.string().trim().min(1),
  platform: z.enum(["ios", "android", "web"]),
});

export type ListNotificationsQuery = z.infer<
  typeof listNotificationsQuerySchema
>;
export type MarkReadBody = z.infer<typeof markReadSchema>;
export type RegisterDeviceBody = z.infer<typeof registerDeviceSchema>;
