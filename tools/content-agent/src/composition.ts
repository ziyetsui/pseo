import type { ModelReasoningEffort } from "@openai/codex-sdk";

import { createArtifactWriter } from "./artifacts.ts";
import { createGitChangeInspector } from "./changes.ts";
import { createCodexAgentExecutor } from "./codex-adapter.ts";
import type { RunnerDependencies } from "./contracts.ts";
import {
  assertAllowedChanges,
  assertPatchContainsNoSecrets,
} from "./guards.ts";
import { createValidationService } from "./validator.ts";
import { createGitWorktreeManager } from "./worktree.ts";

const REASONING_EFFORTS = new Set<ModelReasoningEffort>([
  "minimal",
  "low",
  "medium",
  "high",
  "xhigh",
  "max",
  "ultra",
  "persistent",
]);

function optionalReasoningEffort(value: string | undefined): ModelReasoningEffort | undefined {
  return value !== undefined && REASONING_EFFORTS.has(value as ModelReasoningEffort)
    ? (value as ModelReasoningEffort)
    : undefined;
}

export function createRunnerDependencies(
  environment: NodeJS.ProcessEnv,
  repositoryRoot: string,
): RunnerDependencies {
  const apiKey = environment.OPENAI_API_KEY;
  if (apiKey === undefined || apiKey.length === 0) {
    throw new Error("OPENAI_API_KEY is required.");
  }
  const model = environment.PSEO_CODEX_MODEL;
  const reasoningEffort = optionalReasoningEffort(environment.PSEO_CODEX_REASONING);
  const codexPathOverride = environment.PSEO_CODEX_PATH;
  return {
    worktrees: createGitWorktreeManager(repositoryRoot),
    agent: createCodexAgentExecutor({
      apiKey,
      repositoryRoot,
      ...(model === undefined ? {} : { model }),
      ...(reasoningEffort === undefined ? {} : { reasoningEffort }),
      ...(codexPathOverride === undefined ? {} : { codexPathOverride }),
    }),
    changes: createGitChangeInspector(),
    guards: {
      assert: async (root, inspection, request) => {
        await assertAllowedChanges(
          root,
          inspection.changedFiles,
          request.target,
          request.relationPaths,
        );
        assertPatchContainsNoSecrets(inspection.patch);
      },
    },
    validator: createValidationService(),
    artifacts: createArtifactWriter(),
    now: () => Date.now(),
  };
}
