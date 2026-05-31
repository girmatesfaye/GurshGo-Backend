import { z } from "zod";

export const createPromotionSchema = z.object({
  restaurant_id: z.string().trim().min(1),
  code: z.string().trim().min(3).max(32),
  type: z.enum(["percent", "fixed"]),
  value: z.number().positive(),
  min_order_value: z.number().positive().optional(),
  max_uses: z.number().int().positive().optional(),
  expires_at: z.string().optional(),
});

export const validatePromotionSchema = z.object({
  restaurant_id: z.string().trim().min(1),
  code: z.string().trim().min(1),
  order_subtotal: z.number().nonnegative(),
});

export const listPromotionsQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  per_page: z.coerce.number().int().positive().default(20),
});

export type CreatePromotionInput = z.infer<typeof createPromotionSchema>;
export type ValidatePromotionInput = z.infer<typeof validatePromotionSchema>;
export type ListPromotionsQuery = z.infer<typeof listPromotionsQuerySchema>;
