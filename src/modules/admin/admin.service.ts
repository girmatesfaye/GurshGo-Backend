import { AppError } from "../../lib/errors";
import {
  listUsers as listUsersStore,
  suspendUser as suspendUserStore,
  updateUser as updateUserStore,
} from "../auth/auth.store";
import { listDriverRecords } from "../drivers/drivers.store";
import { ordersService } from "../orders/orders.service";
import type { OrderStatus } from "../orders/orders.state-machine";
import { listOrders } from "../orders/orders.store";
import { getRestaurant } from "../restaurants/restaurants.store";

function roundCurrency(value: number) {
  return Math.round(value * 100) / 100;
}

export const adminService = {
  listOrders(filters: {
    status?: string;
    restaurant_id?: string;
    customer_id?: string;
    driver_id?: string;
    from?: string;
    to?: string;
    page?: number;
    per_page?: number;
  }) {
    let orders = listOrders();
    if (filters.status)
      orders = orders.filter((o) => o.status === filters.status);
    if (filters.restaurant_id)
      orders = orders.filter((o) => o.restaurant_id === filters.restaurant_id);
    if (filters.customer_id)
      orders = orders.filter((o) => o.customer_id === filters.customer_id);
    if (filters.driver_id)
      orders = orders.filter((o) => o.driver_id === filters.driver_id);
    if (filters.from)
      orders = orders.filter((o) => o.placed_at >= filters.from!);
    if (filters.to) orders = orders.filter((o) => o.placed_at <= filters.to!);

    const page = filters.page ?? 1;
    const per_page = filters.per_page ?? 20;
    const total = orders.length;
    const data = orders.slice(
      (page - 1) * per_page,
      (page - 1) * per_page + per_page,
    );
    return { data, meta: { page, per_page, total } };
  },

  forceUpdateOrderStatus(
    orderId: string,
    input: { status: string; prep_minutes?: number },
    auth: any,
  ) {
    // ordersService.updateStatus will perform validation and allow admin to bypass ownership checks
    return ordersService.updateStatus(
      orderId,
      { status: input.status as OrderStatus, prep_minutes: input.prep_minutes },
      auth,
    );
  },

  listUsers(q?: string, page = 1, per_page = 20) {
    const all = listUsersStore(q);
    const total = all.length;
    const pageItems = all
      .slice((page - 1) * per_page, (page - 1) * per_page + per_page)
      .map((u) => ({
        id: u.id,
        name: u.name,
        phone: u.phone,
        email: u.email,
        role: u.role,
        created_at: u.createdAt,
        is_suspended: u.is_suspended ?? false,
      }));
    return { data: pageItems, meta: { page, per_page, total } };
  },

  updateUser(
    userId: string,
    patch: { name?: string; email?: string | null; is_suspended?: boolean },
  ) {
    if (typeof patch.is_suspended === "boolean") {
      const updated = suspendUserStore(userId, patch.is_suspended);
      if (!updated)
        throw new AppError(404, "USER_NOT_FOUND", "No user found with that ID");
      // also allow changing name/email
      const after = updateUserStore(userId, {
        name: patch.name ?? updated.name,
        email: patch.email === undefined ? updated.email : patch.email,
      });
      return {
        id: after!.id,
        name: after!.name,
        phone: after!.phone,
        email: after!.email,
        role: after!.role,
        created_at: after!.createdAt,
        is_suspended: after!.is_suspended ?? false,
      };
    }

    const updated = updateUserStore(userId, {
      name: patch.name,
      email: patch.email === undefined ? undefined : patch.email,
    });
    if (!updated)
      throw new AppError(404, "USER_NOT_FOUND", "No user found with that ID");
    return {
      id: updated.id,
      name: updated.name,
      phone: updated.phone,
      email: updated.email,
      role: updated.role,
      created_at: updated.createdAt,
      is_suspended: updated.is_suspended ?? false,
    };
  },

  processPayouts() {
    const delivered = listOrders().filter((o) => o.status === "DELIVERED");
    const merchantMap = new Map<string, number>();
    const driverMap = new Map<string, number>();

    for (const o of delivered) {
      const restaurant = getRestaurant(o.restaurant_id);
      const merchantId = restaurant?.owner_id ?? "unknown";
      const merchantAmount = Math.max(o.subtotal - o.discount, 0);
      merchantMap.set(
        merchantId,
        (merchantMap.get(merchantId) ?? 0) + merchantAmount,
      );

      if (o.driver_id) {
        const driverAmount = (o.delivery_fee ?? 0) + (o.tip ?? 0);
        driverMap.set(
          o.driver_id,
          (driverMap.get(o.driver_id) ?? 0) + driverAmount,
        );
      }
    }

    const merchants = Array.from(merchantMap.entries()).map(
      ([merchant_id, amount]) => ({
        merchant_id,
        amount: roundCurrency(amount),
      }),
    );
    const drivers = Array.from(driverMap.entries()).map(
      ([driver_id, amount]) => ({ driver_id, amount: roundCurrency(amount) }),
    );

    return { merchants, drivers, processed_at: new Date().toISOString() };
  },

  metrics(period: string, from?: string, to?: string) {
    const start = from
      ? new Date(from)
      : (() => {
          const d = new Date();
          if (period === "today") {
            d.setUTCHours(0, 0, 0, 0);
          } else if (period === "week") {
            d.setUTCDate(d.getUTCDate() - 6);
            d.setUTCHours(0, 0, 0, 0);
          } else if (period === "month") {
            d.setUTCDate(d.getUTCDate() - 29);
            d.setUTCHours(0, 0, 0, 0);
          }
          return d;
        })();
    const end = to ? new Date(to) : new Date();

    const orders = listOrders().filter((o) => {
      if (o.status !== "DELIVERED") return false;
      const ts = o.delivered_at ?? o.placed_at;
      if (!ts) return false;
      const t = new Date(ts);
      return t >= start && t <= end;
    });

    const gmv = roundCurrency(orders.reduce((s, o) => s + (o.total ?? 0), 0));
    const activeUsers = new Set(orders.map((o) => o.customer_id)).size;

    // orders per hour
    const byHour: Record<string, number> = {};
    for (const o of orders) {
      const t = new Date(o.delivered_at ?? o.placed_at);
      const key = t.toISOString().slice(0, 13) + ":00:00Z"; // hourly bucket
      byHour[key] = (byHour[key] ?? 0) + 1;
    }

    const driverRecords = listDriverRecords();
    const totalDrivers = driverRecords.length;
    const activeDrivers = driverRecords.filter(
      (d) =>
        d.status === "on_delivery" ||
        (d.todayDeliveries && d.todayDeliveries > 0),
    ).length;
    const driver_utilization =
      totalDrivers === 0
        ? 0
        : Math.round((activeDrivers / totalDrivers) * 10000) / 10000;

    return {
      gmv,
      active_users: activeUsers,
      orders_per_hour: byHour,
      driver_utilization,
    };
  },
};
