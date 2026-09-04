import assert from "node:assert/strict";
import { mkdtemp, readFile, symlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

import { createArtifactWriter } from "../src/artifacts.ts";
import type { AuditRecord } from "../src/contracts.ts";

const record: AuditRecord = {
  schemaVersion: 1,
  runId: "run_test",
  status: "failed",
  intent: "validate",
  relationPaths: [],
  briefDigest: "sha256:test",
  baseSha: "a".repeat(40),
  startedAtMs: 1,
  finishedAtMs: 2,
  durationMs: 1,
  sandboxes: ["read-only", "read-only"],
  approvalPolicy: "never",
  threadIds: [],
  changedFiles: [],
  validation: [],
  worktreeCleaned: true,
  failure: { code: "validation_failed" },
};

test("refuses to follow a pre-existing audit symlink", async () => {
  const root = await mkdtemp(join(tmpdir(), "pseo-artifact-test-"));
  const target = join(root, "target.txt");
  await writeFile(target, "unchanged\n");
  await symlink(target, join(root, "audit.json"));

  await assert.rejects(createArtifactWriter().write(record, undefined, root));
  assert.equal(await readFile(target, "utf8"), "unchanged\n");
});
