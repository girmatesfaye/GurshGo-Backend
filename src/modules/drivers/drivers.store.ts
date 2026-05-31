export type DriverStatus = "offline" | "online" | "on_delivery";

export type DriverJobRequest = {
  order_id: string;
  expires_at: string;
  created_at: string;
};

export type DriverRecord = {
  userId: string;
  status: DriverStatus;
  vehicle_type: string;
  rating: number;
  lat: number | null;
  lng: number | null;
  bearing: number | null;
  last_location_at: string | null;
  todayDeliveries: number;
  todayEarnings: number;
  onlineSince: string | null;
  currentJob: DriverJobRequest | null;
};

export type NearbyDriverRecord = {
  driver_id: string;
  name: string;
  lat: number;
  lng: number;
  distance_km: number;
  rating: number;
  vehicle_type: string;
};

const driverRecords = new Map<string, DriverRecord>();
const locationBuckets = new Map<string, number[]>();

export function ensureDriverRecord(userId: string): DriverRecord {
  const existing = driverRecords.get(userId);
  if (existing) {
    return existing;
  }

  const record: DriverRecord = {
    userId,
    status: "offline",
    vehicle_type: "motorcycle",
    rating: 4.8,
    lat: null,
    lng: null,
    bearing: null,
    last_location_at: null,
    todayDeliveries: 0,
    todayEarnings: 0,
    onlineSince: null,
    currentJob: null,
  };

  driverRecords.set(userId, record);
  return record;
}

export function getDriverRecord(userId: string) {
  return driverRecords.get(userId) ?? null;
}

export function updateDriverRecord(
  userId: string,
  patch: Partial<DriverRecord>,
) {
  const current = ensureDriverRecord(userId);
  const updated: DriverRecord = {
    ...current,
    ...patch,
  };
  driverRecords.set(userId, updated);
  return updated;
}

export function listDriverRecords() {
  return Array.from(driverRecords.values());
}

export function recordLocationUpdate(userId: string) {
  const now = Date.now();
  const bucket = locationBuckets.get(userId) ?? [];
  const windowStart = now - 60_000;
  const nextBucket = bucket.filter((timestamp) => timestamp >= windowStart);
  nextBucket.push(now);
  locationBuckets.set(userId, nextBucket);
  return nextBucket.length;
}

export function clearDriverStore() {
  driverRecords.clear();
  locationBuckets.clear();
}
