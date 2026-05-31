import { AppError } from "../../lib/errors";
import { getUserById } from "../auth/auth.store";
import type { AuthContext } from "../auth/auth.types";
import { getOrder, saveOrder } from "../orders/orders.store";
import {
  buildDriverJobResponse,
  findNearbyDrivers,
  getDriverProfileSummary,
  getDriverTodaySummary,
} from "./drivers.matching";
import type {
  DriverJobRespondInput,
  DriverLocationInput,
  DriverStatusInput,
  NearbyDriversQueryInput,
} from "./drivers.schema";
import {
  ensureDriverRecord,
  recordLocationUpdate,
  updateDriverRecord,
} from "./drivers.store";

function assertDriver(auth: AuthContext) {
  if (auth.role !== "driver") {
    throw new AppError(
      403,
      "FORBIDDEN",
      "Only drivers can access this resource",
    );
  }
  const user = getUserById(auth.userId);
  if (!user) {
    throw new AppError(404, "USER_NOT_FOUND", "No user found with that ID");
  }
  return user;
}

function ensureJobOwnership(orderDriverId: string | null, auth: AuthContext) {
  if (orderDriverId !== null && orderDriverId !== auth.userId) {
    throw new AppError(
      403,
      "FORBIDDEN",
      "You do not have access to this order",
    );
  }
}

export const driversService = {
  getMe(auth: AuthContext) {
    const user = assertDriver(auth);
    const record = ensureDriverRecord(auth.userId);
    return {
      ...getDriverProfileSummary(auth.userId),
      id: user.id,
      name: user.name,
      vehicle_type: record.vehicle_type,
      status: record.status,
      rating: record.rating,
      today: getDriverTodaySummary(auth.userId),
    };
  },

  updateStatus(input: DriverStatusInput, auth: AuthContext) {
    assertDriver(auth);
    const current = ensureDriverRecord(auth.userId);
    const updated = updateDriverRecord(auth.userId, {
      status: input.status,
      onlineSince:
        input.status === "online"
          ? (current.onlineSince ?? new Date().toISOString())
          : input.status === "offline"
            ? null
            : current.onlineSince,
    });
    return {
      status: updated.status,
      updated: true,
    };
  },

  updateLocation(input: DriverLocationInput, auth: AuthContext) {
    assertDriver(auth);
    const record = ensureDriverRecord(auth.userId);
    if (record.status !== "online" && record.status !== "on_delivery") {
      throw new AppError(
        422,
        "DRIVER_OFFLINE",
        "Driver must be online to update location",
      );
    }

    const requests = recordLocationUpdate(auth.userId);
    if (requests > 30) {
      throw new AppError(429, "RATE_LIMITED", "Too many location updates");
    }

    updateDriverRecord(auth.userId, {
      lat: input.lat,
      lng: input.lng,
      bearing: input.bearing ?? null,
      last_location_at: new Date().toISOString(),
    });

    return { updated: true };
  },

  respondToJob(input: DriverJobRespondInput, auth: AuthContext) {
    assertDriver(auth);
    const order = getOrder(input.order_id);
    if (!order) {
      throw new AppError(404, "ORDER_NOT_FOUND", "No order found with that ID");
    }

    if (input.action === "accept") {
      if (order.driver_id && order.driver_id !== auth.userId) {
        throw new AppError(409, "JOB_TAKEN", "This job was already assigned");
      }
      const updated = saveOrder({
        ...order,
        driver_id: auth.userId,
      });
      updateDriverRecord(auth.userId, {
        status: "on_delivery",
        currentJob: null,
      });
      return updated;
    }

    ensureJobOwnership(order.driver_id, auth);
    return buildDriverJobResponse(order.id, false);
  },

  nearby(query: NearbyDriversQueryInput) {
    const drivers = findNearbyDrivers(query);
    return drivers;
  },
};
