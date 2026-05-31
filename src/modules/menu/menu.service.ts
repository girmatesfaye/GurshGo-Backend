import { AppError } from "../../lib/errors";
import type { AuthContext } from "../auth/auth.types";
import {
  addMenuCategory,
  addMenuItem,
  deleteMenuItem,
  getMenuItem,
  getRestaurant,
  listMenuCategories,
  listMenuItems,
  updateMenuItem,
} from "../restaurants/restaurants.store";
import type {
  MenuCategoryCreateInput,
  MenuCategoryUpdateInput,
  MenuItemCreateInput,
  MenuItemUpdateInput,
} from "./menu.schema";

function assertMerchantOwnsRestaurant(restaurantId: string, auth: AuthContext) {
  const restaurant = getRestaurant(restaurantId);
  if (!restaurant) {
    throw new AppError(
      404,
      "RESTAURANT_NOT_FOUND",
      "No restaurant found with that ID",
    );
  }

  if (restaurant.owner_id !== auth.userId) {
    throw new AppError(
      403,
      "FORBIDDEN",
      "You do not have access to this restaurant",
    );
  }

  return restaurant;
}

export const menuService = {
  listMenu(restaurantId: string) {
    const categories = listMenuCategories(restaurantId);
    const items = listMenuItems(restaurantId);
    return categories.map((category) => ({
      ...category,
      items: items.filter((item) => item.category_id === category.id),
    }));
  },

  createCategory(
    restaurantId: string,
    input: MenuCategoryCreateInput,
    auth: AuthContext,
  ) {
    assertMerchantOwnsRestaurant(restaurantId, auth);
    return addMenuCategory(restaurantId, input.name, input.sort_order);
  },

  updateCategory(
    restaurantId: string,
    categoryId: string,
    input: MenuCategoryUpdateInput,
    auth: AuthContext,
  ) {
    assertMerchantOwnsRestaurant(restaurantId, auth);
    const categories = listMenuCategories(restaurantId);
    const existing = categories.find((category) => category.id === categoryId);
    if (!existing) {
      throw new AppError(404, "CATEGORY_NOT_FOUND", "Menu category not found");
    }

    const updated = {
      ...existing,
      ...input,
      updatedAt: new Date().toISOString(),
    };

    const nextCategories = categories.map((category) =>
      category.id === categoryId ? updated : category,
    );
    categories.splice(0, categories.length, ...nextCategories);
    return updated;
  },

  createItem(
    restaurantId: string,
    input: MenuItemCreateInput,
    auth: AuthContext,
  ) {
    assertMerchantOwnsRestaurant(restaurantId, auth);
    const categories = listMenuCategories(restaurantId);
    const category = categories.find((entry) => entry.id === input.category_id);
    if (!category) {
      throw new AppError(
        404,
        "CATEGORY_NOT_FOUND",
        "Menu category not found",
        "category_id",
      );
    }

    return addMenuItem(restaurantId, {
      category_id: input.category_id,
      name: input.name,
      description: input.description,
      price: input.price,
      image_url: input.image_url,
      is_available: input.is_available ?? true,
    });
  },

  updateItem(
    restaurantId: string,
    itemId: string,
    input: MenuItemUpdateInput,
    auth: AuthContext,
  ) {
    assertMerchantOwnsRestaurant(restaurantId, auth);
    const existing = getMenuItem(restaurantId, itemId);
    if (!existing) {
      throw new AppError(404, "ITEM_NOT_FOUND", "Menu item not found");
    }

    if (input.category_id) {
      const category = listMenuCategories(restaurantId).find(
        (entry) => entry.id === input.category_id,
      );
      if (!category) {
        throw new AppError(
          404,
          "CATEGORY_NOT_FOUND",
          "Menu category not found",
          "category_id",
        );
      }
    }

    const updated = updateMenuItem(restaurantId, itemId, {
      ...input,
      updatedAt: new Date().toISOString(),
    } as any);

    if (!updated) {
      throw new AppError(404, "ITEM_NOT_FOUND", "Menu item not found");
    }

    return updated;
  },

  deleteItem(restaurantId: string, itemId: string, auth: AuthContext) {
    assertMerchantOwnsRestaurant(restaurantId, auth);
    const existing = getMenuItem(restaurantId, itemId);
    if (!existing) {
      throw new AppError(404, "ITEM_NOT_FOUND", "Menu item not found");
    }

    const ok = deleteMenuItem(restaurantId, itemId);
    if (!ok) {
      throw new AppError(404, "ITEM_NOT_FOUND", "Menu item not found");
    }

    return { message: "Item deleted" };
  },
};
