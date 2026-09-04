import { readdir } from "node:fs/promises";
import { join, relative } from "node:path";

import type { ValidationRecord, ValidationService } from "./contracts.ts";
import { CommandFailure, runCommand } from "./command.ts";

export class ValidationFailure extends Error {
  readonly records: ValidationRecord[];

  constructor(records: ValidationRecord[]) {
    super("A deterministic content gate failed.");
    this.name = "ValidationFailure";
    this.records = records;
  }
}

export function createValidationService(): ValidationService {
  return {
    async run(root: string, artifactRoot: string): Promise<ValidationRecord[]> {
      const testDirectory = join(root, "infra", "tests");
      const testFiles = (await readdir(testDirectory))
        .filter((name) => name.endsWith(".test.mjs"))
        .sort()
        .map((name) => relative(root, join(testDirectory, name)));
      const commands: Array<{ label: string; program: string; args: string[] }> = [
        {
          label: "node infra/bin/content.mjs validate",
          program: "node",
          args: ["infra/bin/content.mjs", "validate"],
        },
        {
          label: "node infra/bin/content.mjs build --output <artifact>/generated",
          program: "node",
          args: [
            "infra/bin/content.mjs",
            "build",
            "--output",
            join(artifactRoot, "generated"),
          ],
        },
        {
          label: "node --test infra/tests/*.test.mjs",
          program: "node",
          args: ["--test", ...testFiles],
        },
      ];
      const records: ValidationRecord[] = [];

      for (const command of commands) {
        const startedAt = Date.now();
        try {
          const result = await runCommand(command.program, command.args, {
            cwd: root,
            timeoutMs: 120_000,
          });
          records.push({
            command: command.label,
            exitCode: result.exitCode,
            durationMs: result.durationMs,
          });
        } catch (error) {
          records.push({
            command: command.label,
            exitCode: error instanceof CommandFailure ? error.exitCode : 1,
            durationMs: Date.now() - startedAt,
          });
          throw new ValidationFailure(records);
        }
      }
      return records;
    },
  };
}
