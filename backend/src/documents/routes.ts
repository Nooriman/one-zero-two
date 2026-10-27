import { Router } from "express";
import type { Document } from "@prisma/client";
import { requireAuth } from "../auth/routes.js";
import { prisma } from "../lib/prisma.js";

/** Everyone documents can be about; must match the list in the frontend. */
export const FAMILY = ["iman", "lily", "lola", "luffy"] as const;

// Ciphertext is "v1." + base64 of IV and AES-GCM output; 3000 characters of 4-byte text fits well within this.
const DATA_MAX = 24_000;
const DATA_PATTERN = /^v1\.[A-Za-z0-9+/_=-]+$/;

function serialize(document: Document) {
  return {
    id: document.id,
    member: document.member,
    data: document.data,
    createdAt: document.createdAt,
    updatedAt: document.updatedAt,
  };
}

/** Validate member + encrypted payload; the server cannot (and should not) look inside the payload. */
function parseInput(body: unknown): { member: string; data: string } | { error: string } {
  const { member, data } = (body ?? {}) as Record<string, unknown>;

  if (typeof member !== "string" || !(FAMILY as readonly string[]).includes(member)) {
    return { error: "Choose a family member." };
  }
  if (typeof data !== "string" || data.length > DATA_MAX || !DATA_PATTERN.test(data)) {
    return { error: "Invalid document data." };
  }
  return { member, data };
}

export const documentsRouter = Router();
documentsRouter.use(requireAuth);

documentsRouter.get("/", async (_request, response) => {
  // Documents are shared by both logins, so they are not filtered by user.
  const documents = await prisma.document.findMany({
    orderBy: { updatedAt: "desc" },
  });
  response.json(documents.map(serialize));
});

documentsRouter.post("/", async (request, response) => {
  const input = parseInput(request.body);
  if ("error" in input) return response.status(400).json({ error: input.error });

  const document = await prisma.document.create({
    data: { userId: response.locals.user.id, ...input },
  });
  response.status(201).json(serialize(document));
});

documentsRouter.patch("/:id", async (request, response) => {
  const id = Number(request.params.id);
  const input = parseInput(request.body);
  if ("error" in input) return response.status(400).json({ error: input.error });

    const result = Number.isInteger(id)
    ? await prisma.document.updateMany({ where: { id }, data: input })
    : { count: 0 };
  if (result.count === 0) return response.status(404).json({ error: "Document not found." });

  const document = await prisma.document.findUniqueOrThrow({ where: { id } });
  response.json(serialize(document));
});

documentsRouter.delete("/:id", async (request, response) => {
  const id = Number(request.params.id);
  const result = Number.isInteger(id)
    ? await prisma.document.deleteMany({ where: { id } })
    : { count: 0 };
  if (result.count === 0) return response.status(404).json({ error: "Document not found." });
  response.status(204).end();
});
