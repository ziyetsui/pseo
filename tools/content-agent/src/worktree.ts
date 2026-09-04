import { mkdir, mkdtemp, realpath, rm, unlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { basename, join } from "node:path";

import type { WorktreeManager, WorktreeSession } from "./contracts.ts";
import { runCommand } from "./command.ts";

export class WorktreeFailure extends Error {
  constructor() {
    super("Unable to create or remove the isolated Git worktree.");
    this.name = "WorktreeFailure";
  }
}

export function createGitWorktreeManager(expectedRepositoryRoot: string): WorktreeManager {
  return {
    async create(repoRoot: string, baseRef: string): Promise<WorktreeSession> {
      let canonicalRepo: string;
      let canonicalExpectedRepo: string;
      try {
        [canonicalRepo, canonicalExpectedRepo] = await Promise.all([
          realpath(repoRoot),
          realpath(expectedRepositoryRoot),
        ]);
      } catch {
        throw new WorktreeFailure();
      }
      if (canonicalRepo !== canonicalExpectedRepo || baseRef !== "HEAD") {
        throw new WorktreeFailure();
      }

      const runRoot = await mkdtemp(join(tmpdir(), "pseo-content-agent-"));
      const root = join(runRoot, "worktree");
      const runtimeRoot = join(runRoot, "runtime");
      const artifactRoot = join(runRoot, "artifacts");
      const runId = basename(runRoot);

      try {
        const baseSha = (
          await runCommand(
            "git",
            ["rev-parse", "--verify", "--end-of-options", `${baseRef}^{commit}`],
            { cwd: canonicalRepo },
          )
        ).stdout.trim();
        await mkdir(runtimeRoot, { recursive: true, mode: 0o700 });
        await mkdir(artifactRoot, { recursive: true, mode: 0o700 });
        await runCommand(
          "git",
          [
            "-c",
            "core.hooksPath=/dev/null",
            "worktree",
            "add",
            "--detach",
            root,
            baseSha,
          ],
          { cwd: canonicalRepo },
        );

        let cleaned = false;
        return {
          runId,
          root,
          runtimeRoot,
          artifactRoot,
          baseSha,
          applyPatch: async (patch) => {
            if (cleaned) {
              throw new WorktreeFailure();
            }
            if (patch.length === 0) {
              return;
            }
            const patchPath = join(runtimeRoot, "captured.patch");
            try {
              await writeFile(patchPath, patch, {
                encoding: "utf8",
                flag: "wx",
                mode: 0o600,
              });
              await runCommand(
                "git",
                [
                  "-c",
                  "core.hooksPath=/dev/null",
                  "apply",
                  "--binary",
                  "--whitespace=nowarn",
                  patchPath,
                ],
                { cwd: root },
              );
            } catch {
              throw new WorktreeFailure();
            } finally {
              await unlink(patchPath).catch(() => undefined);
            }
          },
          cleanup: async () => {
            if (cleaned) {
              return;
            }
            try {
              await runCommand(
                "git",
                [
                  "-c",
                  "core.hooksPath=/dev/null",
                  "worktree",
                  "remove",
                  "--force",
                  root,
                ],
                { cwd: canonicalRepo },
              );
              await rm(runRoot, { recursive: true, force: true });
              cleaned = true;
            } catch {
              throw new WorktreeFailure();
            }
          },
        };
      } catch (error) {
        await rm(runRoot, { recursive: true, force: true });
        if (error instanceof WorktreeFailure) {
          throw error;
        }
        throw new WorktreeFailure();
      }
    },
  };
}
