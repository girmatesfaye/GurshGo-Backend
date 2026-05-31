import { AppError } from "../../lib/errors";
import type {
  MenuCategory,
  MenuItem,
  RestaurantRecord,
} from "./restaurants.store";
import {
  addMenuCategory,
  addMenuItem,
  createRestaurant,
  deleteMenuItem,
  getMenuItem,
  getRestaurant,
  listMenuCategories,
  listMenuItems,
  listRestaurants,
  updateMenuItem,
  updateRestaurant,
} from "./restaurants.store";

function haversine(lat1: number, lon1: number, lat2: number, lon2: number) {
  const toRad = (v: number) => (v * Math.PI) / 180;
  const R = 6371; // km
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

export const restaurantsService = {
  list(query: {
    lat?: number;
    lng?: number;
    radius_km?: number;
    cuisine?: string;
    is_open?: boolean;
    search?: string;
    page?: number;
    per_page?: number;
  }) {
    let items = listRestaurants();

    if (query.cuisine) {
      items = items.filter((r) =>
        r.cuisine_type.toLowerCase().includes(query.cuisine!.toLowerCase()),
      );
    }

    if (typeof query.is_open === "boolean") {
      items = items.filter((r) => r.is_open === query.is_open);
    }

    if (query.search) {
      const s = query.search.toLowerCase();
      items = items.filter(
        (r) =>
          r.name.toLowerCase().includes(s) ||
          (r.description ?? "").toLowerCase().includes(s),
      );
    }

    if (typeof query.lat === "number" && typeof query.lng === "number") {
      items = items.map(
        (r) =>
          ({
            ...r,
            distance_km:
              r.lat && r.lng
                ? haversine(query.lat!, query.lng!, r.lat, r.lng)
                : null,
          }) as any,
      );
      if (typeof query.radius_km === "number") {
        items = items.filter(
          (r: any) =>
            r.distance_km !== null && r.distance_km <= query.radius_km!,
        );
      }
      items = items.sort(
        (a: any, b: any) => (a.distance_km ?? 9999) - (b.distance_km ?? 9999),
      );
    }

    const page = query.page ?? 1;
    const per_page = query.per_page ?? 20;
    const start = (page - 1) * per_page;
    const pageItems = items.slice(start, start + per_page);

    return { data: pageItems, meta: { page, per_page, total: items.length } };
  },

  get(id: string) {
    const r = getRestaurant(id);
    if (!r)
      throw new AppError(
        404,
        "RESTAURANT_NOT_FOUND",
        "No restaurant found with that ID",
      );
    return r;
  },

  getMenu(restaurantId: string) {
    const r = getRestaurant(restaurantId);
    if (!r)
      throw new AppError(
        404,
        "RESTAURANT_NOT_FOUND",
        "No restaurant found with that ID",
      );

    const categories = listMenuCategories(restaurantId);
    const items = listMenuItems(restaurantId);

    const categorized = categories.map((c) => ({
      ...c,
      items: items.filter((i) => i.category_id === c.id),
    }));
    return { categories: categorized };
  },

  create(input: Partial<RestaurantRecord>) {
    const rec = createRestaurant({
      name: input.name ?? "",
      cuisine_type: input.cuisine_type ?? "",
      description: input.description,
      address: input.address,
      lat: input.lat,
      lng: input.lng,
      phone: input.phone,
      rating: input.rating ?? 0,
      review_count: input.review_count ?? 0,
      avg_prep_minutes: input.avg_prep_minutes ?? 0,
      delivery_fee: input.delivery_fee ?? 0,
      min_order: input.min_order ?? 0,
      is_open: input.is_open ?? true,
      image_url: input.image_url,
    });

    return rec;
  },

  update(id: string, patch: Partial<RestaurantRecord>) {
    const updated = updateRestaurant(id, patch);
    if (!updated)
      throw new AppError(
        404,
        "RESTAURANT_NOT_FOUND",
        "No restaurant found with that ID",
      );
    return updated;
  },

  addCategory(restaurantId: string, name: string, sort_order?: number) {
    const r = getRestaurant(restaurantId);
    if (!r)
      throw new AppError(
        404,
        "RESTAURANT_NOT_FOUND",
        "No restaurant found with that ID",
      );
    return addMenuCategory(restaurantId, name, sort_order ?? 0) as MenuCategory;
  },

  addItem(restaurantId: string, input: Partial<MenuItem>) {
    const r = getRestaurant(restaurantId);
    if (!r)
      throw new AppError(
        404,
        "RESTAURANT_NOT_FOUND",
        "No restaurant found with that ID",
      );
    if (!input.category_id)
      throw new AppError(
        400,
        "VALIDATION_ERROR",
        "category_id is required",
        "category_id",
      );
    const item = addMenuItem(restaurantId, {
      category_id: input.category_id,
      name: input.name ?? "",
      description: input.description,
      price: input.price ?? 0,
      image_url: input.image_url,
      is_available: input.is_available ?? true,
    } as any);
    return item;
  },

  updateItem(restaurantId: string, itemId: string, patch: Partial<MenuItem>) {
    const item = getMenuItem(restaurantId, itemId);
    if (!item) throw new AppError(404, "ITEM_NOT_FOUND", "Menu item not found");
    const updated = updateMenuItem(restaurantId, itemId, patch as any);
    return updated;
  },

  deleteItem(restaurantId: string, itemId: string) {
    const ok = deleteMenuItem(restaurantId, itemId);
    if (!ok) throw new AppError(404, "ITEM_NOT_FOUND", "Menu item not found");
    return { message: "Item deleted" };
  },
};
