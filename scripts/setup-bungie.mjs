#!/usr/bin/env node
/**
 * Validates repo-root .env, auto-generates SESSION_SECRET if missing,
 * then runs the manifest generate step (weapons.json + armor.json).
 */
import { randomBytes } from "node:crypto";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const envPath = resolve(root, ".env");
const examplePath = resolve(root, ".env.example");

if (!existsSync(envPath)) {
  if (existsSync(examplePath)) {
    writeFileSync(envPath, readFileSync(examplePath, "utf8"));
    console.log("Created .env from .env.example");
  } else {
    console.error("Missing .env — copy .env.example to .env first.");
    process.exit(1);
  }
}

let envContent = readFileSync(envPath, "utf8");

function envValue(key) {
  const match = envContent.match(new RegExp(`^${key}=(.*)$`, "m"));
  return match?.[1]?.trim() ?? "";
}

const required = ["BUNGIE_API_KEY", "BUNGIE_CLIENT_ID", "BUNGIE_CLIENT_SECRET"];
const missing = required.filter((key) => !envValue(key));

if (!envValue("SESSION_SECRET")) {
  const secret = randomBytes(32).toString("hex");
  if (/^SESSION_SECRET=/m.test(envContent)) {
    envContent = envContent.replace(/^SESSION_SECRET=.*$/m, `SESSION_SECRET=${secret}`);
  } else {
    envContent = `${envContent.trimEnd()}\nSESSION_SECRET=${secret}\n`;
  }
  writeFileSync(envPath, envContent);
  console.log("✓ Generated SESSION_SECRET in .env");
}

if (missing.length > 0) {
  console.error(`Missing in .env: ${missing.join(", ")}`);
  console.error("See docs/bungie-setup.md for how to get these from bungie.net.");
  process.exit(1);
}

console.log("Running manifest generate…");
const result = spawnSync("pnpm", ["--filter", "@repo/destiny", "generate"], {
  cwd: root,
  stdio: "inherit",
  env: { ...process.env },
});

if (result.status === 0) {
  console.log("✓ Setup complete — run pnpm dev and sign in at https://localhost:4111");
}

process.exit(result.status ?? 1);
