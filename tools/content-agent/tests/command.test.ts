import assert from "node:assert/strict";
import test from "node:test";

import { safeCommandEnvironment } from "../src/command.ts";

test("non-SDK commands inherit no credentials, proxy configuration, or Node injection", () => {
  const environment = safeCommandEnvironment({
    ...process.env,
    OPENAI_API_KEY: "test-secret",
    GITHUB_TOKEN: "test-secret",
    HTTPS_PROXY: "http://proxy.invalid",
    NODE_OPTIONS: "--require=/tmp/evil.cjs",
  });

  assert.equal(environment.OPENAI_API_KEY, undefined);
  assert.equal(environment.GITHUB_TOKEN, undefined);
  assert.equal(environment.HTTPS_PROXY, undefined);
  assert.equal(environment.NODE_OPTIONS, undefined);
  assert.equal(environment.GIT_CONFIG_NOSYSTEM, "1");
  assert.equal(environment.GIT_CONFIG_GLOBAL, "/dev/null");
  assert.equal(environment.GIT_TERMINAL_PROMPT, "0");
});
