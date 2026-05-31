import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";

export type JwtPayload = Record<string, unknown>;

type JwtHeader = {
  alg: "HS256";
  typ: "JWT";
};

type JwtClaims<TPayload extends JwtPayload> = TPayload & {
  iat: number;
  exp: number;
  jti: string;
};

function base64UrlEncode(value: Buffer | string) {
  const buffer = typeof value === "string" ? Buffer.from(value, "utf8") : value;
  return buffer
    .toString("base64")
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");
}

function base64UrlDecode(value: string) {
  const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
  const padded = normalized + "=".repeat((4 - (normalized.length % 4)) % 4);
  return Buffer.from(padded, "base64").toString("utf8");
}

export function signJwt<TPayload extends JwtPayload>(
  payload: TPayload,
  secret: string,
  expiresInSeconds: number,
  options?: { jti?: string },
) {
  const header: JwtHeader = { alg: "HS256", typ: "JWT" };
  const now = Math.floor(Date.now() / 1000);
  const claims: JwtClaims<TPayload> = {
    ...payload,
    iat: now,
    exp: now + expiresInSeconds,
    jti: options?.jti ?? randomBytes(16).toString("hex"),
  };

  const encodedHeader = base64UrlEncode(JSON.stringify(header));
  const encodedPayload = base64UrlEncode(JSON.stringify(claims));
  const signingInput = `${encodedHeader}.${encodedPayload}`;
  const signature = createHmac("sha256", secret).update(signingInput).digest();

  return `${signingInput}.${base64UrlEncode(signature)}`;
}

export function verifyJwt<TPayload extends JwtPayload>(
  token: string,
  secret: string,
) {
  const parts = token.split(".");
  if (parts.length !== 3) {
    throw new Error("Invalid token format");
  }

  const [encodedHeader, encodedPayload, encodedSignature] = parts;
  const signingInput = `${encodedHeader}.${encodedPayload}`;
  const expectedSignature = createHmac("sha256", secret)
    .update(signingInput)
    .digest();
  const actualSignature = Buffer.from(
    encodedSignature.replace(/-/g, "+").replace(/_/g, "/"),
    "base64",
  );

  if (
    actualSignature.length !== expectedSignature.length ||
    !timingSafeEqual(actualSignature, expectedSignature)
  ) {
    throw new Error("Invalid token signature");
  }

  const payload = JSON.parse(
    base64UrlDecode(encodedPayload),
  ) as JwtClaims<TPayload>;
  const now = Math.floor(Date.now() / 1000);

  if (payload.exp <= now) {
    throw new Error("Token expired");
  }

  return payload;
}
