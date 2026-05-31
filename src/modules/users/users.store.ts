import { randomUUID } from "node:crypto";

export type AddressRecord = {
  id: string;
  label: string;
  street: string;
  city: string;
  lat?: number;
  lng?: number;
  is_default: boolean;
  createdAt: string;
  updatedAt: string;
};

const addressesByUser = new Map<string, AddressRecord[]>();

export function listAddresses(userId: string) {
  return addressesByUser.get(userId) ?? [];
}

export function addAddress(
  userId: string,
  payload: Omit<AddressRecord, "id" | "createdAt" | "updatedAt">,
) {
  const now = new Date().toISOString();
  const addr: AddressRecord = {
    id: randomUUID(),
    ...payload,
    createdAt: now,
    updatedAt: now,
  };

  const list = addressesByUser.get(userId) ?? [];
  if (addr.is_default) {
    // unset other defaults
    for (const a of list) a.is_default = false;
  }

  list.push(addr);
  addressesByUser.set(userId, list);
  return addr;
}

export function getAddress(userId: string, addressId: string) {
  const list = addressesByUser.get(userId) ?? [];
  return list.find((a) => a.id === addressId) ?? null;
}

export function updateAddress(
  userId: string,
  addressId: string,
  patch: Partial<Omit<AddressRecord, "id" | "createdAt" | "updatedAt">>,
) {
  const list = addressesByUser.get(userId) ?? [];
  const idx = list.findIndex((a) => a.id === addressId);
  if (idx === -1) return null;

  const current = list[idx];
  const updated: AddressRecord = {
    ...current,
    ...patch,
    updatedAt: new Date().toISOString(),
  } as AddressRecord;

  if (patch.is_default) {
    for (const a of list) a.is_default = false;
    updated.is_default = true;
  }

  list[idx] = updated;
  addressesByUser.set(userId, list);
  return updated;
}

export function deleteAddress(userId: string, addressId: string) {
  const list = addressesByUser.get(userId) ?? [];
  const idx = list.findIndex((a) => a.id === addressId);
  if (idx === -1) return false;
  list.splice(idx, 1);
  addressesByUser.set(userId, list);
  return true;
}

export function clearAddresses() {
  addressesByUser.clear();
}
