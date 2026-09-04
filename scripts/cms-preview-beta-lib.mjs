import { createHash, randomBytes } from "node:crypto";
import { lstat, readFile, readdir, readlink } from "node:fs/promises";
import path from "node:path";

export function parseEnvFile(source) {
  const values = {};
  for (const rawLine of source.split(/\r?\n/u)) {
    const line = rawLine.trim();
    if (line.length === 0 || line.startsWith("#")) continue;
    const match = /^(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)=(.*)$/u.exec(line);
    if (!match) continue;
    let value = match[2] ?? "";
    if (
      value.length >= 2 &&
      ((value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'")))
    ) {
      value = value.slice(1, -1);
    }
    values[match[1]] = value;
  }
  return values;
}

function required(environment, name) {
  const value = environment[name]?.trim();
  if (!value) throw new Error(`${name} is required in cms/.env or the process environment`);
  return value;
}

export function databaseSocket(databaseUri) {
  const url = new URL(databaseUri);
  if (url.protocol !== "postgres:" && url.protocol !== "postgresql:") {
    throw new Error("DATABASE_URI must use postgres:// or postgresql://");
  }
  return { host: url.hostname, port: url.port.length > 0 ? Number(url.port) : 5432 };
}

export function buildBetaEnvironment(processEnvironment, cmsEnvironment, random = randomBytes) {
  const merged = { ...cmsEnvironment, ...processEnvironment };
  const payloadSecret = required(merged, "PAYLOAD_SECRET");
  if (payloadSecret.length < 32) throw new Error("PAYLOAD_SECRET must contain at least 32 characters");
  required(merged, "DATABASE_URI");

  const token = merged.CMS_PREVIEW_TOKEN?.trim() || random(32).toString("hex");
  if (token.length < 32) throw new Error("CMS_PREVIEW_TOKEN must contain at least 32 characters");

  const environment = { ...merged };
  for (const retiredKey of [
    "CMS_GIT_PUBLISHER",
    "CMS_MOCK_GIT_BASE_SHA",
    "CMS_GITHUB_TOKEN",
    "CMS_GITHUB_REPOSITORY",
    "CMS_GITHUB_BASE_BRANCH",
  ]) {
    delete environment[retiredKey];
  }

  return {
    ...environment,
    PAYLOAD_PUBLIC_SERVER_URL: "http://127.0.0.1:3001",
    CMS_PREVIEW_ENABLED: "true",
    CMS_PREVIEW_TOKEN: token,
    PSEO_CONTENT_SOURCE: "cms-preview",
    PSEO_PREVIEW: "1",
    PSEO_PREVIEW_API_BASE_URL: "http://127.0.0.1:3001",
    PSEO_PREVIEW_API_TOKEN: token,
    PSEO_PREVIEW_FRONTEND_URL: "http://127.0.0.1:3200",
  };
}

async function appendPath(hash, absolutePath, relativePath) {
  let info;
  try {
    info = await lstat(absolutePath);
  } catch (error) {
    if (error && typeof error === "object" && error.code === "ENOENT") {
      hash.update(`missing\0${relativePath}\0`);
      return;
    }
    throw error;
  }
  if (info.isSymbolicLink()) {
    hash.update(`symlink\0${relativePath}\0${await readlink(absolutePath)}\0`);
    return;
  }
  if (info.isDirectory()) {
    hash.update(`directory\0${relativePath}\0`);
    const entries = await readdir(absolutePath);
    entries.sort((left, right) => left.localeCompare(right, "en"));
    for (const entry of entries) {
      await appendPath(hash, path.join(absolutePath, entry), path.posix.join(relativePath, entry));
    }
    return;
  }
  if (info.isFile()) {
    hash.update(`file\0${relativePath}\0`);
    hash.update(await readFile(absolutePath));
    hash.update("\0");
    return;
  }
  hash.update(`other\0${relativePath}\0`);
}

export async function snapshotProtectedPaths(repositoryRoot, relativePaths) {
  const hash = createHash("sha256");
  for (const relativePath of [...relativePaths].sort((left, right) => left.localeCompare(right, "en"))) {
    await appendPath(hash, path.join(repositoryRoot, relativePath), relativePath);
  }
  return `sha256:${hash.digest("hex")}`;
}
