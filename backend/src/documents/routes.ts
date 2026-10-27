import { Router } from "express";
import type { Document } from "@prisma/client";
import { requireAuth } from "../auth/routes.js";
import { prisma } from "../lib/prisma.js";

const TITLE_MAX = 120;
const CONTENT_MAX = 3000;

function serialize(document: Document) {
  return {
    id: document.id,
    title: document.title,
    content: document.content,
    createdAt: document.createdAt,
    updatedAt: document.updatedAt,
  };
}

/** Validate a title/content pair; returns the clean values or an error message. */
function parseInput(body: unknown): { title: string; content: string } | { error: string } {
  const { title, content } = (body ?? {}) as Record<string, unknown>;

  if (typeof title !== "string" || !title.trim() || title.trim().length > TITLE_MAX) {
    return { error: `Enter a title (up to ${TITLE_MAX} characters).` };
  }
  if (content !== undefined && (typeof content !== "string" || content.length > CONTENT_MAX)) {
    return { error: `Content is limited to ${CONTENT_MAX} characters.` };
  }
  return { title: title.trim(), content: (content as string | undefined) ?? "" };
}

export const documentsRouter = Router();
documentsRouter.use(requireAuth);

documentsRouter.get("/", async (_request, response) => {
  const documents = await prisma.document.findMany({
    where: { userId: response.locals.user.id },
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

  // Scoped by userId so one user can never touch another's document.
  const result = Number.isInteger(id)
    ? await prisma.document.updateMany({ where: { id, userId: response.locals.user.id }, data: input })
    : { count: 0 };
  if (result.count === 0) return response.status(404).json({ error: "Document not found." });

  const document = await prisma.document.findUniqueOrThrow({ where: { id } });
  response.json(serialize(document));
});

documentsRouter.delete("/:id", async (request, response) => {
  const id = Number(request.params.id);
  const result = Number.isInteger(id)
    ? await prisma.document.deleteMany({ where: { id, userId: response.locals.user.id } })
    : { count: 0 };
  if (result.count === 0) return response.status(404).json({ error: "Document not found." });
  response.status(204).end();
});
