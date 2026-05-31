import { randomUUID } from "node:crypto";

import type { OrderStatus } from "./orders.state-machine";

export type OrderItemSnapshot = {
  menu_item_id: string;
  name: string;
  quantity: number;
  unit_price: number;
  subtotal: number;
  notes?: string;
};

export type OrderRecord = {
  id: string;
  customer_id: string;
  restaurant_id: string;
  driver_id: string | null;
  delivery_address_id: string;
  status: OrderStatus;
  subtotal: number;
  delivery_fee: number;
  discount: number;
  tax: number;
  tip: number;
  total: number;
  estimated_delivery_minutes: number;
  payment_method: "card" | "cash";
  payment: {
    stripe_client_secret: string;
    status: string;
    stripe_payment_intent_id?: string;
    refund_amount?: number;
    refund_reason?: string;
    refund_id?: string;
  };
  promo_code: string | null;
  promo_snapshot: {
    code: string;
    type: "percent" | "fixed";
    value: number;
  } | null;
  items_snapshot: OrderItemSnapshot[];
  notes?: string;
  reason?: string;
  placed_at: string;
  confirmed_at: string | null;
  preparing_at: string | null;
  ready_at: string | null;
  picked_up_at: string | null;
  on_the_way_at: string | null;
  delivered_at: string | null;
  cancelled_at: string | null;
  createdAt: string;
  updatedAt: string;
};

export type PromotionRecord = {
  id: string;
  restaurant_id: string;
  code: string;
  type: "percent" | "fixed";
  value: number;
  min_order_value?: number;
  max_uses?: number;
  used_count: number;
  expires_at?: string;
  active: boolean;
};

const orders = new Map<string, OrderRecord>();
const promotions = new Map<string, PromotionRecord>();

export function createOrder(
  input: Omit<OrderRecord, "id" | "createdAt" | "updatedAt">,
) {
  const now = new Date().toISOString();
  const order: OrderRecord = {
    id: randomUUID(),
    ...input,
    createdAt: now,
    updatedAt: now,
  };
  orders.set(order.id, order);
  return order;
}

export function getOrder(orderId: string) {
  return orders.get(orderId) ?? null;
}

export function saveOrder(order: OrderRecord) {
  orders.set(order.id, { ...order, updatedAt: new Date().toISOString() });
  return orders.get(order.id)!;
}

export function listOrders() {
  return Array.from(orders.values());
}

export function createPromotion(
  input: Omit<PromotionRecord, "id" | "used_count">,
) {
  const promo: PromotionRecord = {
    id: randomUUID(),
    ...input,
    used_count: 0,
  };
  promotions.set(`${promo.restaurant_id}:${promo.code.toUpperCase()}`, promo);
  return promo;
}

export function getPromotion(restaurantId: string, code: string) {
  return promotions.get(`${restaurantId}:${code.toUpperCase()}`) ?? null;
}

export function usePromotion(restaurantId: string, code: string) {
  const promo = getPromotion(restaurantId, code);
  if (!promo || !promo.active) return null;
  const next = { ...promo, used_count: promo.used_count + 1 };
  promotions.set(`${restaurantId}:${code.toUpperCase()}`, next);
  return next;
}

export function clearOrders() {
  orders.clear();
  promotions.clear();
}
