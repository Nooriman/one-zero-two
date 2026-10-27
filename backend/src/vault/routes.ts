import { Router } from "express";
import { requireAuth } from "../auth/routes.js";
import { prisma } from "../lib/prisma.js";

const B64 = /^[A-Za-z0-9+/_=-]{8,200}$/;
const ITERATIONS_MIN = 300_000;
const ITERATIONS_MAX = 5_000_000;

export const vaultRouter = Router();
vaultRouter.use(requireAuth);

// The salt, KDF settings and check value are not secret; they let a client derive a key
// from the passphrase and confirm it is right. The passphrase and key never leave the browser.
vaultRouter.get("/", async (_request, response) => {
  const vault = await prisma.vault.findUnique({ where: { id: 1 } });
  response.json(vault ? { salt: vault.salt, iterations: vault.iterations, check: vault.check } : null);
});

// Only the very first setup is accepted; changing the passphrase later means re-encrypting every document.
vaultRouter.post("/", async (request, response) => {
  const { salt, iterations, check } = (request.body ?? {}) as Record<string, unknown>;
  if (
    typeof salt !== "string" || !B64.test(salt) ||
    typeof check !== "string" || !check.startsWith("v1.") || check.length > 400 ||
    typeof iterations !== "number" || !Number.isInteger(iterations) ||
    iterations < ITERATIONS_MIN || iterations > ITERATIONS_MAX
  ) {
    return response.status(400).json({ error: "Invalid vault settings." });
  }
  const created = await prisma.vault.createMany({ data: { id: 1, salt, iterations, check }, skipDuplicates: true });
  if (created.count === 0) return response.status(409).json({ error: "The vault already exists." });
  response.status(201).json({ salt, iterations, check });
});
