import { Router, type NextFunction, type Request, type Response } from "express";
import { prisma } from "../lib/prisma.js";
import { CODE_PATTERN, hashToken, newSessionToken, verifyCode } from "./crypto.js";
import { clearFailures, recordFailure, retryAfter } from "./rateLimit.js";

const COOKIE = "session";
const SESSION_MS = 7 * 24 * 60 * 60 * 1000;
const secure = process.env.NODE_ENV === "production";

function readCookie(request: Request, name: string) {
  for (const part of (request.headers.cookie ?? "").split(";")) {
    const [key, ...value] = part.trim().split("=");
    if (key === name) return value.join("=");
  }
  return undefined;
}

async function findSession(request: Request) {
  const token = readCookie(request, COOKIE);
  if (!token) return null;
  const session = await prisma.session.findUnique({
    where: { tokenHash: hashToken(token) },
    include: { user: { select: { id: true, name: true } } },
  });
  return session && session.expiresAt > new Date() ? session : null;
}

/** Guard for any route that needs a logged-in user. */
export async function requireAuth(request: Request, response: Response, next: NextFunction) {
  try {
    const session = await findSession(request);
    if (session) {
      response.locals.user = session.user;
      return next();
    }
    response.status(401).json({ error: "Unauthorized" });
  } catch (error) {
    next(error);
  }
}

export const authRouter = Router();

authRouter.get("/session", async (request, response) => {
  response.setHeader("Cache-Control", "no-store");
  const session = await findSession(request);
  response.json({ authenticated: Boolean(session), name: session?.user.name ?? null });
});

authRouter.post("/login", async (request, response) => {
  response.setHeader("Cache-Control", "no-store");
  const ip = request.ip ?? "unknown";

  const wait = retryAfter(ip);
  if (wait > 0) {
    response.setHeader("Retry-After", String(wait));
    return response
      .status(429)
      .json({ error: "Too many attempts. Try again later.", retryAfter: wait });
  }

  const code: unknown = request.body?.code;
  if (typeof code !== "string" || !CODE_PATTERN.test(code)) {
    return response.status(400).json({ error: "Enter a 6-digit code." });
  }

  const users = await prisma.user.findMany();
  if (users.length === 0) {
    return response.status(503).json({ error: "No access codes have been set up yet." });
  }

  // Check every user so response time doesn't reveal which user (if any) matched.
  const results = await Promise.all(
    users.map((user) => verifyCode(code, { hash: user.codeHash, salt: user.codeSalt })),
  );
  const user = users.find((_, index) => results[index]);
  if (!user) {
    recordFailure(ip);
    return response.status(401).json({ error: "Incorrect code." });
  }

  clearFailures(ip);
  const { token, tokenHash } = newSessionToken();
  await prisma.session.deleteMany({ where: { expiresAt: { lt: new Date() } } });
  await prisma.session.create({
    data: { userId: user.id, tokenHash, expiresAt: new Date(Date.now() + SESSION_MS) },
  });
  response.cookie(COOKIE, token, {
    httpOnly: true,
    sameSite: "strict",
    secure,
    maxAge: SESSION_MS,
    path: "/",
  });
  response.json({ authenticated: true, name: user.name });
});

authRouter.post("/logout", async (request, response) => {
  const token = readCookie(request, COOKIE);
  if (token) await prisma.session.deleteMany({ where: { tokenHash: hashToken(token) } });
  response.clearCookie(COOKIE, { httpOnly: true, sameSite: "strict", secure, path: "/" });
  response.json({ authenticated: false });
});
