import { randomInt, randomUUID } from "node:crypto";

import { AppError } from "../../lib/errors";
import { signJwt, verifyJwt } from "../../lib/jwt";
import { hashPassword, verifyPassword } from "../../lib/password";
import type {
  LoginInput,
  OtpSendInput,
  OtpVerifyInput,
  RegisterInput,
} from "./auth.schema";
import {
  clearAuthStore,
  consumeOtpChallenge,
  createOtpChallenge,
  createSession,
  createUser,
  getOtpChallenge,
  getSessionById,
  getUserById,
  getUserByPhone,
  revokeSession,
  updateSessionTokenId,
} from "./auth.store";
import type {
  AuthContext,
  AuthTokenPayload,
  AuthUserRecord,
  PublicUser,
} from "./auth.types";

const JWT_SECRET = process.env.JWT_SECRET ?? "dev-auth-secret";
const TOKEN_TTL_SECONDS = Number(process.env.JWT_EXPIRES_IN_SECONDS ?? 60 * 60);
const OTP_TTL_SECONDS = Number(process.env.OTP_EXPIRES_IN_SECONDS ?? 5 * 60);
const DRIVER_OTP_ROLE: AuthUserRecord["role"] = "driver";

function toPublicUser(user: AuthUserRecord): PublicUser {
  return {
    id: user.id,
    name: user.name,
    phone: user.phone,
    email: user.email,
    role: user.role,
    created_at: user.createdAt,
  };
}

function issueToken(user: AuthUserRecord, sessionId: string, tokenId: string) {
  const payload: AuthTokenPayload = {
    sub: user.id,
    sid: sessionId,
    role: user.role,
    phone: user.phone,
  };

  const token = signJwt(payload, JWT_SECRET, TOKEN_TTL_SECONDS, {
    jti: tokenId,
  });
  return token;
}

function parseBearerToken(authorizationHeader: string | undefined) {
  if (!authorizationHeader) {
    throw new AppError(401, "TOKEN_MISSING", "Missing authorization token");
  }

  const [scheme, token] = authorizationHeader.split(" ");
  if (scheme !== "Bearer" || !token) {
    throw new AppError(401, "TOKEN_MISSING", "Missing authorization token");
  }

  return token;
}

function validateActiveSession(authContext: AuthContext) {
  const session = getSessionById(authContext.sessionId);
  if (!session || session.revokedAt) {
    throw new AppError(401, "TOKEN_REVOKED", "Token has been revoked");
  }

  if (new Date(session.expiresAt).getTime() <= Date.now()) {
    throw new AppError(401, "TOKEN_EXPIRED", "Token expired");
  }

  if (
    session.userId !== authContext.userId ||
    session.tokenId !== authContext.tokenId
  ) {
    throw new AppError(401, "TOKEN_INVALID", "Token does not match session");
  }

  return session;
}

export const authService = {
  async register(input: RegisterInput) {
    if (getUserByPhone(input.phone)) {
      throw new AppError(
        400,
        "PHONE_ALREADY_REGISTERED",
        "Phone number is already registered",
        "phone",
      );
    }

    const passwordHash = await hashPassword(input.password);
    const user = createUser({
      name: input.name,
      phone: input.phone,
      email: input.email ?? null,
      passwordHash,
      role: input.role,
    });

    const tokenId = randomUUID();
    const session = createSession(user.id, tokenId, TOKEN_TTL_SECONDS);
    const token = issueToken(user, session.id, tokenId);

    return {
      user: toPublicUser(user),
      token,
    };
  },

  async login(input: LoginInput) {
    const user = getUserByPhone(input.phone);
    if (!user) {
      throw new AppError(
        401,
        "INVALID_CREDENTIALS",
        "Invalid phone or password",
        "phone",
      );
    }

    const isValidPassword = await verifyPassword(
      input.password,
      user.passwordHash,
    );
    if (!isValidPassword) {
      throw new AppError(
        401,
        "INVALID_CREDENTIALS",
        "Invalid phone or password",
        "password",
      );
    }

    const tokenId = randomUUID();
    const session = createSession(user.id, tokenId, TOKEN_TTL_SECONDS);
    const token = issueToken(user, session.id, tokenId);

    return {
      user: toPublicUser(user),
      token,
    };
  },

  async sendOtp(input: OtpSendInput) {
    const user = getUserByPhone(input.phone);
    if (!user || user.role !== DRIVER_OTP_ROLE) {
      throw new AppError(
        404,
        "USER_NOT_FOUND",
        "No driver found with that phone number",
        "phone",
      );
    }

    const code = String(randomInt(0, 1_000_000)).padStart(6, "0");
    createOtpChallenge(input.phone, code, OTP_TTL_SECONDS);

    if (process.env.NODE_ENV !== "production") {
      console.log(`[auth] OTP for ${input.phone}: ${code}`);
    }

    return {
      expires_in: OTP_TTL_SECONDS,
    };
  },

  async verifyOtp(input: OtpVerifyInput) {
    const user = getUserByPhone(input.phone);
    if (!user || user.role !== DRIVER_OTP_ROLE) {
      throw new AppError(
        404,
        "USER_NOT_FOUND",
        "No driver found with that phone number",
        "phone",
      );
    }

    const challenge = getOtpChallenge(input.phone);
    if (!challenge) {
      throw new AppError(
        422,
        "INVALID_OTP",
        "OTP has expired or is missing",
        "otp",
      );
    }

    if (challenge.consumedAt) {
      throw new AppError(
        422,
        "INVALID_OTP",
        "OTP has already been used",
        "otp",
      );
    }

    if (new Date(challenge.expiresAt).getTime() <= Date.now()) {
      throw new AppError(422, "INVALID_OTP", "OTP has expired", "otp");
    }

    if (challenge.code !== input.otp) {
      throw new AppError(422, "INVALID_OTP", "OTP is invalid", "otp");
    }

    consumeOtpChallenge(input.phone);
    const tokenId = randomUUID();
    const session = createSession(user.id, tokenId, TOKEN_TTL_SECONDS);
    const token = issueToken(user, session.id, tokenId);

    return {
      user: toPublicUser(user),
      token,
    };
  },

  async refresh(authContext: AuthContext) {
    validateActiveSession(authContext);
    const user = getUserById(authContext.userId);
    if (!user) {
      throw new AppError(
        404,
        "USER_NOT_FOUND",
        "No user found with that token",
      );
    }

    const tokenId = randomUUID();
    updateSessionTokenId(authContext.sessionId, tokenId);
    const token = issueToken(user, authContext.sessionId, tokenId);

    return {
      token,
    };
  },

  async logout(authContext: AuthContext) {
    validateActiveSession(authContext);
    revokeSession(authContext.sessionId);

    return {
      message: "Logged out",
    };
  },

  authenticate(token: string) {
    const payload = verifyJwt<AuthTokenPayload>(token, JWT_SECRET);
    const authContext: AuthContext = {
      userId: payload.sub,
      sessionId: payload.sid,
      role: payload.role,
      tokenId: payload.jti,
      phone: payload.phone,
    };

    validateActiveSession(authContext);
    const user = getUserById(authContext.userId);
    if (!user) {
      throw new AppError(
        404,
        "USER_NOT_FOUND",
        "No user found with that token",
      );
    }

    return {
      auth: authContext,
      user,
    };
  },

  parseBearerToken,
  clearAuthStore,
};
