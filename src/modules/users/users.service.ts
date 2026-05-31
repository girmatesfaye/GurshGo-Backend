import { AppError } from "../../lib/errors";
import { getUserById, updateUser } from "../auth/auth.store";
import type { PublicUser } from "../auth/auth.types";
import type {
  AddressCreateInput,
  AddressUpdateInput,
  UpdateProfileInput,
} from "./users.schema";
import {
  addAddress,
  deleteAddress,
  getAddress,
  listAddresses,
  updateAddress,
} from "./users.store";

function toResponseUser(user: ReturnType<typeof getUserById>): PublicUser {
  if (!user) throw new AppError(404, "USER_NOT_FOUND", "User not found");
  return {
    id: user.id,
    name: user.name,
    phone: user.phone,
    email: user.email,
    role: user.role,
    created_at: user.createdAt,
  };
}

export const usersService = {
  getProfile(userId: string) {
    const user = getUserById(userId);
    if (!user)
      throw new AppError(404, "USER_NOT_FOUND", "No user found with that ID");
    return toResponseUser(user);
  },

  updateProfile(userId: string, input: UpdateProfileInput) {
    const updated = updateUser(userId, {
      name: input.name,
      email: input.email ?? null,
    });
    if (!updated)
      throw new AppError(404, "USER_NOT_FOUND", "No user found with that ID");
    return toResponseUser(updated as any);
  },

  listAddresses(userId: string) {
    return listAddresses(userId);
  },

  addAddress(userId: string, input: AddressCreateInput) {
    const created = addAddress(userId, {
      ...input,
      is_default: input.is_default ?? false,
    });
    return created;
  },

  updateAddress(userId: string, addressId: string, input: AddressUpdateInput) {
    const current = getAddress(userId, addressId);
    if (!current)
      throw new AppError(404, "ADDRESS_NOT_FOUND", "Address not found");
    const updated = updateAddress(userId, addressId, input as any);
    return updated;
  },

  deleteAddress(userId: string, addressId: string) {
    const ok = deleteAddress(userId, addressId);
    if (!ok) throw new AppError(404, "ADDRESS_NOT_FOUND", "Address not found");
    return { message: "Address deleted" };
  },
};
