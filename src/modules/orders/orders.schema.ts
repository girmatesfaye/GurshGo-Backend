import { z } from "zod";

export const orderItemSchema = z.object({
  menu_item_id: z.string().min(1),
  quantity: z.number().int().positive(),
  notes: z.string().optional(),
});

export const createOrderSchema = z.object({
  restaurant_id: z.string().min(1),
  delivery_address_id: z.string().min(1),
  items: z.array(orderItemSchema).min(1),
  promo_code: z.string().trim().min(1).optional(),
  payment_method: z.enum(["card", "cash"]).default("card"),
  tip_amount: z.number().min(0).default(0),
});

export const listOrdersQuerySchema = z.object({
  status: z.string().optional(),
  from: z.string().optional(),
  to: z.string().optional(),
  page: z.coerce.number().int().positive().default(1),
  per_page: z.coerce.number().int().positive().default(20),
});

export const updateOrderStatusSchema = z.object({
  status: z.enum([
    "PENDING",
    "CONFIRMED",
    "PREPARING",
    "READY",
    "PICKED_UP",
    "ON_THE_WAY",
    "DELIVERED",
    "CANCELLED",
  ]),
  prep_minutes: z.number().int().positive().optional(),
});

export const cancelOrderSchema = z.object({
  reason: z.string().min(1),
});

export type CreateOrderInput = z.infer<typeof createOrderSchema>;
export type ListOrdersQueryInput = z.infer<typeof listOrdersQuerySchema>;
export type UpdateOrderStatusInput = z.infer<typeof updateOrderStatusSchema>;
export type CancelOrderInput = z.infer<typeof cancelOrderSchema>;
