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

  it("gives each of the six hub browse bands an accent, rotating through the four", () => {
    const accents = Object.values(HUB_SECTION_ACCENTS);
    expect(accents).toHaveLength(6);
    // Neighbouring bands never repeat — the point is rhythm while scrolling.
    for (let index = 1; index < accents.length; index += 1) {
      expect(accents[index]).not.toBe(accents[index - 1]);
    }
    expect(new Set(accents).size).toBe(4);
  });

  it("colours a taxonomy band exactly like that axis's chip row", () => {
    // The teardown plate drew red/blue/yellow to show the *idea* of per-band
    // accents. What actually has to hold is agreement: 任务 chips and the
    // 按任务浏览 band sit on one page, so a reader must not meet the same axis
    // in two colours. The axis map is the single source for both.
    expect(HUB_SECTION_ACCENTS.tasks).toBe(TAXONOMY_ACCENT.useCase);
    expect(HUB_SECTION_ACCENTS.camera).toBe(TAXONOMY_ACCENT.technique);
    expect(HUB_SECTION_ACCENTS.models).toBe(TAXONOMY_ACCENT.model);
    expect(HUB_SECTION_ACCENTS.styles).toBe(TAXONOMY_ACCENT.style);
  });

  it("rotates by position for bands that have no fixed slot", () => {
    expect(sectionAccentAt(0)).toBe(SECTION_ACCENT_ORDER[0]);
    expect(sectionAccentAt(SECTION_ACCENT_ORDER.length)).toBe(SECTION_ACCENT_ORDER[0]);
    expect(sectionAccentAt(5)).toBe(SECTION_ACCENT_ORDER[1]);
  });
});
