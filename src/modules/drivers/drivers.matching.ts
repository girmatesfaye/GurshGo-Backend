import { getUserById } from "../auth/auth.store";
import { getRestaurant } from "../restaurants/restaurants.store";
import type { NearbyDriverRecord } from "./drivers.store";
import { listDriverRecords } from "./drivers.store";

const EARTH_RADIUS_KM = 6371;

function toRad(value: number) {
  return (value * Math.PI) / 180;
}

function distanceKm(lat1: number, lng1: number, lat2: number, lng2: number) {
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  return EARTH_RADIUS_KM * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export function findNearbyDrivers(input: {
  lat: number;
  lng: number;
  radius_km: number;
}): NearbyDriverRecord[] {
  return listDriverRecords()
    .filter(
      (driver) =>
        driver.status === "online" &&
        driver.lat !== null &&
        driver.lng !== null,
    )
    .map((driver) => ({
      driver_id: driver.userId,
      name: getUserById(driver.userId)?.name ?? "Driver",
      lat: driver.lat as number,
      lng: driver.lng as number,
      distance_km: distanceKm(
        input.lat,
        input.lng,
        driver.lat as number,
        driver.lng as number,
      ),
      rating: driver.rating,
      vehicle_type: driver.vehicle_type,
    }))
    .filter((driver) => driver.distance_km <= input.radius_km)
    .sort((left, right) => left.distance_km - right.distance_km);
}

export function buildDriverJobResponse(orderId: string, accepted: boolean) {
  return {
    order_id: orderId,
    accepted,
    message: accepted ? "Job accepted" : "Job declined",
  };
}

export function getDriverTodaySummary(userId: string) {
  const driver = listDriverRecords().find((record) => record.userId === userId);
  return {
    deliveries: driver?.todayDeliveries ?? 0,
    earnings: driver?.todayEarnings ?? 0,
    online_minutes: driver?.onlineSince
      ? Math.max(
          0,
          Math.floor(
            (Date.now() - new Date(driver.onlineSince).getTime()) / 60000,
          ),
        )
      : 0,
  };
}

export function getDriverProfileSummary(userId: string) {
  const driver = listDriverRecords().find((record) => record.userId === userId);
  const user = getUserById(userId);
  return {
    id: user?.id ?? userId,
    name: user?.name ?? "Driver",
    vehicle_type: driver?.vehicle_type ?? "motorcycle",
    status: driver?.status ?? "offline",
    rating: driver?.rating ?? 0,
    today: getDriverTodaySummary(userId),
  };
}

export function isRestaurantNearby(restaurantId: string) {
  return Boolean(getRestaurant(restaurantId));
}
