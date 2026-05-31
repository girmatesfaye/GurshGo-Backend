export type UserRole = "customer" | "merchant" | "driver" | "admin";

export type PublicUser = {
  id: string;
  name: string;
  phone: string;
  email: string | null;
  role: UserRole;
  created_at: string;
};

export type AuthContext = {
  userId: string;
  sessionId: string;
  role: UserRole;
  tokenId: string;
  phone: string;
};

export type AuthSession = {
  id: string;
  userId: string;
  tokenId: string;
  createdAt: string;
  expiresAt: string;
  revokedAt: string | null;
};

export type AuthUserRecord = {
  id: string;
  name: string;
  phone: string;
  email: string | null;
  passwordHash: string;
  role: UserRole;
  createdAt: string;
  updatedAt: string;
  is_suspended?: boolean;
};

export type OtpChallenge = {
  phone: string;
  code: string;
  expiresAt: string;
  attempts: number;
  consumedAt: string | null;
};

export type AuthTokenPayload = {
  sub: string;
  sid: string;
  role: UserRole;
  phone: string;
};
