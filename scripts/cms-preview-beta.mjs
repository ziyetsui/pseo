#!/usr/bin/env node

import { spawn } from "node:child_process";
import { readFile } from "node:fs/promises";
import net from "node:net";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  buildBetaEnvironment,
  databaseSocket,
  parseEnvFile,
  snapshotProtectedPaths,
} from "./cms-preview-beta-lib.mjs";

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const repositoryRoot = path.dirname(scriptDirectory);
const cmsRoot = path.join(repositoryRoot, "cms");
const frontendRoot = path.join(repositoryRoot, "frontend");
const protectedPaths = [
  "content",
  "frontend/src/data/wireframe",
  "frontend/out",
  "infra/generated/static",
];
const verifyAndStop = process.argv.includes("--verify-and-stop");
const children = [];

function safeStatus(stage, detail) {
  process.stdout.write(`${JSON.stringify({ stage, ...detail })}\n`);
}

async function portAvailable(port) {
  return await new Promise((resolve, reject) => {
    const server = net.createServer();
    server.once("error", (error) => {
      if (error.code === "EADDRINUSE") resolve(false);
      else reject(error);
    });
    server.once("listening", () => server.close(() => resolve(true)));
    server.listen(port, "127.0.0.1");
  });
}

async function verifyDatabase(databaseUri) {
  const target = databaseSocket(databaseUri);
  await new Promise((resolve, reject) => {
    const socket = net.createConnection(target);
    const timer = setTimeout(() => socket.destroy(new Error("PostgreSQL connectivity timed out")), 3_000);
    socket.once("connect", () => {
      clearTimeout(timer);
      socket.end();
      resolve();
    });
    socket.once("error", (error) => {
      clearTimeout(timer);
      reject(new Error(`PostgreSQL is unavailable on the configured local socket: ${error.message}`));
    });
  });
}

function start(command, args, cwd, environment) {
  const child = spawn(command, args, {
    cwd,
    env: environment,
    stdio: "inherit",
  });
  children.push(child);
  return child;
}

async function run(command, args, cwd, environment) {
  await new Promise((resolve, reject) => {
    const child = spawn(command, args, { cwd, env: environment, stdio: "inherit" });
    child.once("error", reject);
    child.once("exit", (code, signal) => {
      if (code === 0) resolve();
      else reject(new Error(`${command} exited with ${code ?? signal ?? "unknown status"}`));
    });
  });
}

async function waitFor(label, operation, timeoutMs = 90_000) {
  const deadline = Date.now() + timeoutMs;
  let lastError;
  while (Date.now() < deadline) {
    try {
      if (await operation()) return;
    } catch (error) {
      lastError = error;
    }
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  throw new Error(`${label} did not become ready${lastError instanceof Error ? `: ${lastError.message}` : ""}`);
}

async function stopChildren() {
  for (const child of [...children].reverse()) {
    if (child.exitCode === null && child.signalCode === null) child.kill("SIGTERM");
  }
  await Promise.all(children.map(async (child) => {
    if (child.exitCode !== null || child.signalCode !== null) return;
    await Promise.race([
      new Promise((resolve) => child.once("exit", resolve)),
      new Promise((resolve) => setTimeout(resolve, 5_000)),
    ]);
  }));
}

async function main() {
  if (!(await portAvailable(3001))) {
    throw new Error("127.0.0.1:3001 is already in use; stop the old CMS process before starting Beta");
  }
  if (!(await portAvailable(3200))) {
    throw new Error("127.0.0.1:3200 is already in use; the Beta preview port must be dedicated");
  }

  const cmsEnvSource = await readFile(path.join(cmsRoot, ".env"), "utf8");
  const environment = buildBetaEnvironment(process.env, parseEnvFile(cmsEnvSource));
  await verifyDatabase(environment.DATABASE_URI);
  safeStatus("database", { status: "ready" });
  const before = await snapshotProtectedPaths(repositoryRoot, protectedPaths);

  safeStatus("seed", { status: "starting" });
  await run(
    "node",
    ["--experimental-strip-types", "scripts/preview-loop-e2e.ts", "--seed"],
    cmsRoot,
    environment,
  );

  safeStatus("cms", { status: "starting", url: "http://127.0.0.1:3001/admin" });
  start("pnpm", ["exec", "next", "dev", "--hostname", "127.0.0.1", "--port", "3001"], cmsRoot, environment);
  await waitFor("CMS preview", async () => {
    const url = new URL("/api/internal/v1/preview-catalog?locale=zh-CN", environment.PSEO_PREVIEW_API_BASE_URL);
    const response = await fetch(url, { headers: { authorization: `Bearer ${environment.CMS_PREVIEW_TOKEN}` } });
    return response.ok;
  });

  safeStatus("frontend", { status: "starting", url: "http://127.0.0.1:3200/zh-CN/prompts" });
  start(
    "pnpm",
    ["exec", "next", "dev", "--webpack", "--hostname", "127.0.0.1", "--port", "3200"],
    frontendRoot,
    environment,
  );
  await waitFor("frontend preview", async () => {
    const response = await fetch("http://127.0.0.1:3200/zh-CN/prompts/country-miniature-stamp-poster");
    return response.ok;
  }, 120_000);

  safeStatus("e2e", { status: "starting" });
  await run(
    "node",
    ["--experimental-strip-types", "scripts/preview-loop-e2e.ts"],
    cmsRoot,
    environment,
  );
  const after = await snapshotProtectedPaths(repositoryRoot, protectedPaths);
  if (after !== before) throw new Error("preview loop changed checked-in content or static fixture output");

  safeStatus("ready", {
    cms: "http://127.0.0.1:3001/admin",
    frontend: "http://127.0.0.1:3200/zh-CN/prompts",
    protectedContent: "unchanged",
    submitReview: "mock-only",
  });

  if (verifyAndStop) return;
  await new Promise((resolve) => {
    const done = () => resolve();
    process.once("SIGINT", done);
    process.once("SIGTERM", done);
    for (const child of children) child.once("exit", done);
  });
}

try {
  await main();
} finally {
  await stopChildren();
}
