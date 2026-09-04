import { describe, expect, it } from "vitest";
import { GATE, promptWords, verdict } from "@/lib/cta/sign-in-gate";

const armed = (input: Parameters<typeof verdict>[0]) => verdict(input) === "open";
const base = { engaged: true, busy: false, hidden: false, passed: 20, total: 35, secondsOnSurface: 60, shown: false, quietUntil: 0, now: 1_000_000 };

describe("sign-in gate policy", () => {
  it("arms once the reader is deep enough and has been there long enough", () => {
    expect(armed(base)).toBe(true);
  });

  /* The rule the whole design rests on: someone who lands on the hub and
     flicks to the footer must not be handed a dialog. Depth alone is reached
     in seconds; the time floor is what stops it. */
  it("stays quiet for a fast scroller who reached the depth immediately", () => {
    expect(armed({ ...base, secondsOnSurface: GATE.minSeconds - 1 })).toBe(false);
  });

  /* …but it answers "wait", not "no", so the caller comes back. A reader who
     scrolled fast and then settled in stops producing scroll events, and a
     two-state answer would drop them for the rest of the visit. */
  it("distinguishes too-soon from not-deep-enough", () => {
    expect(verdict({ ...base, secondsOnSurface: GATE.minSeconds - 1 })).toBe("wait");
    expect(verdict({ ...base, passed: 2 })).toBe("no");
    expect(verdict(base)).toBe("open");
  });

  it("stays quiet above the depth", () => {
    expect(armed({ ...base, passed: 10 })).toBe(false);
  });

  it("fires at most once per session", () => {
    expect(armed({ ...base, shown: true })).toBe(false);
  });

  it("respects a dismissal until the quiet period has passed", () => {
    expect(armed({ ...base, quietUntil: base.now + 1 })).toBe(false);
    expect(armed({ ...base, quietUntil: base.now - 1 })).toBe(true);
  });

  it("allows an engaged reader on a short detail surface", () => {
    expect(armed({ ...base, passed: .5, total: 1 })).toBe(true);
  });

  it("never interrupts a fresh visit, editing, selection or a hidden page", () => {
    expect(armed({ ...base, engaged: false })).toBe(false);
    expect(armed({ ...base, busy: true })).toBe(false);
    expect(armed({ ...base, hidden: true })).toBe(false);
    expect(armed({ ...base, total: 0 })).toBe(false);
  });

  it("counts words by whitespace, not by an estimate", () => {
    expect(promptWords("a cinematic  shot\nof a cat")).toBe(6);
    expect(promptWords("   ")).toBe(0);
  });
});
