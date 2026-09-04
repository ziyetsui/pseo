import { lstat, realpath } from "node:fs/promises";
import { isAbsolute, join, normalize, relative, sep } from "node:path";

import type { ChangedFile, ContentTarget } from "./contracts.ts";

export class GuardViolation extends Error {
  readonly code:
    | "path_outside_allowlist"
    | "unsafe_file_type"
    | "deletion_not_allowed"
    | "secret_detected";

  constructor(code: GuardViolation["code"]) {
    const messages = {
      path_outside_allowlist: "The agent changed a file outside the content allowlist.",
      unsafe_file_type: "The agent created an unsafe file type or symlink.",
      deletion_not_allowed: "Content deletion is not enabled for this runner.",
      secret_detected: "Credential-shaped data was detected.",
    } as const;
    super(messages[code]);
    this.name = "GuardViolation";
    this.code = code;
  }
}

function isCanonicalContentPath(path: string): boolean {
  if (["content/site.json", "content/surfaces.json", "content/redirects.json"].includes(path)) {
    return true;
  }
  return /^content\/(?:prompts|articles)\/[^/]+\/[^/]+\.md$/u.test(path) ||
    /^content\/taxonomies\/[^/]+\/[^/]+\/[^/]+\.json$/u.test(path);
}

function targetMatches(path: string, target: ContentTarget | undefined): boolean {
  if (target?.id === undefined || target.locale === undefined) {
    return false;
  }
  const typeDirectory = target.kind === "prompt" ? "prompts" : "articles";
  const exactPath = `content/${typeDirectory}/${target.id}/${target.locale}.md`;
  return path === exactPath;
}

function normalizeGitPath(path: string): string {
  if (path.includes("\0") || isAbsolute(path) || path.includes("\\")) {
    throw new GuardViolation("path_outside_allowlist");
  }
  const normalized = normalize(path).split(sep).join("/");
  if (
    normalized !== path ||
    normalized === ".." ||
    normalized.startsWith("../") ||
    normalized.includes("/../")
  ) {
    throw new GuardViolation("path_outside_allowlist");
  }
  return normalized;
}

async function assertRegularPath(root: string, gitPath: string): Promise<void> {
  const canonicalRoot = await realpath(root);
  const segments = gitPath.split("/");
  let current = canonicalRoot;
  for (const [index, segment] of segments.entries()) {
    current = join(current, segment);
    let stat;
    try {
      stat = await lstat(current);
    } catch {
      throw new GuardViolation("unsafe_file_type");
    }
    if (stat.isSymbolicLink()) {
      throw new GuardViolation("unsafe_file_type");
    }
    const isLast = index === segments.length - 1;
    if ((isLast && !stat.isFile()) || (!isLast && !stat.isDirectory())) {
      throw new GuardViolation("unsafe_file_type");
    }
  }
  const canonicalFile = await realpath(current);
  const fromRoot = relative(canonicalRoot, canonicalFile);
  if (fromRoot.startsWith("..") || isAbsolute(fromRoot)) {
    throw new GuardViolation("unsafe_file_type");
  }
}

export async function assertAllowedChanges(
  root: string,
  changedFiles: readonly ChangedFile[],
  target?: ContentTarget,
  relationPaths: readonly string[] = [],
): Promise<void> {
  for (const change of changedFiles) {
    const path = normalizeGitPath(change.path);
    if (
      change.ignored === true ||
      !isCanonicalContentPath(path) ||
      (!targetMatches(path, target) && !relationPaths.includes(path))
    ) {
      throw new GuardViolation("path_outside_allowlist");
    }
    if (change.status === "D") {
      throw new GuardViolation("deletion_not_allowed");
    }
    await assertRegularPath(root, path);
  }
}

const SECRET_PATTERNS = [
  /\bsk-(?:proj-)?[A-Za-z0-9_-]{20,}\b/u,
  /\bgh[opusr]_[A-Za-z0-9]{20,}\b/u,
  /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/u,
  /\b(?:OPENAI_API_KEY|ANTHROPIC_API_KEY|GITHUB_TOKEN|PAYLOAD_SECRET)\s*[:=]\s*["']?[A-Za-z0-9_./+-]{16,}/u,
] as const;

export function assertPatchContainsNoSecrets(value: string): void {
  if (SECRET_PATTERNS.some((pattern) => pattern.test(value))) {
    throw new GuardViolation("secret_detected");
  }
}
