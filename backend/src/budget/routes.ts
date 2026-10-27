import { Router } from "express";
import { requireAuth } from "../auth/routes.js";
import { prisma } from "../lib/prisma.js";

const AMOUNT_MAX = 9_999_999_999.99;

export const budgetRouter = Router();
budgetRouter.use(requireAuth);

async function current(userId: number) {
  const user = await prisma.user.findUniqueOrThrow({ where: { id: userId }, select: { monthlyBudget: true } });
  return { amount: user.monthlyBudget?.toString() ?? null };
}

budgetRouter.get("/", async (_request, response) => {
  response.json(await current(response.locals.user.id));
});

budgetRouter.put("/", async (request, response) => {
  const value = Number((request.body ?? {}).amount);
  if (!Number.isFinite(value) || value <= 0 || value > AMOUNT_MAX) {
    return response.status(400).json({ error: "Enter a valid amount." });
  }
  await prisma.user.update({
    where: { id: response.locals.user.id },
    data: { monthlyBudget: value.toFixed(2) },
  });
  response.json(await current(response.locals.user.id));
});
