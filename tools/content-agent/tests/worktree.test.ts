import assert from "node:assert/strict";
import { access, mkdtemp, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

import { runCommand } from "../src/command.ts";
import { WorktreeFailure, createGitWorktreeManager } from "../src/worktree.ts";

test("creates a detached one-time worktree and removes it", async () => {
  const repo = await mkdtemp(join(tmpdir(), "pseo-worktree-repo-"));
  await runCommand("git", ["init", "--initial-branch=main"], { cwd: repo });
  await writeFile(join(repo, "seed.txt"), "seed\n");
  await runCommand("git", ["add", "seed.txt"], { cwd: repo });
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

  const manager = createGitWorktreeManager(repo);
  const session = await manager.create(repo, "HEAD");
  assert.notEqual(session.root, repo);
  assert.match(session.baseSha, /^[0-9a-f]{40}$/u);
  assert.equal(
    (await runCommand("git", ["rev-parse", "--is-inside-work-tree"], {
      cwd: session.root,
    })).stdout.trim(),
    "true",
  );

  await session.applyPatch(
    "diff --git a/seed.txt b/seed.txt\n--- a/seed.txt\n+++ b/seed.txt\n@@ -1 +1 @@\n-seed\n+changed\n",
  );
  assert.equal(await readFile(join(session.root, "seed.txt"), "utf8"), "changed\n");

  await session.cleanup();
  await assert.rejects(access(session.root));
});

test("refuses a repository other than the configured canonical repository", async () => {
  const trusted = await mkdtemp(join(tmpdir(), "pseo-worktree-trusted-"));
  const untrusted = await mkdtemp(join(tmpdir(), "pseo-worktree-untrusted-"));
  const manager = createGitWorktreeManager(trusted);

  await assert.rejects(
    manager.create(untrusted, "HEAD"),
    (error: unknown) => error instanceof WorktreeFailure,
  );
});
