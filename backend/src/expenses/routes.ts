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

expensesRouter.get("/", async (_request, response) => {
  const expenses = await prisma.expense.findMany({
    where: { userId: response.locals.user.id },
    orderBy: { createdAt: "desc" },
  });
  response.json(expenses.map(serialize));
});

expensesRouter.post("/", async (request, response) => {
  const input = parseInput(request.body);
  if ("error" in input) return response.status(400).json({ error: input.error });

  const expense = await prisma.expense.create({
    data: { userId: response.locals.user.id, ...input },
  });
  response.status(201).json(serialize(expense));
});

expensesRouter.patch("/:id", async (request, response) => {
  const id = Number(request.params.id);
  const input = parseInput(request.body);
  if ("error" in input) return response.status(400).json({ error: input.error });

  // Scoped by userId so one user can never touch another's expense.
  const result = Number.isInteger(id)
    ? await prisma.expense.updateMany({ where: { id, userId: response.locals.user.id }, data: input })
    : { count: 0 };
  if (result.count === 0) return response.status(404).json({ error: "Expense not found." });

  const expense = await prisma.expense.findUniqueOrThrow({ where: { id } });
  response.json(serialize(expense));
});

expensesRouter.delete("/:id", async (request, response) => {
  const id = Number(request.params.id);
  const result = Number.isInteger(id)
    ? await prisma.expense.deleteMany({ where: { id, userId: response.locals.user.id } })
    : { count: 0 };
  if (result.count === 0) return response.status(404).json({ error: "Expense not found." });
  response.status(204).end();
});
