import assert from "node:assert/strict";
import { mkdir, mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

import { createGitChangeInspector } from "../src/changes.ts";
import { runCommand } from "../src/command.ts";
import { GuardViolation, assertAllowedChanges } from "../src/guards.ts";

test("marks ignored canonical content so the guard fails closed", async () => {
  const repo = await mkdtemp(join(tmpdir(), "pseo-change-inspector-"));
  await runCommand("git", ["init", "--initial-branch=main"], { cwd: repo });
  await writeFile(join(repo, ".gitignore"), "content/prompts/prm_new/zh-CN.md\n");
  await writeFile(join(repo, "seed.txt"), "seed\n");
  await runCommand("git", ["add", ".gitignore", "seed.txt"], { cwd: repo });
  await runCommand(
    "git",
    [
      "-c",
      "user.name=Content Agent Test",
      "-c",
      "user.email=content-agent@example.invalid",
      "commit",
      "-m",
      "seed",
    ],
    { cwd: repo },
  );
  const baseSha = (
    await runCommand("git", ["rev-parse", "HEAD"], { cwd: repo })
  ).stdout.trim();
  await mkdir(join(repo, "content", "prompts", "prm_new"), { recursive: true });
  await writeFile(
    join(repo, "content", "prompts", "prm_new", "zh-CN.md"),
    "---\nstatus: draft\n---\n",
  );

  const inspection = await createGitChangeInspector().inspect(repo, baseSha);
  assert.deepEqual(inspection.changedFiles, [
    {
      path: "content/prompts/prm_new/zh-CN.md",
      status: "?",
      ignored: true,
    },
  ]);
  assert.equal(inspection.patch, "");
  await assert.rejects(
    assertAllowedChanges(
      repo,
      inspection.changedFiles,
      { kind: "prompt", id: "prm_new", locale: "zh-CN" },
      [],
    ),
    (error: unknown) =>
      error instanceof GuardViolation && error.code === "path_outside_allowlist",
  );
});

test("reports both sides of a rename so the source deletion cannot be hidden", async () => {
  const repo = await mkdtemp(join(tmpdir(), "pseo-change-rename-"));
  await runCommand("git", ["init", "--initial-branch=main"], { cwd: repo });
  const sourceDirectory = join(repo, "content", "prompts", "prm_old");
  const targetDirectory = join(repo, "content", "prompts", "prm_new");
  await mkdir(sourceDirectory, { recursive: true });
  await writeFile(
    join(sourceDirectory, "zh-CN.md"),
    "---\nstatus: draft\nindexable: false\n---\n",
  );
  await runCommand("git", ["add", "content"], { cwd: repo });
  await runCommand(
    "git",
    [
      "-c",
      "user.name=Content Agent Test",
      "-c",
      "user.email=content-agent@example.invalid",
      "commit",
      "-m",
      "seed",
    ],
    { cwd: repo },
  );
  const baseSha = (
    await runCommand("git", ["rev-parse", "HEAD"], { cwd: repo })
  ).stdout.trim();
  await mkdir(targetDirectory, { recursive: true });
  await runCommand(
    "git",
    [
      "mv",
      "content/prompts/prm_old/zh-CN.md",
      "content/prompts/prm_new/zh-CN.md",
    ],
    { cwd: repo },
  );

  const inspection = await createGitChangeInspector().inspect(repo, baseSha);
  assert.deepEqual(inspection.changedFiles, [
    { path: "content/prompts/prm_new/zh-CN.md", status: "A" },
    { path: "content/prompts/prm_old/zh-CN.md", status: "D" },
  ]);
  await assert.rejects(
    assertAllowedChanges(
      repo,
      inspection.changedFiles,
      { kind: "prompt", id: "prm_new", locale: "zh-CN" },
      [],
    ),
    (error: unknown) =>
      error instanceof GuardViolation && error.code === "path_outside_allowlist",
  );
});
