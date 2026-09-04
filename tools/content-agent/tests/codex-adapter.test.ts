import assert from "node:assert/strict";
import test from "node:test";

import { buildCodexOptions } from "../src/codex-adapter.ts";

test("filters secrets out of every shell command environment", () => {
  const options = buildCodexOptions(
    {
      apiKey: "test-only-api-key-value",
      repositoryRoot: "/repo/source",
    },
    "/tmp/pseo-content-agent-security-test",
    "/tmp/pseo-content-agent-security-test/worktree",
    "workspace-write",
  );
  const policy = options.config?.shell_environment_policy as {
    inherit?: unknown;
    ignore_default_excludes?: unknown;
    filters?: Record<string, unknown>;
    set?: Record<string, unknown>;
  };

  assert.equal(policy.inherit, "none");
  assert.equal(policy.ignore_default_excludes, false);
  assert.deepEqual(policy.filters, {
    HOME: "include",
    LANG: "include",
    PATH: "include",
    TMPDIR: "include",
    USER: "include",
  });
  assert.equal(policy.set?.CODEX_API_KEY, undefined);
  assert.equal(options.env?.OPENAI_API_KEY, undefined);
  assert.doesNotMatch(options.env?.PATH ?? "", /\/Users\//u);
  assert.equal(options.baseUrl, "https://api.openai.com/v1");
  assert.equal(options.config?.model_provider, "openai");
  assert.equal(options.config?.default_permissions, "pseo_content_agent");
  assert.equal(options.configOverrides?.length, 1);
  const filesystem = options.configOverrides?.[0] ?? "";
  assert.match(filesystem, /"\/"="deny"/u);
  assert.match(filesystem, /"\/repo\/source"="deny"/u);
  assert.match(
    filesystem,
    /"\/tmp\/pseo-content-agent-security-test\/worktree"="write"/u,
  );
  assert.match(
    filesystem,
    /"\/tmp\/pseo-content-agent-security-test\/worktree\/\.git"="deny"/u,
  );
  assert.match(
    filesystem,
    /"\/tmp\/pseo-content-agent-security-test\/codex-home"="deny"/u,
  );
});
