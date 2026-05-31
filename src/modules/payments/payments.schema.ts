import { z } from "zod";

export const confirmPaymentSchema = z.object({
  order_id: z.string().trim().min(1, "Order id is required"),
  stripe_payment_intent_id: z
    .string()
    .trim()
    .min(1, "Payment intent id is required"),
});

export const refundPaymentSchema = z.object({
  order_id: z.string().trim().min(1, "Order id is required"),
  amount: z
    .number()
    .positive("Refund amount must be greater than zero")
    .optional(),
  reason: z.string().trim().min(1, "Reason is required"),
});

export const payoutQuerySchema = z.object({
  from: z.string().optional(),
  to: z.string().optional(),
  status: z.string().optional(),
  page: z.coerce.number().int().positive().default(1),
});

export type ConfirmPaymentInput = z.infer<typeof confirmPaymentSchema>;
export type RefundPaymentInput = z.infer<typeof refundPaymentSchema>;
export type PayoutQueryInput = z.infer<typeof payoutQuerySchema>;
