import { randomUUID } from "node:crypto";

import { AppError } from "../../lib/errors";
import type { AuthContext } from "../auth/auth.types";
import type { OrderRecord } from "../orders/orders.store";
import { getOrder, listOrders, saveOrder } from "../orders/orders.store";
import { getRestaurant } from "../restaurants/restaurants.store";
import type {
  ConfirmPaymentInput,
  PayoutQueryInput,
  RefundPaymentInput,
} from "./payments.schema";

type PayoutRecord = {
  id: string;
  order_id: string;
  amount: number;
  status: string;
  paid_at: string;
};

function roundCurrency(value: number) {
  return Math.round(value * 100) / 100;
}

function nowIso() {
  return new Date().toISOString();
}

function assertOrderCustomer(order: OrderRecord, auth: AuthContext) {
  if (order.customer_id !== auth.userId) {
    throw new AppError(
      403,
      "FORBIDDEN",
      "You do not have access to this order",
    );
  }
}

function buildMerchantPayout(order: OrderRecord): PayoutRecord {
  const amount = roundCurrency(Math.max(order.subtotal - order.discount, 0));
  return {
    id: randomUUID(),
    order_id: order.id,
    amount,
    status: "paid",
    paid_at: order.delivered_at ?? order.picked_up_at ?? order.placed_at,
  };
}

function buildDriverPayout(order: OrderRecord): PayoutRecord {
  const amount = roundCurrency((order.delivery_fee ?? 0) + (order.tip ?? 0));
  return {
    id: randomUUID(),
    order_id: order.id,
    amount,
    status: "paid",
    paid_at: order.delivered_at ?? order.picked_up_at ?? order.placed_at,
  };
}

export const paymentsService = {
  confirm(input: ConfirmPaymentInput, auth: AuthContext) {
    const order = getOrder(input.order_id);
    if (!order) {
      throw new AppError(404, "ORDER_NOT_FOUND", "No order found with that ID");
    }

    assertOrderCustomer(order, auth);

    if (order.payment_method !== "card") {
      throw new AppError(
        422,
        "PAYMENT_FAILED",
        "Card payment is required for confirmation",
      );
    }

    if (order.payment.status === "succeeded") {
      return order;
    }

    const updated = saveOrder({
      ...order,
      payment: {
        ...order.payment,
        status: "succeeded",
        stripe_payment_intent_id: input.stripe_payment_intent_id,
      },
    });

    return updated;
  },

  refund(input: RefundPaymentInput, auth: AuthContext) {
    if (auth.role !== "admin") {
      throw new AppError(403, "FORBIDDEN", "Only admin can issue refunds");
    }

    const order = getOrder(input.order_id);
    if (!order) {
      throw new AppError(404, "ORDER_NOT_FOUND", "No order found with that ID");
    }

    const amount = roundCurrency(input.amount ?? order.total);
    if (amount <= 0 || amount > order.total) {
      throw new AppError(422, "PAYMENT_FAILED", "Refund amount is invalid");
    }

    const refundId = `re_${randomUUID().replace(/-/g, "")}`;
    const updated = saveOrder({
      ...order,
      payment: {
        ...order.payment,
        status: amount >= order.total ? "refunded" : "partially_refunded",
        refund_amount: amount,
        refund_reason: input.reason,
        refund_id: refundId,
      },
    });

    return {
      order: updated,
      refund_id: refundId,
      amount,
      reason: input.reason,
    };
  },

  payouts(query: PayoutQueryInput, auth: AuthContext) {
    const role = auth.role;
    if (role !== "merchant" && role !== "driver") {
      throw new AppError(403, "FORBIDDEN", "You do not have access to payouts");
    }

    const from = query.from;
    const to = query.to;
    const status = query.status;
    const page = query.page ?? 1;

    let filtered = listOrders().filter((order) => order.status === "DELIVERED");

    if (role === "merchant") {
      filtered = filtered.filter((order) => {
        const restaurant = getRestaurant(order.restaurant_id);
        return restaurant?.owner_id === auth.userId;
      });
    } else {
      filtered = filtered.filter((order) => order.driver_id === auth.userId);
    }

    if (from) {
      filtered = filtered.filter((order) => order.placed_at >= from);
    }
    if (to) {
      filtered = filtered.filter((order) => order.placed_at <= to);
    }
    if (status) {
      filtered = filtered.filter((order) => {
        const payoutStatus = role === "merchant" ? "paid" : "paid";
        return payoutStatus === status;
      });
    }

    const payouts = filtered.map((order) =>
      role === "merchant"
        ? buildMerchantPayout(order)
        : buildDriverPayout(order),
    );
    const per_page = 20;
    const total = payouts.length;
    const pageItems = payouts.slice(
      (page - 1) * per_page,
      (page - 1) * per_page + per_page,
    );
    const totalEarned = roundCurrency(
      payouts.reduce((sum, payout) => sum + payout.amount, 0),
    );

    return {
      data: pageItems,
      meta: {
        page,
        per_page,
        total,
        total_earned: totalEarned,
      },
    };
  },

  handleStripeWebhook(event: { type: string; data?: any }) {
    return {
      received: true,
      type: event.type,
      timestamp: nowIso(),
    };
  },
};
