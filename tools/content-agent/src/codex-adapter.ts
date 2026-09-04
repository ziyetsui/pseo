import { mkdir } from "node:fs/promises";
import { join } from "node:path";

import {
  Codex,
  type CodexOptions,
  type ModelReasoningEffort,
} from "@openai/codex-sdk";

import type { AgentExecutor, AgentTurnRequest, AgentTurnResult } from "./contracts.ts";

export type CodexAdapterOptions = {
  apiKey: string;
  repositoryRoot: string;
  model?: string;
  reasoningEffort?: ModelReasoningEffort;
  codexPathOverride?: string;
};

function safeEnvironment(runtimeRoot: string): Record<string, string> {
  const env: Record<string, string> = {
    CODEX_HOME: join(runtimeRoot, "codex-home"),
    HOME: join(runtimeRoot, "home"),
    LANG: process.env.LANG ?? "C.UTF-8",
    PATH: "/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin",
    TMPDIR: join(runtimeRoot, "tmp"),
    USER: "content-agent",
  };
  return env;
}

export function buildCodexOptions(
  options: Pick<
    CodexAdapterOptions,
    "apiKey" | "codexPathOverride" | "repositoryRoot"
  >,
  runtimeRoot: string,
  workingDirectory: string,
  sandbox: AgentTurnRequest["sandbox"],
): CodexOptions {
  const env = safeEnvironment(runtimeRoot);
  const shellSet = {
    HOME: env.HOME ?? join(runtimeRoot, "home"),
    LANG: env.LANG ?? "C.UTF-8",
    PATH: env.PATH ?? "/usr/bin:/bin",
    TMPDIR: env.TMPDIR ?? join(runtimeRoot, "tmp"),
    USER: env.USER ?? "content-agent",
  };
  const filesystemPermissions = [
    [":root", "deny"],
    ["/", "deny"],
    [options.repositoryRoot, "deny"],
    [workingDirectory, sandbox === "workspace-write" ? "write" : "read"],
    [join(runtimeRoot, "home"), "write"],
    [join(runtimeRoot, "tmp"), "write"],
    [join(runtimeRoot, "codex-home"), "deny"],
    [join(workingDirectory, ".git"), "deny"],
  ]
    .map(([path, access]) => `${JSON.stringify(path)}=${JSON.stringify(access)}`)
    .join(",");
  return {
    apiKey: options.apiKey,
    baseUrl: "https://api.openai.com/v1",
    env,
    config: {
      allow_login_shell: false,
      analytics: { enabled: false },
      default_permissions: "pseo_content_agent",
      model_provider: "openai",
      otel: { exporter: "none", log_user_prompt: false },
      shell_environment_policy: {
        inherit: "none",
        ignore_default_excludes: false,
        set: shellSet,
        filters: {
          HOME: "include",
          LANG: "include",
          PATH: "include",
          TMPDIR: "include",
          USER: "include",
        },
      },
    },
    configOverrides: [
      `permissions.pseo_content_agent.filesystem={${filesystemPermissions}}`,
    ],
    ...(options.codexPathOverride === undefined
      ? {}
      : { codexPathOverride: options.codexPathOverride }),
  };
}

function parseReviewVerdict(value: string): "approve" | "reject" | undefined {
  try {
    const parsed = JSON.parse(value) as { verdict?: unknown };
    return parsed.verdict === "approve" || parsed.verdict === "reject"
      ? parsed.verdict
      : undefined;
  } catch {
    return undefined;
  }
}

export function createCodexAgentExecutor(options: CodexAdapterOptions): AgentExecutor {
  return {
    async runTurn(request: AgentTurnRequest): Promise<AgentTurnResult> {
      await Promise.all([
        mkdir(join(request.runtimeRoot, "codex-home"), { recursive: true, mode: 0o700 }),
        mkdir(join(request.runtimeRoot, "home"), { recursive: true, mode: 0o700 }),
        mkdir(join(request.runtimeRoot, "tmp"), { recursive: true, mode: 0o700 }),
      ]);
      const codexOptions = buildCodexOptions(
        options,
        request.runtimeRoot,
        request.workingDirectory,
        request.sandbox,
      );
      const codex = new Codex(codexOptions);
      const thread = codex.startThread({
        workingDirectory: request.workingDirectory,
        sandboxMode: request.sandbox,
        approvalPolicy: request.approvalPolicy,
        networkAccessEnabled: false,
        webSearchMode: "disabled",
        skipGitRepoCheck: false,
        threadSource: "pseo-content-agent",
        ...(options.model === undefined ? {} : { model: options.model }),
        ...(options.reasoningEffort === undefined
          ? {}
          : { modelReasoningEffort: options.reasoningEffort }),
      });
      const result = await thread.run(request.prompt, {
        signal: request.signal,
        ...(request.outputSchema === undefined
          ? {}
          : { outputSchema: request.outputSchema }),
      });
      const failedItem = result.items.some(
        (item) =>
          item.type === "error" ||
          item.type === "web_search" ||
          item.type === "mcp_tool_call" ||
          (item.type === "command_execution" && item.status === "failed") ||
          (item.type === "file_change" && item.status === "failed"),
      );
      if (failedItem) {
        throw new Error("Codex reported a failed tool or file operation.");
      }
      const threadId = thread.id;
      const reviewVerdict =
        request.sandbox === "read-only"
          ? parseReviewVerdict(result.finalResponse)
          : undefined;
      return {
        ...(threadId === null ? {} : { threadId }),
        finalResponse: result.finalResponse,
        approvalRequested: false,
        ...(reviewVerdict === undefined ? {} : { reviewVerdict }),
      };
    },
  };
}
