import { Router } from "express";
import type { Liability } from "@prisma/client";
import { requireAuth } from "../auth/routes.js";
import { prisma } from "../lib/prisma.js";

const DESCRIPTION_MAX = 250;
const AMOUNT_MAX = 9_999_999_999.99;

function serialize(liability: Liability) {
  return {
    id: liability.id,
    description: liability.description,
    amount: liability.amount.toString(),
    createdAt: liability.createdAt,
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

/** ISO instant of the month boundary a change should start at; must be in the near future. */
function parseEffective(value: unknown): Date | null {
  const date = typeof value === "string" ? new Date(value) : null;
  if (!date || Number.isNaN(date.getTime())) return null;
  const ahead = date.getTime() - Date.now();
  return ahead > 0 && ahead < 70 * 86_400_000 ? date : null;
}

const invalidEffective = { error: "Invalid effective date." };

export const liabilitiesRouter = Router();
liabilitiesRouter.use(requireAuth);

// With ?from=&to= (a month): the liabilities that count in that month.
// Without: the plan going forward, i.e. everything not already ended (what the next month will look like).
liabilitiesRouter.get("/", async (request, response) => {
  const userId = response.locals.user.id;
  const from = typeof request.query.from === "string" ? new Date(request.query.from) : null;
  const to = typeof request.query.to === "string" ? new Date(request.query.to) : null;
  if ((from && Number.isNaN(from.getTime())) || (to && Number.isNaN(to.getTime())) || !from !== !to) {
    return response.status(400).json({ error: "Invalid date range." });
  }

  const liabilities = await prisma.liability.findMany({
    where:
      from && to
        ? { userId, effectiveFrom: { lt: to }, OR: [{ endsAt: null }, { endsAt: { gt: from } }] }
        : { userId, endsAt: null },
    orderBy: { createdAt: "desc" },
  });
  response.json(liabilities.map(serialize));
});

// Changes never touch the current month: new and edited liabilities start at `effectiveFrom`
// (the next month boundary) and replaced or removed ones end there.
liabilitiesRouter.post("/", async (request, response) => {
  const input = parseInput(request.body);
  if ("error" in input) return response.status(400).json({ error: input.error });
  const effectiveFrom = parseEffective((request.body ?? {}).effectiveFrom);
  if (!effectiveFrom) return response.status(400).json(invalidEffective);

  const liability = await prisma.liability.create({
    data: { userId: response.locals.user.id, ...input, effectiveFrom },
  });
  response.status(201).json(serialize(liability));
});

liabilitiesRouter.patch("/:id", async (request, response) => {
  const id = Number(request.params.id);
  const userId = response.locals.user.id;
  const input = parseInput(request.body);
  if ("error" in input) return response.status(400).json({ error: input.error });
  const effectiveFrom = parseEffective((request.body ?? {}).effectiveFrom);
  if (!effectiveFrom) return response.status(400).json(invalidEffective);

  const current = Number.isInteger(id)
    ? await prisma.liability.findFirst({ where: { id, userId, endsAt: null } })
    : null;
  if (!current) return response.status(404).json({ error: "Liability not found." });

  // Not started yet (added earlier this month): nothing is live, so just change it.
  if (current.effectiveFrom.getTime() > Date.now()) {
    return response.json(serialize(await prisma.liability.update({ where: { id }, data: input })));
  }
  if (current.description === input.description && current.amount.toFixed(2) === input.amount) {
    return response.json(serialize(current));
  }

  // Live: keep it for the rest of this month and start a new version next month.
  const replacement = await prisma.$transaction(async (tx) => {
    await tx.liability.update({ where: { id }, data: { endsAt: effectiveFrom } });
    return tx.liability.create({
      data: { userId, ...input, effectiveFrom, createdAt: current.createdAt },
    });
  });
  response.json(serialize(replacement));
});

liabilitiesRouter.delete("/:id", async (request, response) => {
  const id = Number(request.params.id);
  const userId = response.locals.user.id;
  const effectiveFrom = parseEffective(request.query.effectiveFrom);
  if (!effectiveFrom) return response.status(400).json(invalidEffective);

  const current = Number.isInteger(id)
    ? await prisma.liability.findFirst({ where: { id, userId, endsAt: null } })
    : null;
  if (!current) return response.status(404).json({ error: "Liability not found." });

  if (current.effectiveFrom.getTime() > Date.now()) {
    await prisma.liability.delete({ where: { id } });
  } else {
    await prisma.liability.update({ where: { id }, data: { endsAt: effectiveFrom } });
  }
  response.status(204).end();
});
