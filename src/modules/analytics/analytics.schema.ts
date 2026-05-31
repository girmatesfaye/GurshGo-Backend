import { z } from "zod";

export const summaryQuerySchema = z.object({
  period: z.enum(["today", "week", "month", "custom"]).default("today"),
  from: z.string().optional(),
  to: z.string().optional(),
});

export type SummaryQuery = z.infer<typeof summaryQuerySchema>;
