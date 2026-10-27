import { Router } from "express";
import { Prisma, type Debt } from "@prisma/client";
import { requireAuth } from "../auth/routes.js";
import { prisma } from "../lib/prisma.js";

const PERSON_MAX = 50;
const DESCRIPTION_MAX = 250;
const AMOUNT_MAX = 9_999_999_999.99;

function serialize(debt: Debt) {
  return {
    id: debt.id,
    person: debt.person,
    amount: debt.amount.toString(),
    description: debt.description,
    paidAt: debt.paidAt,
    createdAt: debt.createdAt,
  };
}

export const debtsRouter = Router();
debtsRouter.use(requireAuth);

debtsRouter.get("/", async (_request, response) => {
  const debts = await prisma.debt.findMany({
    where: { userId: response.locals.user.id },
    orderBy: { createdAt: "desc" },
  });
  response.json(debts.map(serialize));
});

debtsRouter.post("/", async (request, response) => {
  const { person, amount, description } = request.body ?? {};

  if (typeof person !== "string" || !person.trim() || person.trim().length > PERSON_MAX) {
    return response.status(400).json({ error: "Enter who the debt is to." });
  }
  const value = Number(amount);
  if (!Number.isFinite(value) || value <= 0 || value > AMOUNT_MAX) {
    return response.status(400).json({ error: "Enter a valid amount." });
  }
  if (description !== undefined && (typeof description !== "string" || description.length > DESCRIPTION_MAX)) {
    return response.status(400).json({ error: `Description is limited to ${DESCRIPTION_MAX} characters.` });
  }

  const debt = await prisma.debt.create({
    data: {
      userId: response.locals.user.id,
      person: person.trim(),
      amount: value.toFixed(2),
      description: description?.trim() ?? "",
    },
  });
  response.status(201).json(serialize(debt));
});

debtsRouter.get("/:id", async (request, response) => {
  const id = Number(request.params.id);
  const debt = Number.isInteger(id)
    ? await prisma.debt.findFirst({ where: { id, userId: response.locals.user.id } })
    : null;
  if (!debt) return response.status(404).json({ error: "Debt not found." });
  response.json(serialize(debt));
});

debtsRouter.post("/:id/paid", async (request, response) => {
  const id = Number(request.params.id);
  const debt = Number.isInteger(id)
    ? await prisma.debt.findFirst({ where: { id, userId: response.locals.user.id } })
    : null;
  if (!debt) return response.status(404).json({ error: "Debt not found." });
  if (debt.paidAt) return response.json(serialize(debt));

  const updated = await prisma.debt.update({ where: { id }, data: { paidAt: new Date() } });
  response.json(serialize(updated));
});

/** Pay down a debt: reduces it, marks it paid at zero, and logs the payment as an expense, atomically. */
debtsRouter.post("/:id/payment", async (request, response) => {
  const id = Number(request.params.id);
  const value = Number((request.body ?? {}).amount);
  if (!Number.isFinite(value) || value <= 0 || value > AMOUNT_MAX) {
    return response.status(400).json({ error: "Enter a valid amount." });
  }
  const paying = new Prisma.Decimal(value.toFixed(2));
  const userId = response.locals.user.id;

  const result = await prisma.$transaction(async (tx) => {
    const debt = Number.isInteger(id) ? await tx.debt.findFirst({ where: { id, userId } }) : null;
    if (!debt) return { status: 404, error: "Debt not found." } as const;
    if (debt.paidAt) return { status: 400, error: "This debt is already paid." } as const;
    if (paying.greaterThan(debt.amount)) {
      return { status: 400, error: "Payment is more than the remaining debt." } as const;
    }

    const remaining = debt.amount.minus(paying);
    const updated = await tx.debt.update({
      where: { id },
      data: { amount: remaining, paidAt: remaining.isZero() ? new Date() : null },
    });
    await tx.expense.create({
      data: { userId, description: `Debt: ${debt.person}`, amount: paying },
    });
    return { status: 200, debt: updated } as const;
  });

  if ("error" in result) return response.status(result.status).json({ error: result.error });
  response.json(serialize(result.debt));
});
