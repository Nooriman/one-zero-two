import { createVault, getVault, type VaultMeta } from "../api/VaultApi";
import { KDF_ITERATIONS, decrypt, deriveKey, encrypt, makeCheck, newSalt, verifyCheck } from "./crypto";

// The unlocked key lives only in this variable: never in storage, never sent anywhere.
// A page reload, idle time or hiding the app locks the vault again.
const IDLE_MS = 5 * 60_000;
const HIDDEN_MS = 60_000;

let key: CryptoKey | null = null;
let idleTimer: number | undefined;
let hiddenTimer: number | undefined;
const listeners = new Set<() => void>();

const emit = () => listeners.forEach((listener) => listener());

export const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => void listeners.delete(listener);
};
export const getKey = () => key;

function resetIdle() {
  window.clearTimeout(idleTimer);
  idleTimer = window.setTimeout(lock, IDLE_MS);
}

function onVisibility() {
  window.clearTimeout(hiddenTimer);
  if (document.hidden) hiddenTimer = window.setTimeout(lock, HIDDEN_MS);
}

const ACTIVITY = ["pointerdown", "keydown", "scroll"] as const;

function startWatching() {
  ACTIVITY.forEach((name) => window.addEventListener(name, resetIdle, { passive: true }));
  document.addEventListener("visibilitychange", onVisibility);
  resetIdle();
}

function stopWatching() {
  ACTIVITY.forEach((name) => window.removeEventListener(name, resetIdle));
  document.removeEventListener("visibilitychange", onVisibility);
  window.clearTimeout(idleTimer);
  window.clearTimeout(hiddenTimer);
}

function setKey(next: CryptoKey) {
  key = next;
  startWatching();
  emit();
}

export function lock() {
  if (!key) return;
  key = null;
  stopWatching();
  emit();
}

/** Derive the key from the passphrase and check it against the stored check value. */
export async function unlock(passphrase: string, meta: VaultMeta) {
  const candidate = await deriveKey(passphrase, meta.salt, meta.iterations);
  if (!(await verifyCheck(candidate, meta.check))) throw new Error("Wrong passphrase.");
  setKey(candidate);
}

/** First-time setup: creates the shared vault. Fails if someone else already did. */
export async function setupVault(passphrase: string) {
  const salt = newSalt();
  const candidate = await deriveKey(passphrase, salt, KDF_ITERATIONS);
  const meta = { salt, iterations: KDF_ITERATIONS, check: await makeCheck(candidate) };
  await createVault(meta);
  setKey(candidate);
}

export const loadVaultMeta = getVault;

function requireKey() {
  if (!key) throw new Error("The vault is locked.");
  return key;
}

/** `member` is bound into the ciphertext, so moving a stored document to another person breaks decryption. */
export const sealDocument = (doc: { title: string; content: string }, member: string) =>
  encrypt(requireKey(), JSON.stringify({ title: doc.title, content: doc.content }), member);

export async function openDocument(data: string, member: string): Promise<{ title: string; content: string }> {
  const parsed = JSON.parse(await decrypt(requireKey(), data, member));
  return { title: String(parsed.title ?? ""), content: String(parsed.content ?? "") };
}
