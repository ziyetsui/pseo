import assert from "node:assert/strict";
import { mkdtemp, mkdir, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";

import {
  buildBetaEnvironment,
  databaseSocket,
  parseEnvFile,
  snapshotProtectedPaths,
} from "../cms-preview-beta-lib.mjs";

test("private beta environment is validated without requiring credentials in public config", () => {
  const cmsEnv = parseEnvFile(`
PAYLOAD_SECRET=payload-secret-that-is-long-enough
DATABASE_URI=postgresql://localhost/pseo_cms
PAYLOAD_PUBLIC_SERVER_URL=http://127.0.0.1:3001
CMS_GIT_PUBLISHER=mock
CMS_MOCK_GIT_BASE_SHA=aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa
`);
  const env = buildBetaEnvironment({}, cmsEnv, () => Buffer.from("b".repeat(64), "hex"));

  assert.equal(env.CMS_PREVIEW_ENABLED, "true");
  assert.equal(env.CMS_PREVIEW_TOKEN, "b".repeat(64));
  assert.equal(env.PSEO_CONTENT_SOURCE, "cms-preview");
  assert.equal(env.PSEO_PREVIEW, "1");
  assert.equal(env.PSEO_PREVIEW_API_BASE_URL, "http://127.0.0.1:3001");
  assert.equal(env.PSEO_PREVIEW_API_TOKEN, env.CMS_PREVIEW_TOKEN);
  assert.equal(env.PSEO_PREVIEW_FRONTEND_URL, "http://127.0.0.1:3200");
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
