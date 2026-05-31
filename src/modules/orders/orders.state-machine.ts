export type OrderStatus =
  | "PENDING"
  | "CONFIRMED"
  | "PREPARING"
  | "READY"
  | "PICKED_UP"
  | "ON_THE_WAY"
  | "DELIVERED"
  | "CANCELLED";

export type OrderRole = "customer" | "merchant" | "driver" | "admin" | "system";

const transitions: Record<OrderRole, Array<[OrderStatus, OrderStatus]>> = {
  customer: [
    ["PENDING", "CANCELLED"],
    ["CONFIRMED", "CANCELLED"],
  ],
  merchant: [
    ["PENDING", "CONFIRMED"],
    ["CONFIRMED", "PREPARING"],
    ["PREPARING", "READY"],
  ],
  driver: [
    ["READY", "PICKED_UP"],
    ["PICKED_UP", "ON_THE_WAY"],
    ["ON_THE_WAY", "DELIVERED"],
  ],
  admin: [],
  system: [
    ["PENDING", "CANCELLED"],
    ["CONFIRMED", "CANCELLED"],
  ],
};

export function canTransition(
  role: OrderRole,
  from: OrderStatus,
  to: OrderStatus,
) {
  return transitions[role].some(
    ([current, next]) => current === from && next === to,
  );
}
