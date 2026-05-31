import { z } from "zod";

export const menuCategoryCreateSchema = z.object({
  name: z.string().trim().min(1, "Name is required"),
  sort_order: z.number().int().nonnegative().optional().default(0),
});

export const menuCategoryUpdateSchema = z.object({
  name: z.string().trim().min(1, "Name is required").optional(),
  sort_order: z.number().int().nonnegative().optional(),
});

export const menuItemCreateSchema = z.object({
  category_id: z.string().trim().min(1, "Category is required"),
  name: z.string().trim().min(1, "Name is required"),
  description: z.string().trim().optional(),
  price: z.number().nonnegative("Price must be zero or higher"),
  image_url: z.string().trim().url().optional(),
  is_available: z.boolean().optional().default(true),
});

export const menuItemUpdateSchema = z.object({
  category_id: z.string().trim().min(1, "Category is required").optional(),
  name: z.string().trim().min(1, "Name is required").optional(),
  description: z.string().trim().optional(),
  price: z.number().nonnegative("Price must be zero or higher").optional(),
  image_url: z.string().trim().url().optional(),
  is_available: z.boolean().optional(),
});

export type MenuCategoryCreateInput = z.infer<typeof menuCategoryCreateSchema>;
export type MenuCategoryUpdateInput = z.infer<typeof menuCategoryUpdateSchema>;
export type MenuItemCreateInput = z.infer<typeof menuItemCreateSchema>;
export type MenuItemUpdateInput = z.infer<typeof menuItemUpdateSchema>;
