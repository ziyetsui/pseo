import { describe, expect, it } from "vitest";

import { MISSING_VALUE, formatCompactCount, formatThousands } from "@/lib/format/numbers";

describe("formatThousands", () => {
  it.each([
    [0, "0"],
    [7, "7"],
    [999, "999"],
    [1000, "1,000"],
    [2512, "2,512"],
    [6127, "6,127"],
    [19743, "19,743"],
    [1234567, "1,234,567"],
  ])("groups %s as %s", (input, expected) => {
    expect(formatThousands(input)).toBe(expected);
  });

  it("renders a missing metric as an em dash, never as 0", () => {
    expect(formatThousands(null)).toBe(MISSING_VALUE);
    expect(formatThousands(null)).not.toBe("0");
  });

  it("ignores a non-finite value rather than printing NaN", () => {
    expect(formatThousands(Number.NaN)).toBe(MISSING_VALUE);
    expect(formatThousands(Number.POSITIVE_INFINITY)).toBe(MISSING_VALUE);
  });
});

describe("formatCompactCount", () => {
  it.each([
    [0, "0"],
    [128, "128"],
    [999, "999"],
    [1000, "1K"],
    [1049, "1K"],
    [2449, "2.4K"],
    [3849, "3.8K"],
    [12000, "12K"],
    [12533, "12.5K"],
    // Rounds up into the next unit rather than printing `1000K`.
    [999_950, "1M"],
    [1_500_000, "1.5M"],
    [2_000_000_000, "2B"],
  ])("abbreviates %s as %s", (input, expected) => {
    expect(formatCompactCount(input)).toBe(expected);
  });

  it("renders a missing metric as an em dash, never as 0", () => {
    expect(formatCompactCount(null)).toBe(MISSING_VALUE);
    expect(formatCompactCount(null)).not.toBe("0");
  });

  it("never keeps a trailing .0", () => {
    expect(formatCompactCount(12_000)).not.toContain(".0");
    expect(formatCompactCount(5_000_000)).not.toContain(".0");
  });
});
