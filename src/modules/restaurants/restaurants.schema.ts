import { z } from "zod";

export const restaurantCreateSchema = z.object({
  name: z.string().min(1),
  cuisine_type: z.string().min(1),
  description: z.string().optional(),
  address: z.string().optional(),
  lat: z.number().optional(),
  lng: z.number().optional(),
  phone: z.string().optional(),
  avg_prep_minutes: z.number().optional(),
  delivery_fee: z.number().optional(),
  min_order: z.number().optional(),
  is_open: z.boolean().optional().default(true),
  image_url: z.string().url().optional(),
});

export const restaurantUpdateSchema = restaurantCreateSchema.partial();

export const menuCategoryCreateSchema = z.object({
  name: z.string().min(1),
  sort_order: z.number().optional().default(0),
});

export const menuItemCreateSchema = z.object({
  category_id: z.string().min(1),
  name: z.string().min(1),
  description: z.string().optional(),
  price: z.number().min(0),
  image_url: z.string().url().optional(),
  is_available: z.boolean().optional().default(true),
});

export const menuItemUpdateSchema = menuItemCreateSchema.partial();

export type RestaurantCreateInput = z.infer<typeof restaurantCreateSchema>;
export type RestaurantUpdateInput = z.infer<typeof restaurantUpdateSchema>;
export type MenuCategoryCreateInput = z.infer<typeof menuCategoryCreateSchema>;
export type MenuItemCreateInput = z.infer<typeof menuItemCreateSchema>;
export type MenuItemUpdateInput = z.infer<typeof menuItemUpdateSchema>;
