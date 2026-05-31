import { randomUUID } from "node:crypto";

import type {
  AuthSession,
  AuthUserRecord,
  OtpChallenge,
  UserRole,
} from "./auth.types";

const usersById = new Map<string, AuthUserRecord>();
const userIdsByPhone = new Map<string, string>();
const sessionsById = new Map<string, AuthSession>();
const otpByPhone = new Map<string, OtpChallenge>();

export function createUser(input: {
  name: string;
  phone: string;
  email: string | null;
  passwordHash: string;
  role: UserRole;
}) {
  const now = new Date().toISOString();
  const user: AuthUserRecord = {
    id: randomUUID(),
    name: input.name,
    phone: input.phone,
    email: input.email,
    passwordHash: input.passwordHash,
    role: input.role,
    createdAt: now,
    updatedAt: now,
  };

  usersById.set(user.id, user);
  userIdsByPhone.set(user.phone, user.id);
  return user;
}

export function getUserByPhone(phone: string) {
  const userId = userIdsByPhone.get(phone);
  return userId ? (usersById.get(userId) ?? null) : null;
}

export function getUserById(userId: string) {
  return usersById.get(userId) ?? null;
}

export function updateUser(
  userId: string,
  patch: Partial<{ name: string; email: string | null }>,
) {
  const user = usersById.get(userId);
  if (!user) return null;

  const updated = {
    ...user,
    name: patch.name ?? user.name,
    email: patch.email === undefined ? user.email : patch.email,
    updatedAt: new Date().toISOString(),
  };

  usersById.set(userId, updated);
  return updated;
}

export function listUsers(q?: string) {
  const all = Array.from(usersById.values());
  if (!q) return all;
  const lower = q.toLowerCase();
  return all.filter(
    (u) =>
      (u.phone && u.phone.toLowerCase().includes(lower)) ||
      (u.email && u.email.toLowerCase().includes(lower)) ||
      (u.name && u.name.toLowerCase().includes(lower)),
  );
}

export function suspendUser(userId: string, suspended: boolean) {
  const user = usersById.get(userId);
  if (!user) return null;
  const updated = {
    ...user,
    is_suspended: suspended,
    updatedAt: new Date().toISOString(),
  };
  usersById.set(userId, updated);
  return updated;
}

export function createSession(
  userId: string,
  tokenId: string,
  ttlSeconds: number,
) {
  const now = new Date();
  const session: AuthSession = {
    id: randomUUID(),
    userId,
    tokenId,
    createdAt: now.toISOString(),
    expiresAt: new Date(now.getTime() + ttlSeconds * 1000).toISOString(),
    revokedAt: null,
  };

  sessionsById.set(session.id, session);
  return session;
}

export function getSessionById(sessionId: string) {
  return sessionsById.get(sessionId) ?? null;
}

export function updateSessionTokenId(sessionId: string, tokenId: string) {
  const session = sessionsById.get(sessionId);
  if (!session) {
    return null;
  }

  const updatedSession = {
    ...session,
    tokenId,
  };

  sessionsById.set(sessionId, updatedSession);
  return updatedSession;
}

export function revokeSession(sessionId: string) {
  const session = sessionsById.get(sessionId);
  if (!session) {
    return null;
  }

  const revokedSession = {
    ...session,
    revokedAt: new Date().toISOString(),
  };

  sessionsById.set(sessionId, revokedSession);
  return revokedSession;
}

export function createOtpChallenge(
  phone: string,
  code: string,
  ttlSeconds: number,
) {
  const challenge: OtpChallenge = {
    phone,
    code,
    expiresAt: new Date(Date.now() + ttlSeconds * 1000).toISOString(),
    attempts: 0,
    consumedAt: null,
  };

  otpByPhone.set(phone, challenge);
  return challenge;
}

export function getOtpChallenge(phone: string) {
  return otpByPhone.get(phone) ?? null;
}

export function consumeOtpChallenge(phone: string) {
  const challenge = otpByPhone.get(phone);
  if (!challenge) {
    return null;
  }

  const consumedChallenge = {
    ...challenge,
    consumedAt: new Date().toISOString(),
  };

  otpByPhone.set(phone, consumedChallenge);
  return consumedChallenge;
}

export function clearAuthStore() {
  usersById.clear();
  userIdsByPhone.clear();
  sessionsById.clear();
  otpByPhone.clear();
}
