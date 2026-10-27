// End-to-end encryption primitives (WebCrypto). Nothing here touches the network or storage.
// Format: "v1." + base64(12-byte IV || AES-256-GCM ciphertext+tag). The "v1" prefix lets the
// scheme change later without guessing what old data is.

export const KDF_ITERATIONS = 600_000;
const VERSION = "v1.";
const CHECK_TEXT = "one-zero-two vault check";

const encoder = new TextEncoder();
const decoder = new TextDecoder();

const toBase64 = (bytes: Uint8Array) => btoa(String.fromCharCode(...bytes));
const fromBase64 = (text: string) => Uint8Array.from(atob(text), (c) => c.charCodeAt(0));

export const newSalt = () => toBase64(crypto.getRandomValues(new Uint8Array(16)));

/** Passphrase -> AES-256-GCM key (PBKDF2-SHA256). The key is non-extractable. */
export async function deriveKey(passphrase: string, salt: string, iterations: number) {
  const material = await crypto.subtle.importKey("raw", encoder.encode(passphrase), "PBKDF2", false, [
    "deriveKey",
  ]);
  return crypto.subtle.deriveKey(
    { name: "PBKDF2", hash: "SHA-256", salt: fromBase64(salt), iterations },
    material,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"],
  );
}

/** `context` is authenticated but not stored: decrypting with a different context fails. */
export async function encrypt(key: CryptoKey, plaintext: string, context: string) {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const sealed = new Uint8Array(
    await crypto.subtle.encrypt(
      { name: "AES-GCM", iv, additionalData: encoder.encode(context) },
      key,
      encoder.encode(plaintext),
    ),
  );
  const out = new Uint8Array(iv.length + sealed.length);
  out.set(iv);
  out.set(sealed, iv.length);
  return VERSION + toBase64(out);
}

/** Throws if the key is wrong, the context differs, or the data was altered. */
export async function decrypt(key: CryptoKey, payload: string, context: string) {
  if (!payload.startsWith(VERSION)) throw new Error("Unknown data format.");
  const bytes = fromBase64(payload.slice(VERSION.length));
  const plain = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv: bytes.slice(0, 12), additionalData: encoder.encode(context) },
    key,
    bytes.slice(12),
  );
  return decoder.decode(plain);
}

export const makeCheck = (key: CryptoKey) => encrypt(key, CHECK_TEXT, "vault");

export async function verifyCheck(key: CryptoKey, check: string) {
  try {
    return (await decrypt(key, check, "vault")) === CHECK_TEXT;
  } catch {
    return false;
  }
}
