import { spawn } from "node:child_process";
import { tmpdir } from "node:os";

export type CommandResult = {
  stdout: string;
  stderr: string;
  exitCode: number;
  durationMs: number;
};

export class CommandFailure extends Error {
  readonly command: string;
  readonly exitCode: number;

  constructor(command: string, exitCode: number) {
    super(`Command failed: ${command}`);
    this.name = "CommandFailure";
    this.command = command;
    this.exitCode = exitCode;
  }
}

export function safeCommandEnvironment(
  source: NodeJS.ProcessEnv = process.env,
): NodeJS.ProcessEnv {
  return {
    CI: "1",
    GIT_CONFIG_GLOBAL: "/dev/null",
    GIT_CONFIG_NOSYSTEM: "1",
    GIT_OPTIONAL_LOCKS: "0",
    GIT_TERMINAL_PROMPT: "0",
    HOME: "/nonexistent/pseo-content-agent",
    LANG: source.LANG ?? "C.UTF-8",
    LC_ALL: source.LC_ALL ?? source.LANG ?? "C.UTF-8",
    PATH: source.PATH ?? "/usr/bin:/bin",
    TMPDIR: source.TMPDIR ?? tmpdir(),
    USER: "content-agent",
  };
}

export async function runCommand(
  command: string,
  args: readonly string[],
  options: {
    cwd: string;
    timeoutMs?: number;
  },
): Promise<CommandResult> {
  const startedAt = Date.now();
  const controller = new AbortController();
  const timeout =
    options.timeoutMs === undefined
      ? undefined
      : setTimeout(() => controller.abort(), options.timeoutMs);

  try {
    return await new Promise<CommandResult>((resolve, reject) => {
      const child = spawn(command, [...args], {
        cwd: options.cwd,
        env: safeCommandEnvironment(),
        shell: false,
        stdio: ["ignore", "pipe", "pipe"],
        signal: controller.signal,
      });
      const stdout: Buffer[] = [];
      const stderr: Buffer[] = [];
      child.stdout.on("data", (chunk: Buffer) => stdout.push(chunk));
      child.stderr.on("data", (chunk: Buffer) => stderr.push(chunk));
      child.once("error", reject);
      child.once("close", (code) => {
        const result: CommandResult = {
          stdout: Buffer.concat(stdout).toString("utf8"),
          stderr: Buffer.concat(stderr).toString("utf8"),
          exitCode: code ?? 1,
          durationMs: Date.now() - startedAt,
        };
        if (result.exitCode === 0) {
          resolve(result);
        } else {
          reject(new CommandFailure([command, ...args].join(" "), result.exitCode));
        }
      });
    });
  } finally {
    if (timeout !== undefined) {
      clearTimeout(timeout);
    }
  }
}
