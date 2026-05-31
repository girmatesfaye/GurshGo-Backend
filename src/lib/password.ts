import { pbkdf2, randomBytes, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";

const pbkdf2Async = promisify(pbkdf2);
const PBKDF2_ITERATIONS = 210000;
const KEY_LENGTH = 64;
const DIGEST = "sha512";

function toHex(buffer: Buffer) {
  return buffer.toString("hex");
}

function fromHex(value: string) {
  return Buffer.from(value, "hex");
}

export async function hashPassword(password: string) {
  const salt = randomBytes(16);
  const derivedKey = (await pbkdf2Async(
    password,
    salt,
    PBKDF2_ITERATIONS,
    KEY_LENGTH,
    DIGEST,
  )) as Buffer;
  return `pbkdf2$${PBKDF2_ITERATIONS}$${toHex(salt)}$${toHex(derivedKey)}`;
}

export async function verifyPassword(password: string, passwordHash: string) {
  const [algorithm, iterationValue, saltValue, hashValue] =
    passwordHash.split("$");

  if (algorithm !== "pbkdf2" || !iterationValue || !saltValue || !hashValue) {
    return false;
  }

  const iterations = Number(iterationValue);
  if (!Number.isFinite(iterations) || iterations <= 0) {
    return false;
  }

  const salt = fromHex(saltValue);
  const expectedHash = fromHex(hashValue);
  const derivedKey = (await pbkdf2Async(
    password,
    salt,
    iterations,
    expectedHash.length,
    DIGEST,
  )) as Buffer;

  if (derivedKey.length !== expectedHash.length) {
    return false;
  }

  return timingSafeEqual(derivedKey, expectedHash);
}
