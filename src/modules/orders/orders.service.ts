import { AppError } from "../../lib/errors";
import { getUserById } from "../auth/auth.store";
import type { AuthContext } from "../auth/auth.types";
import { getRestaurant, listMenuItems } from "../restaurants/restaurants.store";
import { getAddress } from "../users/users.store";
import type {
  CancelOrderInput,
  CreateOrderInput,
  ListOrdersQueryInput,
  UpdateOrderStatusInput,
} from "./orders.schema";
import {
  canTransition,
  type OrderRole,
  type OrderStatus,
} from "./orders.state-machine";
import {
  createOrder,
  createPromotion,
  getOrder,
  getPromotion,
  listOrders,
  saveOrder,
  usePromotion,
} from "./orders.store";

const TAX_RATE = 0.04833333333333333;

function roundCurrency(value: number) {
  return Math.round(value * 100) / 100;
}

function nowIso() {
  return new Date().toISOString();
}

function toSummary(order: ReturnType<typeof getOrder>) {
  if (!order) return null;
  return {
    id: order.id,
    status: order.status,
    subtotal: order.subtotal,
    delivery_fee: order.delivery_fee,
    discount: order.discount,
    tax: order.tax,
    tip: order.tip,
    total: order.total,
    estimated_delivery_minutes: order.estimated_delivery_minutes,
    placed_at: order.placed_at,
  };
}

function buildAuthContext(role: OrderRole, auth: AuthContext) {
  return { role, auth };
}

function assertOrderAccess(
  order: NonNullable<ReturnType<typeof getOrder>>,
  auth: AuthContext,
  role: OrderRole,
) {
  if (role === "admin") return;
  if (role === "customer" && order.customer_id !== auth.userId) {
    throw new AppError(
      403,
      "FORBIDDEN",
      "You do not have access to this order",
    );
  }
  if (role === "merchant") {
    const restaurant = getRestaurant(order.restaurant_id);
    if (!restaurant || restaurant.owner_id !== auth.userId) {
      throw new AppError(
        403,
        "FORBIDDEN",
        "You do not have access to this order",
      );
    }
  }
  if (role === "driver" && order.driver_id !== auth.userId) {
    throw new AppError(
      403,
      "FORBIDDEN",
      "You do not have access to this order",
    );
  }
}

function getAuthRole(auth: AuthContext): OrderRole {
  return auth.role as OrderRole;
}

function getTransitionActor(role: OrderRole): OrderRole {
  return role;
}

