import { TAXONOMY_ACCENT } from "@/components/ui/accent";
import { describe, expect, it } from "vitest";

import {
  HUB_SECTION_ACCENTS,
  SECTION_ACCENT_ORDER,
  accentFillClassName,
  sectionAccentAt,
} from "@/features/hub/section-accent";

/** The only background utilities the token file can produce. */
const EXISTING_TOKENS = new Set([
  "bg-accent-red",
  "bg-accent-blue",
  "bg-accent-yellow",
  "bg-foreground",
]);

describe("section-accent", () => {
  it("returns only utilities that exist in the token file", () => {
    for (const accent of SECTION_ACCENT_ORDER) {
      expect(EXISTING_TOKENS.has(accentFillClassName(accent))).toBe(true);
    }
  });

  it("gives each of the three hub browse bands its own accent", () => {
    // Three, not six: 按任务浏览 / 镜头与运动 / 按风格浏览 were byte-identical
    // to the chip rows above them and have been deleted, and an accent for a
    // band that no longer renders is a value nothing can be checked against.
    const accents = Object.values(HUB_SECTION_ACCENTS);
    expect(Object.keys(HUB_SECTION_ACCENTS)).toEqual(["models", "collections", "creators"]);
    // Neighbouring bands never repeat — the point is rhythm while scrolling.
    for (let index = 1; index < accents.length; index += 1) {
      expect(accents[index]).not.toBe(accents[index - 1]);
    }
    expect(new Set(accents).size).toBe(3);
  });

  it("colours the one surviving taxonomy band exactly like that axis's chip row", () => {
    // What has to hold is agreement: 模型 chips and the 按模型浏览 band sit on
    // one page, so a reader must not meet the same axis in two colours. The
    // axis map is the single source for both. The other three axes are now
    // chips only, and read the same map through `axisAccentClassName`.
    expect(HUB_SECTION_ACCENTS.models).toBe(TAXONOMY_ACCENT.model);
  });

  it("rotates by position for bands that have no fixed slot", () => {
    expect(sectionAccentAt(0)).toBe(SECTION_ACCENT_ORDER[0]);
    expect(sectionAccentAt(SECTION_ACCENT_ORDER.length)).toBe(SECTION_ACCENT_ORDER[0]);
    expect(sectionAccentAt(5)).toBe(SECTION_ACCENT_ORDER[1]);
  });
});
