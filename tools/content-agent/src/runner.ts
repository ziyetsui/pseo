import type {
  RetiredRunResult,
  RunRequest,
  RunnerDependencies,
} from './contracts.ts'

export const RETIRED_CONTENT_AGENT_MESSAGE =
  'The Markdown/Git content runner is retired. A versioned CMS proposal adapter is required before Agent-assisted authoring can be enabled.'

/**
 * Fail-closed compatibility entry point.
 *
 * The former implementation could create Git worktrees and emit a content
 * patch. CMS is now canonical, so this function deliberately performs no
 * dependency access, filesystem operation, SDK turn, validation, or artifact
 * write. The parameters remain temporarily so old callers receive a safe,
 * structured failure instead of finding a hidden authoring fallback.
 */
export async function runContentAgent(
  request: RunRequest,
  dependencies: RunnerDependencies,
): Promise<RetiredRunResult> {
  void request
  void dependencies
  return {
    status: 'failed',
    runId: 'retired-content-agent',
    baseSha: '',
    changedFiles: [],
    validation: [],
    worktreeCleaned: true,
    failure: {
      code: 'retired_workflow',
      message: RETIRED_CONTENT_AGENT_MESSAGE,
    },
  }
}
