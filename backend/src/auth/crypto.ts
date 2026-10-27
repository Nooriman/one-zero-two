import { createHash, randomBytes, scrypt, timingSafeEqual } from "node:crypto";

const KEY_LENGTH = 64;
// N=2^15 (~32 MB, ~100 ms): a 6-digit code has only 1M values, so make each guess costly.
const SCRYPT = { N: 32768, r: 8, p: 1, maxmem: 128 * 1024 * 1024 };

export const CODE_PATTERN = /^\d{6}$/;

function derive(code: string, salt: Buffer): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    scrypt(code, salt, KEY_LENGTH, SCRYPT, (error, key) =>
      error ? reject(error) : resolve(key),
    );
  });
}

export async function hashCode(code: string) {
  const salt = randomBytes(16);
  const hash = await derive(code, salt);
  return { hash: hash.toString("base64"), salt: salt.toString("base64") };
}

export async function verifyCode(code: string, stored: { hash: string; salt: string }) {
  const expected = Buffer.from(stored.hash, "base64");
  const actual = await derive(code, Buffer.from(stored.salt, "base64"));
  return timingSafeEqual(actual, expected);
}

export function newSessionToken() {
  const token = randomBytes(32).toString("base64url");
  return { token, tokenHash: hashToken(token) };
}

export function hashToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}
