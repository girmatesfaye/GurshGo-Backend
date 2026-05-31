import { randomUUID } from "node:crypto";

export type MenuItem = {
  id: string;
  category_id: string;
  name: string;
  description?: string;
  price: number;
  image_url?: string;
  is_available: boolean;
  createdAt: string;
  updatedAt: string;
};

export type MenuCategory = {
  id: string;
  name: string;
  sort_order: number;
  createdAt: string;
  updatedAt: string;
};

export type RestaurantRecord = {
  id: string;
  name: string;
  cuisine_type: string;
  description?: string;
  address?: string;
  lat?: number;
  lng?: number;
  phone?: string;
  rating?: number;
  review_count?: number;
  avg_prep_minutes?: number;
  delivery_fee?: number;
  min_order?: number;
  is_open: boolean;
  image_url?: string;
  createdAt: string;
  updatedAt: string;
};

const restaurants = new Map<string, RestaurantRecord>();
const categoriesByRestaurant = new Map<string, MenuCategory[]>();
const itemsByRestaurant = new Map<string, MenuItem[]>();

export function listRestaurants() {
  return Array.from(restaurants.values());
}

export function createRestaurant(
  payload: Omit<RestaurantRecord, "id" | "createdAt" | "updatedAt">,
) {
  const now = new Date().toISOString();
  const rec: RestaurantRecord = {
    id: randomUUID(),
    ...payload,
    createdAt: now,
    updatedAt: now,
  } as RestaurantRecord;

  restaurants.set(rec.id, rec);
  categoriesByRestaurant.set(rec.id, []);
  itemsByRestaurant.set(rec.id, []);
  return rec;
}

export function getRestaurant(id: string) {
  return restaurants.get(id) ?? null;
}

export function updateRestaurant(id: string, patch: Partial<RestaurantRecord>) {
  const curr = restaurants.get(id);
  if (!curr) return null;
  const updated = {
    ...curr,
    ...patch,
    updatedAt: new Date().toISOString(),
  } as RestaurantRecord;
  restaurants.set(id, updated);
  return updated;
}

export function addMenuCategory(
  restaurantId: string,
  name: string,
  sort_order = 0,
) {
  const now = new Date().toISOString();
  const cat: MenuCategory = {
    id: randomUUID(),
    name,
    sort_order,
    createdAt: now,
    updatedAt: now,
  };
  const list = categoriesByRestaurant.get(restaurantId) ?? [];
  list.push(cat);
  categoriesByRestaurant.set(restaurantId, list);
  return cat;
}

export function listMenuCategories(restaurantId: string) {
  return categoriesByRestaurant.get(restaurantId) ?? [];
}

export function addMenuItem(
  restaurantId: string,
  input: Omit<MenuItem, "id" | "createdAt" | "updatedAt">,
) {
  const now = new Date().toISOString();
  const item: MenuItem = {
    id: randomUUID(),
    ...input,
    createdAt: now,
    updatedAt: now,
  } as MenuItem;
  const list = itemsByRestaurant.get(restaurantId) ?? [];
  list.push(item);
  itemsByRestaurant.set(restaurantId, list);
  return item;
}

export function listMenuItems(restaurantId: string) {
  return itemsByRestaurant.get(restaurantId) ?? [];
}

export function getMenuItem(restaurantId: string, itemId: string) {
  const list = itemsByRestaurant.get(restaurantId) ?? [];
  return list.find((i) => i.id === itemId) ?? null;
}

export function updateMenuItem(
  restaurantId: string,
  itemId: string,
  patch: Partial<MenuItem>,
) {
  const list = itemsByRestaurant.get(restaurantId) ?? [];
  const idx = list.findIndex((i) => i.id === itemId);
  if (idx === -1) return null;
  const updated = {
    ...list[idx],
    ...patch,
    updatedAt: new Date().toISOString(),
  } as MenuItem;
  list[idx] = updated;
  itemsByRestaurant.set(restaurantId, list);
  return updated;
}

export function deleteMenuItem(restaurantId: string, itemId: string) {
  const list = itemsByRestaurant.get(restaurantId) ?? [];
  const idx = list.findIndex((i) => i.id === itemId);
  if (idx === -1) return false;
  list.splice(idx, 1);
  itemsByRestaurant.set(restaurantId, list);
  return true;
}
