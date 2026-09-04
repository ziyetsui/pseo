import assert from "node:assert/strict";
import { mkdtemp, mkdir, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import {
  buildBetaEnvironment,
  databaseSocket,
  parseEnvFile,
  snapshotProtectedPaths,
} from "../cms-preview-beta-lib.mjs";

const scriptsRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

test("private beta environment enables CMS preview without a Git publisher or base revision", () => {
  const cmsEnv = parseEnvFile(`
PAYLOAD_SECRET=payload-secret-that-is-long-enough
DATABASE_URI=postgresql://localhost/pseo_cms
PAYLOAD_PUBLIC_SERVER_URL=http://127.0.0.1:3001
`);
  const env = buildBetaEnvironment({}, cmsEnv, () => Buffer.from("b".repeat(64), "hex"));

  assert.equal(env.CMS_PREVIEW_ENABLED, "true");
  assert.equal(env.CMS_PREVIEW_TOKEN, "b".repeat(64));
  assert.equal(env.PSEO_CONTENT_SOURCE, "cms-preview");
  assert.equal(env.PSEO_PREVIEW, "1");
  assert.equal(env.PSEO_PREVIEW_API_BASE_URL, "http://127.0.0.1:3001");
  assert.equal(env.PSEO_PREVIEW_API_TOKEN, env.CMS_PREVIEW_TOKEN);
  assert.equal(env.PSEO_PREVIEW_FRONTEND_URL, "http://127.0.0.1:3200");
  assert.equal(env.CMS_GIT_PUBLISHER, undefined);
  assert.equal(env.CMS_MOCK_GIT_BASE_SHA, undefined);
});

test("private beta strips retired Git publication configuration inherited from local env", () => {
  const env = buildBetaEnvironment({
    CMS_GIT_PUBLISHER: "github",
    CMS_MOCK_GIT_BASE_SHA: "a".repeat(40),
    CMS_GITHUB_TOKEN: "must-not-reach-cms",
    CMS_GITHUB_REPOSITORY: "someone/else",
    CMS_GITHUB_BASE_BRANCH: "main",
  }, {
    PAYLOAD_SECRET: "x".repeat(32),
    DATABASE_URI: "postgresql://localhost/pseo_cms",
  }, () => Buffer.from("b".repeat(64), "hex"));

  assert.equal(env.CMS_GIT_PUBLISHER, undefined);
  assert.equal(env.CMS_MOCK_GIT_BASE_SHA, undefined);
  assert.equal(env.CMS_GITHUB_TOKEN, undefined);
  assert.equal(env.CMS_GITHUB_REPOSITORY, undefined);
  assert.equal(env.CMS_GITHUB_BASE_BRANCH, undefined);
  assert.doesNotMatch(JSON.stringify(env), /must-not-reach-cms/u);
});

test("preview orchestrator reports the CMS-only review flow", async () => {
  const source = await readFile(path.join(scriptsRoot, "cms-preview-beta.mjs"), "utf8");
  assert.match(source, /reviewFlow:\s*"cms-preview-and-approval-only"/u);
  assert.doesNotMatch(source, /submitReview|mock-only/u);
});

test("database connectivity probe is derived without exposing credentials", () => {
  assert.deepEqual(databaseSocket("postgresql://editor:private@127.0.0.1:5544/pseo"), {
    host: "127.0.0.1",
    port: 5544,
  });
  assert.deepEqual(databaseSocket("postgres://localhost/pseo"), {
    host: "localhost",
    port: 5432,
  });
});

test("private beta environment fails closed when the CMS database settings are absent", () => {
  assert.throws(
    () => buildBetaEnvironment({}, { PAYLOAD_SECRET: "x".repeat(32) }),
    /DATABASE_URI/u,
  );
});

test("protected path snapshot changes when checked-in content changes", async () => {
  const root = await mkdtemp(path.join(tmpdir(), "pseo-preview-snapshot-"));
  await mkdir(path.join(root, "content"), { recursive: true });
  await writeFile(path.join(root, "content", "prompt.md"), "before\n");

  const before = await snapshotProtectedPaths(root, ["content", "missing-output"]);
  await writeFile(path.join(root, "content", "prompt.md"), "after\n");
  const after = await snapshotProtectedPaths(root, ["content", "missing-output"]);

  assert.notEqual(after, before);
});
