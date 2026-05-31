import { z } from "zod";

export const updateProfileSchema = z.object({
  name: z.string().trim().min(2).optional(),
  email: z.string().trim().email().optional(),
});

export const addressCreateSchema = z.object({
  label: z.string().trim().min(1),
  street: z.string().trim().min(1),
  city: z.string().trim().min(1),
  lat: z.number().optional(),
  lng: z.number().optional(),
  is_default: z.boolean().optional().default(false),
});

export const addressUpdateSchema = z.object({
  label: z.string().trim().min(1).optional(),
  street: z.string().trim().min(1).optional(),
  city: z.string().trim().min(1).optional(),
  lat: z.number().optional(),
  lng: z.number().optional(),
  is_default: z.boolean().optional(),
});

export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;
export type AddressCreateInput = z.infer<typeof addressCreateSchema>;
export type AddressUpdateInput = z.infer<typeof addressUpdateSchema>;
