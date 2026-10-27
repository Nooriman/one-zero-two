import "dotenv/config";
import { createInterface } from "node:readline/promises";
import { Writable } from "node:stream";
import { CODE_PATTERN, hashCode, verifyCode } from "../src/auth/crypto.js";
import { prisma } from "../src/lib/prisma.js";

const MAX_USERS = 2;

// Echoes output only while `muted` is false, so the code isn't shown as you type it.
let muted = false;
const output = new Writable({
  write(chunk, _encoding, callback) {
    if (!muted) process.stdout.write(chunk);
    callback();
  },
});
const rl = createInterface({ input: process.stdin, output, terminal: true });

const existing = await prisma.user.findMany({ orderBy: { id: "asc" } });
console.log(
  existing.length
    ? `Existing users: ${existing.map((user) => user.name).join(", ")}`
    : "No users yet.",
);

const name = (await rl.question("User name (new, or existing to change their code): "))
  .trim()
  .toLowerCase();
if (!name) fail("Name is required.");

const current = existing.find((user) => user.name === name);
if (!current && existing.length >= MAX_USERS) {
  fail(`Only ${MAX_USERS} users are allowed. Use one of the existing names.`);
}

const code = await askHidden("6-digit access code: ");
const confirm = await askHidden("Repeat the code: ");
rl.close();

if (!CODE_PATTERN.test(code)) fail("Code must be exactly 6 digits.");
if (code !== confirm) fail("Codes do not match.");

// Login identifies the user by the code alone, so two users can't share one.
for (const other of existing.filter((user) => user.name !== name)) {
  if (await verifyCode(code, { hash: other.codeHash, salt: other.codeSalt })) {
    fail("That code is already in use. Choose a different one.");
  }
}

const { hash, salt } = await hashCode(code);
const user = await prisma.user.upsert({
  where: { name },
  update: { codeHash: hash, codeSalt: salt },
  create: { name, codeHash: hash, codeSalt: salt },
});
// Changing a code signs that user out everywhere.
await prisma.session.deleteMany({ where: { userId: user.id } });
await prisma.$disconnect();
console.log(`Access code saved (hashed) for "${name}".`);

async function askHidden(prompt: string) {
  process.stdout.write(prompt);
  muted = true;
  const answer = await rl.question("");
  muted = false;
  process.stdout.write("\n");
  return answer.trim();
}

function fail(message: string): never {
  console.error(message);
  process.exit(1);
}
