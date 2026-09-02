import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

import {
  ELEVATION_ROLES,
  PRESS_FLATTEN_MARKER,
  PRESS_KINDS,
  TRANSITION_CHANNELS,
  elevationClassName,
  hoverGapClassName,
  hoverRevealClassName,
  hoverTitleClassName,
  hoverUnderlineBarClassName,
  pressClassName,
  transitionClassName,
} from "@/components/ui/hover";

/** Vitest runs from the package root, so the token file is a fixed path away. */
const GLOBALS = readFileSync(resolve(process.cwd(), "src/styles/globals.css"), "utf8");

/* ------------------------------------------------------------ transitions */

describe("transitionClassName", () => {
  it("names its properties instead of leaning on the bare `transition` utility", () => {
    for (const channel of TRANSITION_CHANNELS) {
      const className = transitionClassName(channel);
      expect(className, channel).toMatch(/transition-\[[a-z,-]+\]/);
      // A bare `transition` (21 properties) or `transition-colors` (7) would
      // both drag `outline-color` along with them.
      expect(className, channel).not.toMatch(/(^|\s)transition(\s|$)/);
      expect(className, channel).not.toContain("transition-colors");
      expect(className, channel).not.toContain("transition-all");
    }
  });

  it("never animates an outline property — a focus ring is state, not motion", () => {
    // `:focus-visible` paints a 2px outline whose colour starts at
    // `currentcolor`, so any transition list containing `outline-color` fades
    // the ring in from the element's own text colour: white → blue on a red
    // button, black → blue on a card.
    const everyTransition = [
      ...TRANSITION_CHANNELS.map((channel) => transitionClassName(channel)),
      hoverTitleClassName(),
      hoverGapClassName(),
      hoverUnderlineBarClassName(),
      hoverRevealClassName(),
    ];
    for (const className of everyTransition) {
      expect(className).not.toContain("outline");
    }
  });

  it("runs every channel on the one shared tempo", () => {
    for (const channel of TRANSITION_CHANNELS) {
      expect(transitionClassName(channel), channel).toContain("duration-200 ease-out");
    }
    // The two that used to run 100ms behind the card now land with it.
    expect(hoverGapClassName()).toContain("duration-200");
    expect(hoverUnderlineBarClassName()).toContain("duration-200");
    expect(hoverGapClassName()).not.toContain("duration-300");
    expect(hoverUnderlineBarClassName()).not.toContain("duration-300");
  });

  it("passes a caller's own classes through", () => {
    expect(transitionClassName("fill", "extra")).toContain("extra");
  });
});

/* -------------------------------------------------------------- elevation */

