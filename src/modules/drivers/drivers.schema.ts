import { z } from "zod";

export const driverStatusSchema = z.object({
  status: z.enum(["online", "offline", "on_delivery"]),
});

export const driverLocationSchema = z.object({
  lat: z.number(),
  lng: z.number(),
  bearing: z.number().int().min(0).max(360).optional(),
});

export const driverJobRespondSchema = z.object({
  order_id: z.string().trim().min(1, "Order id is required"),
  action: z.enum(["accept", "decline"]),
});

export const nearbyDriversQuerySchema = z.object({
  lat: z.coerce.number(),
  lng: z.coerce.number(),
  radius_km: z.coerce.number().positive().default(3),
});

export type DriverStatusInput = z.infer<typeof driverStatusSchema>;
export type DriverLocationInput = z.infer<typeof driverLocationSchema>;
export type DriverJobRespondInput = z.infer<typeof driverJobRespondSchema>;
export type NearbyDriversQueryInput = z.infer<typeof nearbyDriversQuerySchema>;
