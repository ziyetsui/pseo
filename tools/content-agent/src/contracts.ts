export type ContentIntent = "create" | "edit" | "route" | "validate" | "pr-ready";

export type ContentTarget = {
  kind: "prompt" | "article";
  id?: string;
  locale?: string;
};

export type RunRequest = {
  repoRoot: string;
  baseRef: string;
  intent: ContentIntent;
  brief: string;
  target?: ContentTarget;
  relationPaths: readonly string[];
  timeoutMs: number;
};

export type ChangedFile = {
  path: string;
  status: "?" | "A" | "M" | "D";
  ignored?: boolean;
};

export type ChangeInspection = {
  changedFiles: ChangedFile[];
  patch: string;
  digest: string;
};

export type ValidationRecord = {
  command: string;
  exitCode: number;
  durationMs: number;
};

export type AgentTurnRequest = {
  workingDirectory: string;
  runtimeRoot: string;
  prompt: string;
  sandbox: "workspace-write" | "read-only";
  approvalPolicy: "never";
  timeoutMs: number;
  signal: AbortSignal;
  outputSchema?: unknown;
};

export type AgentTurnResult = {
  threadId?: string;
  finalResponse: string;
  approvalRequested: boolean;
  reviewVerdict?: "approve" | "reject";
};

export interface AgentExecutor {
  runTurn(request: AgentTurnRequest): Promise<AgentTurnResult>;
}

export type WorktreeSession = {
  runId: string;
  root: string;
  runtimeRoot: string;
  artifactRoot: string;
  baseSha: string;
  applyPatch(patch: string): Promise<void>;
  cleanup(): Promise<void>;
};

export interface WorktreeManager {
  create(repoRoot: string, baseRef: string): Promise<WorktreeSession>;
}

export interface ChangeInspector {
  inspect(root: string, baseSha: string): Promise<ChangeInspection>;
}

export interface GuardService {
  assert(
    root: string,
    inspection: ChangeInspection,
    request: RunRequest,
  ): Promise<void>;
}

export interface ValidationService {
  run(root: string, artifactRoot: string): Promise<ValidationRecord[]>;
}

export type AuditFailure = {
  code: FailureCode;
};

export type AuditRecord = {
  schemaVersion: 1;
  runId: string;
  status: "pr_ready" | "failed";
  intent: ContentIntent;
  target?: ContentTarget;
  relationPaths: readonly string[];
  briefDigest: string;
  baseSha: string;
  startedAtMs: number;
  finishedAtMs: number;
  durationMs: number;
  sandboxes: readonly ["workspace-write" | "read-only", "read-only"];
  approvalPolicy: "never";
  threadIds: string[];
  changedFiles: ChangedFile[];
  patchDigest?: string;
  validation: ValidationRecord[];
  worktreeCleaned: boolean;
  failure?: AuditFailure;
};

export interface ArtifactWriter {
  write(
    record: AuditRecord,
    patch: string | undefined,
    artifactRoot: string,
  ): Promise<{ auditPath: string; patchPath?: string }>;
}

export type RunnerDependencies = {
  worktrees: WorktreeManager;
  agent: AgentExecutor;
  changes: ChangeInspector;
  guards: GuardService;
  validator: ValidationService;
  artifacts: ArtifactWriter;
  now(): number;
};

export type FailureCode =
  | "retired_workflow"
  | "invalid_request"
  | "secret_detected"
  | "worktree_failed"
  | "sdk_failed"
  | "timeout"
  | "approval_required"
  | "no_changes"
  | "unexpected_changes"
  | "path_outside_allowlist"
  | "unsafe_file_type"
  | "deletion_not_allowed"
  | "validation_failed"
  | "review_rejected"
  | "review_modified_diff"
  | "cleanup_failed"
  | "artifact_failed";

type SharedRunResult = {
  runId: string;
  baseSha: string;
  changedFiles: ChangedFile[];
  validation: ValidationRecord[];
  auditPath?: string;
  worktreeCleaned: boolean;
};

export type PrReadyResult = SharedRunResult & {
  status: "pr_ready";
  patchPath: string;
};

export type FailedResult = SharedRunResult & {
  status: "failed";
  failure: {
    code: FailureCode;
    message: string;
  };
};

export type RetiredRunResult = SharedRunResult & {
  status: "failed";
  failure: {
    code: "retired_workflow";
    message: string;
  };
};

/** @deprecated Historical research contract; the active runner returns only RetiredRunResult. */
export type RunResult = PrReadyResult | FailedResult;
