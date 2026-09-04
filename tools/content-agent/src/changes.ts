import { createHash } from "node:crypto";

import type { ChangeInspection, ChangeInspector, ChangedFile } from "./contracts.ts";
import { runCommand } from "./command.ts";

function splitNulls(value: string): string[] {
  return value.split("\0").filter((entry) => entry.length > 0);
}

export function createGitChangeInspector(): ChangeInspector {
  return {
    async inspect(root: string, baseSha: string): Promise<ChangeInspection> {
      const tracked = splitNulls(
        (
          await runCommand(
            "git",
            ["diff", "--no-renames", "--name-only", "-z", baseSha, "--"],
            { cwd: root },
          )
        ).stdout,
      );
      const deleted = new Set(
        splitNulls(
          (
            await runCommand(
              "git",
              [
                "diff",
                "--no-renames",
                "--diff-filter=D",
                "--name-only",
                "-z",
                baseSha,
                "--",
              ],
              { cwd: root },
            )
          ).stdout,
        ),
      );
      const untracked = splitNulls(
        (
          await runCommand(
            "git",
            ["ls-files", "--others", "--exclude-standard", "-z"],
            { cwd: root },
          )
        ).stdout,
      );
      const ignored = splitNulls(
        (
          await runCommand(
            "git",
            ["ls-files", "--others", "--ignored", "--exclude-standard", "-z"],
            { cwd: root },
          )
        ).stdout,
      );
      const untrackedSet = new Set(untracked);
      const ignoredSet = new Set(ignored);
      if (untrackedSet.size > 0) {
        await runCommand("git", ["add", "--intent-to-add", "--", ...untrackedSet], {
          cwd: root,
        });
      }

      const allPaths = [
        ...new Set([...tracked, ...untrackedSet, ...ignoredSet]),
      ].sort();
      const changedFiles: ChangedFile[] = [];
      for (const path of allPaths) {
        if (deleted.has(path)) {
          changedFiles.push({ path, status: "D" });
          continue;
        }
        if (untrackedSet.has(path) || ignoredSet.has(path)) {
          changedFiles.push({
            path,
            status: "?",
            ...(ignoredSet.has(path) ? { ignored: true } : {}),
          });
          continue;
        }
        try {
          await runCommand("git", ["cat-file", "-e", `${baseSha}:${path}`], {
            cwd: root,
          });
          changedFiles.push({ path, status: "M" });
        } catch {
          changedFiles.push({ path, status: "A" });
        }
      }

      const diffablePaths = allPaths.filter((path) => !ignoredSet.has(path));
      const patch = (
        await runCommand(
          "git",
          [
            "diff",
            "--binary",
            "--no-ext-diff",
            "--no-renames",
            baseSha,
            "--",
            ...diffablePaths,
          ],
          { cwd: root },
        )
      ).stdout;
      return {
        changedFiles,
        patch,
        digest: `sha256:${createHash("sha256").update(patch).digest("hex")}`,
      };
    },
  };
}