export const ordersService = {
  create(input: CreateOrderInput, auth: AuthContext) {
    const customer = getUserById(auth.userId);
    if (!customer) {
      throw new AppError(404, "USER_NOT_FOUND", "No user found with that ID");
    }

    const restaurant = getRestaurant(input.restaurant_id);
    if (!restaurant) {
      throw new AppError(
        404,
        "RESTAURANT_NOT_FOUND",
        "No restaurant found with that ID",
      );
    }
    if (!restaurant.is_open) {
      throw new AppError(
        422,
        "RESTAURANT_CLOSED",
        "Restaurant is not accepting orders",
      );
    }

    const address = getAddress(auth.userId, input.delivery_address_id);
    if (!address) {
      throw new AppError(
        404,
        "ADDRESS_NOT_FOUND",
        "Delivery address not found",
      );
    }

    const menuItems = listMenuItems(input.restaurant_id);
    const snapshot = input.items.map((item) => {
      const menuItem = menuItems.find((menu) => menu.id === item.menu_item_id);
      if (!menuItem || !menuItem.is_available) {
        throw new AppError(
          422,
          "ITEM_UNAVAILABLE",
          "One or more items are not available",
        );
      }
      const lineTotal = roundCurrency(menuItem.price * item.quantity);
      return {
        menu_item_id: menuItem.id,
        name: menuItem.name,
        quantity: item.quantity,
        unit_price: roundCurrency(menuItem.price),
        subtotal: lineTotal,
        notes: item.notes,
      };
    });

    const subtotal = roundCurrency(
      snapshot.reduce((sum, item) => sum + item.subtotal, 0),
    );
    if (
      typeof restaurant.min_order === "number" &&
      subtotal < restaurant.min_order
    ) {
      throw new AppError(422, "BELOW_MIN_ORDER", "Order total below minimum");
    }

    let discount = 0;
    let promoSnapshot: ReturnType<typeof getPromotion> | null = null;
    if (input.promo_code) {
      const promo = getPromotion(input.restaurant_id, input.promo_code);
      if (!promo || !promo.active) {
        throw new AppError(
          422,
          "INVALID_PROMO",
          "Promo code invalid or expired",
        );
      }
      if (
        promo.expires_at &&
        new Date(promo.expires_at).getTime() <= Date.now()
      ) {
        throw new AppError(
          422,
          "INVALID_PROMO",
          "Promo code invalid or expired",
        );
      }
      if (promo.min_order_value && subtotal < promo.min_order_value) {
        throw new AppError(
          422,
          "INVALID_PROMO",
          "Promo code invalid or expired",
        );
      }
      if (promo.max_uses && promo.used_count >= promo.max_uses) {
        throw new AppError(
          422,
          "PROMO_MAX_REACHED",
          "Promo code usage limit hit",
        );
      }

      const updated = usePromotion(input.restaurant_id, input.promo_code);
      if (!updated) {
        throw new AppError(
          422,
          "INVALID_PROMO",
          "Promo code invalid or expired",
        );
      }
      promoSnapshot = updated;
      discount =
        promo.type === "percent"
          ? roundCurrency(subtotal * (promo.value / 100))
          : roundCurrency(promo.value);
    }

    const deliveryFee = roundCurrency(restaurant.delivery_fee ?? 0);
    const tax = roundCurrency(subtotal * TAX_RATE);
    const tip = roundCurrency(input.tip_amount ?? 0);
    const total = roundCurrency(subtotal + deliveryFee + tax + tip - discount);
    const order = createOrder({
      customer_id: auth.userId,
      restaurant_id: input.restaurant_id,
      driver_id: null,
      delivery_address_id: input.delivery_address_id,
      status: "PENDING",
      subtotal,
      delivery_fee: deliveryFee,
      discount,
      tax,
      tip,
      total,
      estimated_delivery_minutes: restaurant.avg_prep_minutes ?? 40,
      payment_method: input.payment_method,
      payment: {
        stripe_client_secret: `pi_${Math.random().toString(36).slice(2)}_secret_${Math.random().toString(36).slice(2)}`,
        status:
          input.payment_method === "card"
            ? "requires_confirmation"
            : "not_required",
      },
      promo_code: input.promo_code ?? null,
      promo_snapshot: promoSnapshot
        ? {
            code: promoSnapshot.code,
            type: promoSnapshot.type,
            value: promoSnapshot.value,
          }
        : null,
      items_snapshot: snapshot,
      placed_at: nowIso(),
      confirmed_at: null,
      preparing_at: null,
      ready_at: null,
      picked_up_at: null,
      on_the_way_at: null,
      delivered_at: null,
      cancelled_at: null,
    });

    return order;
  },

  list(query: ListOrdersQueryInput, auth: AuthContext) {
    const role = getAuthRole(auth);
    let orders = listOrders();

    if (role === "customer") {
      orders = orders.filter((order) => order.customer_id === auth.userId);
    } else if (role === "merchant") {
      orders = orders.filter((order) => {
        const restaurant = getRestaurant(order.restaurant_id);
        return restaurant?.owner_id === auth.userId;
      });
    } else if (role === "driver") {
      orders = orders.filter((order) => order.driver_id === auth.userId);
    }

    if (query.status) {
      orders = orders.filter((order) => order.status === query.status);
    }
    const from = query.from;
    const to = query.to;
    if (from) {
      orders = orders.filter((order) => order.placed_at >= from);
    }
    if (to) {
      orders = orders.filter((order) => order.placed_at <= to);
    }

    const page = query.page ?? 1;
    const perPage = query.per_page ?? 20;
    const total = orders.length;
    const pageItems = orders
      .slice((page - 1) * perPage, (page - 1) * perPage + perPage)
      .map((order) => toSummary(order));
    return { data: pageItems, meta: { page, per_page: perPage, total } };
  },

  get(orderId: string, auth: AuthContext) {
    const order = getOrder(orderId);
    if (!order) {
      throw new AppError(404, "ORDER_NOT_FOUND", "No order found with that ID");
    }
    assertOrderAccess(order, auth, getAuthRole(auth));
    return order;
  },

  updateStatus(
    orderId: string,
    input: UpdateOrderStatusInput,
    auth: AuthContext,
  ) {
    const order = getOrder(orderId);
    if (!order) {
      throw new AppError(404, "ORDER_NOT_FOUND", "No order found with that ID");
    }

    const role = getAuthRole(auth);
    if (role !== "admin") {
      assertOrderAccess(order, auth, role);
    }

    if (!canTransition(getTransitionActor(role), order.status, input.status)) {
      throw new AppError(
        422,
        "INVALID_STATUS_TRANSITION",
        "State machine transition not allowed",
      );
    }

    const next: any = {
      ...order,
      status: input.status as OrderStatus,
    };

    const timestamp = nowIso();
    if (input.status === "CONFIRMED") next.confirmed_at = timestamp;
    if (input.status === "PREPARING") next.preparing_at = timestamp;
    if (input.status === "READY") next.ready_at = timestamp;
    if (input.status === "PICKED_UP") next.picked_up_at = timestamp;
    if (input.status === "ON_THE_WAY") next.on_the_way_at = timestamp;
    if (input.status === "DELIVERED") next.delivered_at = timestamp;
    if (input.status === "CANCELLED") next.cancelled_at = timestamp;
    if (typeof input.prep_minutes === "number") {
      next.estimated_delivery_minutes = input.prep_minutes;
    }

    return saveOrder(next);
  },

  cancel(orderId: string, input: CancelOrderInput, auth: AuthContext) {
    const order = getOrder(orderId);
    if (!order) {
      throw new AppError(404, "ORDER_NOT_FOUND", "No order found with that ID");
    }

    const role = getAuthRole(auth);
    if (role !== "admin") {
      assertOrderAccess(order, auth, role);
    }

    if (order.status === "DELIVERED" || order.status === "CANCELLED") {
      throw new AppError(
        422,
        "INVALID_STATUS_TRANSITION",
        "State machine transition not allowed",
      );
    }

    const allowed =
      role === "merchant" || role === "customer" || role === "admin";
    if (!allowed) {
      throw new AppError(
        403,
        "FORBIDDEN",
        "You do not have access to cancel this order",
      );
    }

    return saveOrder({
      ...order,
      status: "CANCELLED",
      reason: input.reason,
      cancelled_at: nowIso(),
    } as any);
  },

  seedPromotion(input: Parameters<typeof createPromotion>[0]) {
    return createPromotion(input);
  },
};
