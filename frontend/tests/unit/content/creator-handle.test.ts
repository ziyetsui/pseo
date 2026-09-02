import { describe, expect, it } from "vitest";

import { formatCreatorHandle } from "@/lib/content";

describe("formatCreatorHandle", () => {
  it.each([
    ["azed_ai", "@azed_ai"],
    ["@azed_ai", "@azed_ai"],
    ["@@azed_ai", "@azed_ai"],
    ["  @azed_ai  ", "@azed_ai"],
  ])("normalizes %j to exactly one leading @", (input, expected) => {
    expect(formatCreatorHandle(input)).toBe(expected);
  });
});
