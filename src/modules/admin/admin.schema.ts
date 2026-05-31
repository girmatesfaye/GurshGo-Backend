import { z } from "zod";

export const listOrdersQuerySchema = z.object({
  status: z.string().optional(),
  restaurant_id: z.string().optional(),
  customer_id: z.string().optional(),
  driver_id: z.string().optional(),
  from: z.string().optional(),
  to: z.string().optional(),
  page: z.coerce.number().int().positive().default(1),
  per_page: z.coerce.number().int().positive().default(20),
});

export const forceUpdateOrderSchema = z.object({
  status: z.string().min(1),
  prep_minutes: z.number().int().optional(),
});

export const listUsersQuerySchema = z.object({
  q: z.string().optional(),
  page: z.coerce.number().int().positive().default(1),
  per_page: z.coerce.number().int().positive().default(20),
});

export const updateUserSchema = z.object({
  name: z.string().optional(),
  email: z.string().email().optional(),
  is_suspended: z.coerce.boolean().optional(),
});

export const metricsQuerySchema = z.object({
  period: z.enum(["today", "week", "month", "custom"]).default("today"),
  from: z.string().optional(),
  to: z.string().optional(),
});

export type ListOrdersQuery = z.infer<typeof listOrdersQuerySchema>;
export type ForceUpdateOrderBody = z.infer<typeof forceUpdateOrderSchema>;
export type ListUsersQuery = z.infer<typeof listUsersQuerySchema>;
export type UpdateUserBody = z.infer<typeof updateUserSchema>;
export type MetricsQuery = z.infer<typeof metricsQuerySchema>;
