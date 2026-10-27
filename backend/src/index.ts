import "dotenv/config";
import cors from "cors";
import express from "express";
import { authRouter } from "./auth/routes.js";
import { debtsRouter } from "./debts/routes.js";
import { vaultRouter } from "./vault/routes.js";
import { documentsRouter } from "./documents/routes.js";
import { expensesRouter } from "./expenses/routes.js";
import { budgetRouter } from "./budget/routes.js";
import { liabilitiesRouter } from "./liabilities/routes.js";
import { prisma } from "./lib/prisma.js";

const app = express();
const port = Number(process.env.PORT ?? 3000);

app.set("trust proxy", process.env.TRUST_PROXY === "1");
app.use(cors({ origin: process.env.CORS_ORIGIN || false, credentials: true }));
app.use(express.json({ limit: "32kb" }));
app.use("/api/auth", authRouter);
app.use("/api/debts", debtsRouter);
app.use("/api/expenses", expensesRouter);
app.use("/api/liabilities", liabilitiesRouter);
app.use("/api/budget", budgetRouter);
app.use("/api/documents", documentsRouter);
app.use("/api/vault", vaultRouter);

app.get("/api/health", async (_request, response) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    response.json({ status: "ok", database: "connected" });
  } catch {
    response.status(503).json({ status: "error", database: "disconnected" });
  }
});

const server = app.listen(port, () => {
  console.log(`API listening on http://localhost:${port}`);
});

const shutdown = () => {
  server.close(() => {
    void prisma.$disconnect();
  });
};

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
