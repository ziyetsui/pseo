import assert from "node:assert/strict";
import { mkdir, mkdtemp, symlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

import {
  GuardViolation,
  assertAllowedChanges,
  assertPatchContainsNoSecrets,
} from "../src/guards.ts";

async function makeWorkspace(): Promise<string> {
  const root = await mkdtemp(join(tmpdir(), "pseo-guard-test-"));
  await mkdir(join(root, "content", "prompts", "prm_test"), { recursive: true });
  await writeFile(
    join(root, "content", "prompts", "prm_test", "zh-CN.md"),
    "---\nstatus: draft\nindexable: false\n---\n",
  );
  return root;
}

test("accepts a regular file under the canonical content paths", async () => {
  const root = await makeWorkspace();

  await assert.doesNotReject(
    assertAllowedChanges(root, [
      { path: "content/prompts/prm_test/zh-CN.md", status: "M" },
    ], { kind: "prompt", id: "prm_test", locale: "zh-CN" }, []),
  );
});

test("rejects a second document and undeclared relationship files", async () => {
  const root = await makeWorkspace();
  await mkdir(join(root, "content", "taxonomies", "model", "mdl_test"), {
    recursive: true,
  });
  await writeFile(
    join(root, "content", "taxonomies", "model", "mdl_test", "zh-CN.json"),
    "{}\n",
  );

  await assert.rejects(
    assertAllowedChanges(
      root,
      [{ path: "content/taxonomies/model/mdl_test/zh-CN.json", status: "?" }],
      { kind: "prompt", id: "prm_test", locale: "zh-CN" },
      [],
    ),
    (error: unknown) =>
      error instanceof GuardViolation && error.code === "path_outside_allowlist",
  );
  await assert.doesNotReject(
    assertAllowedChanges(
      root,
      [{ path: "content/taxonomies/model/mdl_test/zh-CN.json", status: "?" }],
      { kind: "prompt", id: "prm_test", locale: "zh-CN" },
      ["content/taxonomies/model/mdl_test/zh-CN.json"],
    ),
  );
});

test("rejects traversal and non-content files", async () => {
  const root = await makeWorkspace();

  await assert.rejects(
    assertAllowedChanges(root, [{ path: "../cms/.env", status: "?" }], undefined, []),
    (error: unknown) =>
      error instanceof GuardViolation && error.code === "path_outside_allowlist",
  );

  await assert.rejects(
    assertAllowedChanges(root, [{ path: "content/AGENTS.md", status: "M" }], undefined, []),
    (error: unknown) =>
      error instanceof GuardViolation && error.code === "path_outside_allowlist",
  );
});

test("rejects symlinks even when their visible path is allowed", async () => {
  const root = await makeWorkspace();
  const target = join(root, "outside.md");
  const link = join(root, "content", "prompts", "prm_test", "en.md");
  await writeFile(target, "outside");
  await symlink(target, link);

  await assert.rejects(
    assertAllowedChanges(root, [
      { path: "content/prompts/prm_test/en.md", status: "?" },
    ], { kind: "prompt", id: "prm_test", locale: "en" }, []),
    (error: unknown) =>
      error instanceof GuardViolation && error.code === "unsafe_file_type",
  );
});

test("rejects credential-shaped values but not ordinary security prose", () => {
  assert.doesNotThrow(() =>
    assertPatchContainsNoSecrets("Never print OPENAI_API_KEY or Cookie values."),
  );

  assert.throws(
    () =>
      assertPatchContainsNoSecrets(
        "+OPENAI_API_KEY=sk-proj-abcdefghijklmnopqrstuvwxyz0123456789",
      ),
    (error: unknown) =>
      error instanceof GuardViolation && error.code === "secret_detected",
  );
});
