import { Router } from "express";
import type { Expense } from "@prisma/client";
import { requireAuth } from "../auth/routes.js";
import { prisma } from "../lib/prisma.js";

const DESCRIPTION_MAX = 250;
const AMOUNT_MAX = 9_999_999_999.99;

function serialize(expense: Expense) {
  return {
    id: expense.id,
    description: expense.description,
    amount: expense.amount.toString(),
    createdAt: expense.createdAt,
    liabilityId: expense.liabilityId,
  };
}

/** Validate a description/amount pair; returns the clean values or an error message. */
function parseInput(body: unknown): { description: string; amount: string } | { error: string } {
  const { description, amount } = (body ?? {}) as Record<string, unknown>;

  if (description !== undefined && (typeof description !== "string" || description.length > DESCRIPTION_MAX)) {
    return { error: `Description is limited to ${DESCRIPTION_MAX} characters.` };
  }
  const value = Number(amount);
  if (amount === "" || !Number.isFinite(value) || value < 0 || value > AMOUNT_MAX) {
    return { error: "Enter a valid amount." };
  }
  return { description: (description as string | undefined)?.trim() ?? "", amount: value.toFixed(2) };
}

export const expensesRouter = Router();
expensesRouter.use(requireAuth);

/** Parse an optional ISO date query/body value; undefined when absent, null when invalid. */
function parseDate(value: unknown): Date | undefined | null {
  if (value === undefined) return undefined;
  const date = typeof value === "string" ? new Date(value) : null;
  return date && !Number.isNaN(date.getTime()) ? date : null;
}

// Optional ?from=&to= (ISO instants) limit the list to [from, to), e.g. one month.
expensesRouter.get("/", async (request, response) => {
  const from = parseDate(request.query.from);
  const to = parseDate(request.query.to);
  if (from === null || to === null) return response.status(400).json({ error: "Invalid date range." });

  const expenses = await prisma.expense.findMany({
    where: { userId: response.locals.user.id, createdAt: { gte: from, lt: to } },
    orderBy: { createdAt: "desc" },
  });
  response.json(expenses.map(serialize));
});

expensesRouter.post("/", async (request, response) => {
  const input = parseInput(request.body);
  if ("error" in input) return response.status(400).json({ error: input.error });

  // Optional createdAt lets an expense be logged into a past month being viewed.
  const createdAt = parseDate((request.body ?? {}).createdAt);
  if (createdAt === null || (createdAt && createdAt.getTime() > Date.now() + 86_400_000)) {
    return response.status(400).json({ error: "Invalid date." });
  }

  // Optional liabilityId marks this expense as that liability's payment; it must be the user's own.
  const { liabilityId } = (request.body ?? {}) as { liabilityId?: unknown };
  if (liabilityId !== undefined) {
    const owned =
      Number.isInteger(liabilityId) &&
      (await prisma.liability.count({ where: { id: liabilityId as number, userId: response.locals.user.id } }));
    if (!owned) return response.status(400).json({ error: "Liability not found." });
  }

  const expense = await prisma.expense.create({
    data: { userId: response.locals.user.id, ...input, createdAt, liabilityId: liabilityId as number | undefined },
  });
  response.status(201).json(serialize(expense));
});
