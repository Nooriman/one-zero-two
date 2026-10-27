import { Router } from "express";
import type { Debt } from "@prisma/client";
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
