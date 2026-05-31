import { AppError } from "../../lib/errors";
import { listOrders } from "../orders/orders.store";
import { getRestaurant } from "../restaurants/restaurants.store";

function startOfDayISO(d: Date) {
  const nd = new Date(d);
  nd.setUTCHours(0, 0, 0, 0);
  return nd.toISOString();
}

function addDays(date: Date, days: number) {
  const d = new Date(date);
  d.setUTCDate(d.getUTCDate() + days);
  return d;
}

function formatDateYMD(d: Date) {
  return d.toISOString().slice(0, 10);
}

export const analyticsService = {
  summaryForMerchant(
    userId: string,
    period: string,
    from?: string,
    to?: string,
  ) {
    let start: Date;
    let end: Date = new Date();

    if (period === "today") {
      start = new Date();
      start.setUTCHours(0, 0, 0, 0);
    } else if (period === "week") {
      start = addDays(new Date(), -6);
      start.setUTCHours(0, 0, 0, 0);
    } else if (period === "month") {
      start = addDays(new Date(), -29);
      start.setUTCHours(0, 0, 0, 0);
    } else if (period === "custom") {
      if (!from || !to)
        throw new AppError(
          400,
          "INVALID_INPUT",
          "Provide from and to for custom period",
        );
      start = new Date(from);
      end = new Date(to);
      if (isNaN(start.getTime()) || isNaN(end.getTime()))
        throw new AppError(400, "INVALID_INPUT", "Invalid from/to dates");
    } else {
      throw new AppError(400, "INVALID_INPUT", "Unknown period");
    }

    const orders = listOrders().filter((o) => {
      const restaurant = getRestaurant(o.restaurant_id);
      if (!restaurant || restaurant.owner_id !== userId) return false;
      // Only include delivered orders for revenue
      if (o.status !== "DELIVERED") return false;
      const ts = o.delivered_at ?? o.placed_at;
      if (!ts) return false;
      const t = new Date(ts);
      return t >= start && t <= end;
    });

    const totalRevenue = orders.reduce((sum, o) => sum + (o.total ?? 0), 0);
    const totalOrders = orders.length;
    const avgOrder = totalOrders ? totalRevenue / totalOrders : 0;

    // build revenue by day
    const days: Record<string, number> = {};
    const s = new Date(start);
    const e = new Date(end);
    // normalize to start of day utc
    s.setUTCHours(0, 0, 0, 0);
    e.setUTCHours(23, 59, 59, 999);
    for (let d = new Date(s); d <= e; d = addDays(d, 1)) {
      days[formatDateYMD(d)] = 0;
    }

    for (const o of orders) {
      const ts = o.delivered_at ?? o.placed_at;
      if (!ts) continue;
      const d = new Date(ts);
      const key = formatDateYMD(d);
      if (typeof days[key] === "number") days[key] += o.total ?? 0;
    }

    const revenue_by_day = Object.keys(days).map((date) => ({
      date,
      revenue: Math.round(days[date] * 100) / 100,
    }));

    return {
      total_revenue: Math.round(totalRevenue * 100) / 100,
      total_orders: totalOrders,
      average_order_value: Math.round(avgOrder * 100) / 100,
      revenue_by_day,
      period,
      from: start.toISOString(),
      to: end.toISOString(),
    };
  },
};
