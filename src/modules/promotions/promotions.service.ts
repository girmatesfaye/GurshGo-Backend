import { AppError } from "../../lib/errors";
import type { AuthContext } from "../auth/auth.types";
import {
  createPromotion,
  deactivatePromotionById,
  getPromotion,
  listPromotions,
} from "../orders/orders.store";
import { getRestaurant } from "../restaurants/restaurants.store";

export const promotionsService = {
  create(input: any, auth: AuthContext) {
    if (auth.role !== "merchant") {
      throw new AppError(
        403,
        "FORBIDDEN",
        "Only merchants can create promotions",
      );
    }

    const restaurant = getRestaurant(input.restaurant_id);
    if (!restaurant) {
      throw new AppError(
        404,
        "RESTAURANT_NOT_FOUND",
        "No restaurant found with that ID",
      );
    }
    if (restaurant.owner_id !== auth.userId) {
      throw new AppError(403, "FORBIDDEN", "You do not own this restaurant");
    }

    const promo = createPromotion({
      restaurant_id: input.restaurant_id,
      code: input.code,
      type: input.type,
      value: input.value,
      min_order_value: input.min_order_value,
      max_uses: input.max_uses,
      expires_at: input.expires_at,
      active: true,
    });

    return promo;
  },

  validate(input: {
    restaurant_id: string;
    code: string;
    order_subtotal: number;
  }) {
    const promo = getPromotion(input.restaurant_id, input.code);
    if (!promo || !promo.active) {
      return { valid: false, message: "This code is invalid or expired" };
    }

    if (
      promo.expires_at &&
      new Date(promo.expires_at).getTime() <= Date.now()
    ) {
      return { valid: false, message: "This code has expired" };
    }

    if (promo.min_order_value && input.order_subtotal < promo.min_order_value) {
      return { valid: false, message: "Order value below promo minimum" };
    }

    if (promo.max_uses && promo.used_count >= promo.max_uses) {
      return { valid: false, message: "This code has reached its usage limit" };
    }

    const discount_amount =
      promo.type === "percent"
        ? Math.round(input.order_subtotal * (promo.value / 100) * 100) / 100
        : Math.min(promo.value, input.order_subtotal);

    return {
      valid: true,
      type: promo.type,
      value: promo.value,
      discount_amount,
      message:
        promo.type === "percent"
          ? `${promo.value}% off applied!`
          : `₦${discount_amount} off applied!`,
    };
  },

  listForMerchant(auth: AuthContext, page: number, per_page: number) {
    if (auth.role !== "merchant") {
      throw new AppError(
        403,
        "FORBIDDEN",
        "Only merchants can list promotions",
      );
    }

    // find restaurants owned by this merchant
    const owned = new Set<string>();
    // lazy import to avoid circular issues
    const { listRestaurants } = require("../restaurants/restaurants.store");
    const all = listRestaurants();
    for (const r of all) {
      if (r.owner_id === auth.userId) owned.add(r.id);
    }

    const promos = [] as any[];
    for (const id of owned) {
      const list = listPromotions(id);
      for (const p of list) promos.push(p);
    }

    const total = promos.length;
    const items = promos.slice(
      (page - 1) * per_page,
      (page - 1) * per_page + per_page,
    );
    return { data: items, meta: { page, per_page, total } };
  },

  deactivate(promoId: string, auth: AuthContext) {
    if (auth.role !== "merchant") {
      throw new AppError(
        403,
        "FORBIDDEN",
        "Only merchants can deactivate promotions",
      );
    }

    // ensure owner
    const { getPromotionById } = require("../orders/orders.store");
    const target = getPromotionById(promoId);
    if (!target) {
      throw new AppError(404, "PROMO_NOT_FOUND", "Promotion not found");
    }

    const restaurant = getRestaurant(target.restaurant_id);
    if (!restaurant || restaurant.owner_id !== auth.userId) {
      throw new AppError(
        403,
        "FORBIDDEN",
        "You do not own this promotion's restaurant",
      );
    }

    const updated = deactivatePromotionById(promoId);
    return updated;
  },
};
