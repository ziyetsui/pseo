import { mkdir, mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

import { Codex } from "@openai/codex-sdk";

import { buildCodexOptions } from "./codex-adapter.ts";
import { runCommand } from "./command.ts";

async function main(): Promise<void> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (apiKey === undefined || apiKey.length === 0) {
    throw new Error("OPENAI_API_KEY is required.");
  }
  const runtimeRoot = await mkdtemp(join(tmpdir(), "pseo-codex-sdk-smoke-"));
  const codexHome = join(runtimeRoot, "codex-home");
  const home = join(runtimeRoot, "home");
  const temporary = join(runtimeRoot, "tmp");
  const workspace = join(runtimeRoot, "workspace");
  await Promise.all([
    mkdir(codexHome, { recursive: true, mode: 0o700 }),
    mkdir(home, { recursive: true, mode: 0o700 }),
    mkdir(temporary, { recursive: true, mode: 0o700 }),
    mkdir(workspace, { recursive: true, mode: 0o700 }),
  ]);
  try {
    await runCommand("git", ["init", "--initial-branch=main"], { cwd: workspace });
    const codexPathOverride = process.env.PSEO_CODEX_PATH;
    const repositoryRoot = resolve("../../");
    const codex = new Codex(
      buildCodexOptions(
        {
          apiKey,
          repositoryRoot,
          ...(codexPathOverride === undefined ? {} : { codexPathOverride }),
        },
        runtimeRoot,
        workspace,
        "read-only",
      ),
    );
    const thread = codex.startThread({
      workingDirectory: workspace,
      sandboxMode: "read-only",
      approvalPolicy: "never",
      networkAccessEnabled: false,
      webSearchMode: "disabled",
      threadSource: "pseo-content-agent-smoke",
    });
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 120_000);
    try {
      const result = await thread.run(
        "Reply with exactly CODEX_SDK_OK. Do not read files, run commands, use tools, or make changes.",
        { signal: controller.signal },
      );
      if (!result.finalResponse.includes("CODEX_SDK_OK")) {
        throw new Error("Unexpected Codex SDK smoke response.");
      }
      process.stdout.write("Codex SDK smoke passed in read-only mode.\n");
    } finally {
      clearTimeout(timeout);
    }
  } finally {
    await rm(runtimeRoot, { recursive: true, force: true });
  }
}

main().catch(() => {
  process.stderr.write("Codex SDK smoke failed.\n");
  process.exitCode = 1;
});