describe("elevationClassName", () => {
  it("gives each role a distinct resting offset, so one token cannot mean two things", () => {
    const resting = ELEVATION_ROLES.map((role) => elevationClassName(role));
    expect(new Set(resting).size).toBe(ELEVATION_ROLES.length);
    expect(elevationClassName("chrome")).toBe("shadow-hard-sm");
    expect(elevationClassName("control")).toBe("shadow-hard-md");
    expect(elevationClassName("card")).toBe("shadow-hard-md md:shadow-hard-lg");
  });

  it("keeps a control's hover step below a card's resting height", () => {
    // `shadow-hard-lg` used to be a desktop card AT REST and a button UNDER THE
    // POINTER, so a hovered button sat exactly as high as a resting card.
    const controlHover = elevationClassName("control", { hover: true });
    expect(controlHover).toContain("hover:shadow-hard-md-hover");
    expect(controlHover).not.toContain("shadow-hard-lg");
  });

  it("pairs each card step with the hover partner that keeps its shadow corner pinned", () => {
    const cardHover = elevationClassName("card", { hover: true });
    expect(cardHover).toContain("hover:shadow-hard-md-hover");
    expect(cardHover).toContain("md:hover:shadow-hard-lg-hover");
  });

  it("gives chrome no hover shadow step, because 3px → 4px is invisible", () => {
    expect(elevationClassName("chrome", { hover: true })).toBe("shadow-hard-sm");
  });

  it("emits only shadow tokens, never an arbitrary shadow", () => {
    for (const role of ELEVATION_ROLES) {
      expect(elevationClassName(role, { hover: true }), role).not.toMatch(/shadow-\[/);
    }
  });
});

/* ------------------------------------------------------------------ press */

describe("pressClassName", () => {
  it("scales a shadowed object rather than moving it", () => {
    // There is no hard offset to collapse and nothing for a travel to be the
    // length of, so the object gets smaller under the finger. The step is
    // role-sized: 0.96-0.97 is written for a 44px control and would read as a
    // 400px card recoiling.
    expect(pressClassName("flatten", { elevation: "chrome" })).toContain("active:scale-[0.96]");
    expect(pressClassName("flatten", { elevation: "control" })).toContain("active:scale-[0.97]");
    expect(pressClassName("flatten", { elevation: "card" })).toContain("active:scale-[0.99]");

    for (const role of ELEVATION_ROLES) {
      // Nothing translates, and the elevation drop is the stylesheet's half of
      // the press (`.press-flatten:active`), not a class on the element.
      expect(pressClassName("flatten", { elevation: role }), role).not.toContain(
        "active:translate",
      );
    }
    expect(GLOBALS).toMatch(/^\.press-flatten:active \{$/m);
  });

  it("marks the press for the reduced-motion rule", () => {
    expect(pressClassName("flatten")).toContain(PRESS_FLATTEN_MARKER);
  });

  it("presses in at the token duration, not at the 200-300ms hover band", () => {
    // Deliberate, argued amendment to specs/images/0008-bo-pseo-ui.md — the
    // reasoning is written out in globals.css next to `--motion-press`.
    expect(pressClassName("flatten")).toContain("active:duration-[var(--motion-press)]");
    expect(GLOBALS).toContain("--motion-press: 120ms");
    expect(GLOBALS).toMatch(/do not "correct" it back/i);
  });

  it("refuses to depress a control that cannot act", () => {
    expect(pressClassName("flatten", { elevation: "card" })).toContain(
      "aria-disabled:active:scale-100",
    );
  });

  it("inverts an unshadowed control's fill instead of nudging it", () => {
    // A chip or a radio has no shadow to collapse and a 1px nudge on a 32px
    // pill is invisible; its only surface is its fill, so the press previews
    // the state the tap produces.
    const idle = pressClassName("invert");
    const selected = pressClassName("invert", { selected: true });
    expect(idle).toBe("active:bg-foreground active:text-surface");
    expect(selected).toBe("active:bg-surface active:text-foreground");
    expect(idle).not.toContain("translate");
    expect(selected).not.toContain("translate");
  });

  it("fills the band of a hairline row and forces its chevron on", () => {
    expect(pressClassName("band")).toBe("active:bg-muted");
    expect(pressClassName("band", { surface: "inverse" })).toBe("active:bg-surface/10");
    expect(pressClassName("band")).not.toContain("translate");
    // The other half of the row press lives in the reveal expression.
    expect(hoverRevealClassName()).toContain("group-active:opacity-100");
  });

  it("is inert under prefers-reduced-motion: the shadow still collapses, nothing travels", () => {
    // The document-wide block collapses durations, which makes a colour or a
    // shadow instant — but an instant shrink under the finger is exactly what a
    // reader who asked for less motion asked not to get. So the movement is
    // cancelled by name and the feedback survives.
    const reducedMotionBlock = /@media \(prefers-reduced-motion: reduce\) \{[\s\S]*?\n\}/.exec(
      GLOBALS,
    );
    expect(reducedMotionBlock).not.toBeNull();
    const block = reducedMotionBlock?.[0] ?? "";
    expect(block).toContain(`.${PRESS_FLATTEN_MARKER}:active`);
    expect(block).toMatch(/scale:\s*none\s*!important/);
    expect(block).toMatch(/translate:\s*none\s*!important/);

    // The marker rides on the only press kind that moves…
    expect(pressClassName("flatten")).toContain(PRESS_FLATTEN_MARKER);
    // …and the two that do not move need no counterpart, because they carry no
    // scale and no translate at all.
    for (const kind of PRESS_KINDS) {
      const className = pressClassName(kind);
      if (className.includes("scale") || className.includes("translate")) {
        expect(className, kind).toContain(PRESS_FLATTEN_MARKER);
      }
    }
  });

  it("passes a caller's own classes through", () => {
    expect(pressClassName("invert", { className: "extra" })).toContain("extra");
  });
});

/* --------------------------------------------------------------- globals */

describe("globals.css", () => {
  it("scopes the document hover underline off every control-shaped anchor", () => {
    // `text-decoration-line` is not animatable, so it snapped in while the same
    // element's fill eased over 200ms — on every chip, every tab and every
    // button-shaped `<a>`.
    const rule = /a\[href\]:not\(([\s\S]*?)\):hover/.exec(GLOBALS);
    expect(rule).not.toBeNull();
    const exclusions = rule?.[1] ?? "";
    for (const hook of [
      ".no-underline",
      'border-2"',
      'border-4"',
      'border-s-2"',
      'rounded-pill"',
      '[role="button"]',
      '[role="tab"]',
    ]) {
      expect(exclusions, hook).toContain(hook);
    }
  });

  it("removes the tap delay from the form controls too, without giving them a hand cursor", () => {
    const touch = /input,\n\s*select,\n\s*textarea,\n\s*label \{\n([\s\S]*?)\n\s*\}/.exec(GLOBALS);
    expect(touch).not.toBeNull();
    expect(touch?.[1]).toContain("touch-action: manipulation");
    expect(touch?.[1]).not.toContain("cursor: pointer");
  });

  it("leaves room for the focus ring above the sticky bar instead of matching it exactly", () => {
    // 6rem was the bar's own height, so a focused control landed flush against
    // it with nothing left for the 2px outline and its 2px offset.
    expect(GLOBALS).toMatch(/scroll-padding-bottom:\s*calc\(6rem \+ 0\.75rem \+ env\(/);
  });

  it("keeps the label tracking token as the step both scripts can wear", () => {
    expect(GLOBALS).toContain("--tracking-micro: 0.02em");
    expect(GLOBALS).toContain("--tracking-micro-latin: 0.08em");
  });

  /* ------------------------------------------------------ one system only */

  it("has no theme hook left anywhere in the stylesheet", () => {
    // The Bauhaus comparison theme was removed on 2026-09-03. `data-theme` was
    // the only selector that chose between two sets of values; if one comes
    // back, so has the fork.
    expect(GLOBALS).not.toMatch(/\[data-theme[=\]]/);
    expect(GLOBALS).not.toContain("NEXT_PUBLIC_THEME");
  });

  it("defines every token exactly once", () => {
    // A second definition of a token name means a second system: either a
    // theme block or an override that a reader has to hold in their head.
    // `--rule-hairline` is the one legitimate exception — it is redefined
    // inside a `min-resolution` media query, which is a device fact, not a
    // theme.
    const counts = new Map<string, number>();
    for (const [, name] of GLOBALS.matchAll(/^\s+(--[a-z0-9-]+):/gm)) {
      if (name === undefined) continue;
      counts.set(name, (counts.get(name) ?? 0) + 1);
    }
    const duplicated = [...counts]
      .filter(([name, count]) => count > 1 && name !== "--rule-hairline")
      .map(([name]) => name);
    expect(duplicated).toEqual([]);
    expect(counts.get("--rule-hairline")).toBe(2);
  });

  it("still cancels both press movements under reduced motion", () => {
    const block = /@media \(prefers-reduced-motion: reduce\) \{[\s\S]*?\n\}/.exec(GLOBALS)?.[0] ?? "";
    expect(block).toMatch(/transition-duration:\s*0\.01ms\s*!important/);
    expect(block).toMatch(/animation-duration:\s*0\.01ms\s*!important/);
  });
});
