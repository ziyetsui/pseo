import { lstat, mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";

import type { ArtifactWriter } from "./contracts.ts";

export function createArtifactWriter(): ArtifactWriter {
  return {
    async write(record, patch, artifactRoot) {
      await mkdir(artifactRoot, { recursive: true, mode: 0o700 });
      const artifactStat = await lstat(artifactRoot);
      if (
        !artifactStat.isDirectory() ||
        artifactStat.isSymbolicLink() ||
        (artifactStat.mode & 0o077) !== 0
      ) {
        throw new Error("Artifact root is not a private directory.");
      }
      const auditPath = join(artifactRoot, "audit.json");
      if (record.status === "pr_ready" && patch !== undefined) {
        const patchPath = join(artifactRoot, "change.patch");
        await writeFile(patchPath, patch, {
          encoding: "utf8",
          flag: "wx",
          mode: 0o600,
        });
        await writeFile(auditPath, `${JSON.stringify(record, null, 2)}\n`, {
          encoding: "utf8",
          flag: "wx",
          mode: 0o600,
        });
        return { auditPath, patchPath };
      }
      await writeFile(auditPath, `${JSON.stringify(record, null, 2)}\n`, {
        encoding: "utf8",
        flag: "wx",
        mode: 0o600,
      });
      return { auditPath };
    },
  };
}
