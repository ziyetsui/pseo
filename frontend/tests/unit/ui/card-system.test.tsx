import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { ActionRow } from "@/components/ui/ActionRow";
import { CardLink, cardClassName } from "@/components/ui/Card";
import { CardMedia } from "@/components/ui/CardMedia";
import { Chevron } from "@/components/ui/Chevron";
import { GhostNumeral } from "@/components/ui/GhostNumeral";
import { GrowingUnderline } from "@/components/ui/GrowingUnderline";
import { HairlineList, HairlineRow } from "@/components/ui/HairlineList";
import { Section } from "@/components/ui/Section";
import { Avatar, IdentityMark, monogramFrom } from "@/components/ui/IdentityMark";
import { SpineCard } from "@/components/ui/SpineCard";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { dividerClassName } from "@/components/ui/dividers";
import {
  controlLabelClassName,
  displayTitleClassName,
  figureClassName,
  microLabelClassName,
  pageTitleClassName,
  recordTitleClassName,
  sectionTitleClassName,
  singleLineTitleClassName,
} from "@/components/ui/type-scale";

/* ------------------------------------------------------------ 第二步: tiers */

/** Every rung of the ladder, largest first. */
const LADDER = [
  { name: "page", className: pageTitleClassName(), mobile: "text-4xl", desktop: "md:text-6xl" },
  { name: "record", className: recordTitleClassName(), mobile: "text-3xl", desktop: "md:text-5xl" },
  { name: "display", className: displayTitleClassName(), mobile: "text-2xl", desktop: "md:text-4xl" },
  { name: "section", className: sectionTitleClassName(), mobile: "text-xl", desktop: "md:text-2xl" },
  { name: "single", className: singleLineTitleClassName(), mobile: "text-base", desktop: undefined },
  { name: "control", className: controlLabelClassName(), mobile: "text-sm", desktop: undefined },
  { name: "micro", className: microLabelClassName(), mobile: "text-xs", desktop: undefined },
] as const;

describe("title tiers", () => {
  it("is one ladder: every rung a distinct size, no two rungs alike", () => {
    for (const rung of LADDER) {
      expect(rung.className, rung.name).toContain(rung.mobile);
      if (rung.desktop !== undefined) expect(rung.className, rung.name).toContain(rung.desktop);
    }
    expect(new Set(LADDER.map((rung) => rung.mobile)).size).toBe(LADDER.length);
    expect(new Set(LADDER.map((rung) => rung.className)).size).toBe(LADDER.length);
  });

  it("puts the card poster a full step above the band heading it sits under", () => {
    // They used to be size-identical at both breakpoints, which is the one
    // comparison the poster tier exists to win.
    const display = displayTitleClassName();
    const section = sectionTitleClassName();
    expect(display).not.toBe(section);
    expect(display).toContain("text-2xl");
    expect(section).toContain("text-xl");
    expect(display).toContain("md:text-4xl");
    expect(section).toContain("md:text-2xl");
  });

  it("clamps the display tier to two lines so a poster title cannot grow the card", () => {
    expect(displayTitleClassName()).toContain("line-clamp-2");
    expect(displayTitleClassName()).toContain("font-black");
    // `leading-none` clipped a Latin descender on the last clamped line; the
    // one place it survives is the figure tier, which is digits only.
    expect(displayTitleClassName()).toContain("leading-tight");
    expect(displayTitleClassName()).not.toContain("leading-none");
    expect(figureClassName()).toContain("leading-none");
    expect(figureClassName()).not.toMatch(/line-clamp/);
    expect(figureClassName()).toContain("tabular-nums");
  });

  it("always truncates the single-line tier, at a size the body copy does not share", () => {
    // The whole point of the tier: a long title can never wrap and make this
    // card taller than its neighbours. And it is 16px, not the 14px it shares
    // with the body copy and the monospace prompt directly beneath it — the
    // weight step that used to separate them does not render on CJK.
    expect(singleLineTitleClassName()).toContain("truncate");
    expect(singleLineTitleClassName()).toContain("text-base");
    expect(singleLineTitleClassName("extra")).toContain("extra");
  });

  it("names the fourth tier so the control label stops being hand-typed", () => {
    expect(controlLabelClassName()).toContain("text-sm");
    expect(controlLabelClassName()).toContain("uppercase");
    expect(controlLabelClassName()).toContain("tracking-micro");
    expect(controlLabelClassName("extra")).toContain("extra");
  });

  it("opens both label tiers with the tracking token rather than a literal em value", () => {
    expect(microLabelClassName()).toContain("tracking-micro");
    expect(microLabelClassName()).toContain("uppercase");
    expect(microLabelClassName()).not.toMatch(/tracking-\[/);
    expect(controlLabelClassName()).not.toMatch(/tracking-\[/);
  });

  it("keeps the wide Latin tracking off CJK runs and behind an explicit opt-in", () => {
    // 0.16em is what turns 11-12px Latin caps into a label; on 中文标签 it reads
    // as 疏排 and costs ~16% of the run's width. So the default is the step both
    // scripts wear, and the wide one is asked for by script, never by number.
    expect(microLabelClassName(undefined, { script: "cjk" })).toContain("tracking-micro");
    expect(microLabelClassName(undefined, { script: "cjk" })).not.toContain("tracking-micro-latin");
    expect(microLabelClassName(undefined, { script: "latin" })).toContain("tracking-micro-latin");
    expect(controlLabelClassName(undefined, { script: "latin" })).toContain("tracking-micro-latin");
  });

  it("does not rest the hierarchy on a weight step CJK cannot render", () => {
    // PingFang caps at Semibold, so 700 and 900 are the same face. The micro
    // tier therefore stops asking for 900 (it bought nothing and implied a step
    // that does not exist) and every rung is separated by SIZE first.
    expect(microLabelClassName()).toContain("font-bold");
    expect(microLabelClassName()).not.toContain("font-black");
    const weights = LADDER.map((rung) => /font-(black|bold|medium)/.exec(rung.className)?.[1]);
    expect(new Set(weights).size).toBeLessThan(LADDER.length);
  });

  it("uses the CJK-safe display tracking by default and the tighter one only for Latin", () => {
    expect(displayTitleClassName()).toContain("tracking-tight");
    expect(displayTitleClassName()).not.toContain("tracking-tighter");
    expect(displayTitleClassName(undefined, { script: "latin" })).toContain("tracking-tighter");
    expect(pageTitleClassName()).toContain("tracking-tight");
    expect(recordTitleClassName()).toContain("tracking-tight");
  });
});

describe("divider tiers", () => {
  it("draws the three tiers at three distinct strengths, heaviest inside a card", () => {
    const card = dividerClassName("card", "bottom");
    const column = dividerClassName("column", "left");
    const row = dividerClassName("row", "bottom");

    expect(card).toContain("border-foreground");
    expect(card).not.toContain("/");
    expect(column).toContain("border-foreground/70");
    expect(row).toContain("border-foreground/15");
    expect(new Set([card, column, row]).size).toBe(3);
  });

  it("puts the border on the side it was asked for and never invents a width", () => {
    expect(dividerClassName("row", "top")).toContain("border-t-2");
    expect(dividerClassName("row", "right")).toContain("border-r-2");
    expect(dividerClassName("row", "left")).toContain("border-l-2");
    expect(dividerClassName("row", "bottom")).not.toContain("md:border-b-4");
  });

  it("gives the card tier the desktop step by default, so a caller cannot forget it", () => {
    // A card frame is 2px mobile / 4px desktop; a 2px rule inside a 4px box is
    // the mistake this file's own header warns about, and it shipped at three
    // call sites because the option was opt-in.
    expect(dividerClassName("card", "bottom")).toContain("md:border-b-4");
    expect(dividerClassName("card", "top")).toContain("md:border-t-4");
    expect(dividerClassName("card", "bottom", { desktopThick: false })).not.toContain(
      "md:border-b-4",
    );
  });

  it("refuses to thicken a tier that has no 4px frame to match", () => {
    expect(dividerClassName("row", "bottom", { desktopThick: true })).not.toContain(
      "md:border-b-4",
    );
    expect(dividerClassName("column", "left", { desktopThick: true })).not.toContain(
      "md:border-l-4",
    );
  });

  it("draws the same tier in the surface's own ink, without an override", () => {
    // A tier is a STRENGTH, not a colour. On the footer's black, 15% of
    // `foreground` is black on black — no rule at all — so the surface picks
    // the ink and nothing downstream has to force it with `!`.
    const inverse = dividerClassName("row", "bottom", { surface: "inverse" });
    expect(inverse).toContain("border-surface/15");
    expect(inverse).not.toContain("border-foreground");
    expect(inverse).not.toContain("!");
    expect(dividerClassName("column", "left", { surface: "inverse" })).toContain(
      "border-surface/70",
    );
  });

  it("scopes a rule to a breakpoint by prefixing the width alone", () => {
    // Tailwind's preflight zeroes every border, so a width that only exists
    // from `lg` is a rule that only exists from `lg`; the colour needs no
    // prefix because a 0-width border paints nothing.
    const scoped = dividerClassName("column", "left", { surface: "inverse", from: "lg" });
    expect(scoped).toContain("lg:border-l-2");
    expect(scoped).not.toMatch(/(^|\s)border-l-2/);
    expect(scoped).toContain("border-surface/70");
  });

  it("can express a four-sided frame, so a card compartment is not hand-drawn", () => {
    expect(dividerClassName("card", "all")).toBe("border-2 md:border-4 border-foreground");
    expect(dividerClassName("card", "all", { desktopThick: false })).toBe(
      "border-2 border-foreground",
    );
  });
});

/* ---------------------------------------------------------- 第一步: chassis */

describe("cardClassName", () => {
  it("carries the group hook every hover expression hangs off", () => {
    expect(cardClassName()).toContain("group");
  });

  it("only drops the document underline for the interactive variant", () => {
    expect(cardClassName()).not.toContain("no-underline");
    expect(cardClassName(undefined, { interactive: true })).toContain("no-underline");
  });

  it("keeps every interactive expression behind the interactive flag", () => {
    // A card that does nothing when it is clicked must not answer a pointer as
    // though it did: `PromptCard` and `ArticleCard` are plain `<article>`s
    // whose real destinations sit inside them.
    const inert = cardClassName();
    expect(inert).not.toContain("hover:shadow");
    expect(inert).not.toContain("active:");
    expect(inert).not.toContain("press-flatten");

    const live = cardClassName(undefined, { interactive: true });
    expect(live).toContain("hover:shadow-hard-md-hover");
    expect(live).toContain("md:hover:shadow-hard-lg-hover");
    expect(live).toContain("press-flatten");
  });

  it("rests at the card elevation whether or not it is interactive", () => {
    for (const className of [cardClassName(), cardClassName(undefined, { interactive: true })]) {
      expect(className).toContain("shadow-hard-md");
      expect(className).toContain("md:shadow-hard-lg");
    }
  });
});

describe("CardLink", () => {
  it("is one link wearing the card shell", () => {
    render(<CardLink href="/zh-CN/prompts">合集</CardLink>);
    const link = screen.getByRole("link", { name: "合集" });
    expect(link).toHaveAttribute("href", "/zh-CN/prompts");
    expect(link.className).toContain("border-foreground");
    expect(link.className).toContain("no-underline");
  });
});

describe("CardMedia", () => {
  it("closes the media compartment with the heavy card-internal rule", () => {
    const { container } = render(
      <CardMedia src="https://example.invalid/a.jpg" alt="示例" width={16} height={9} />,
    );
    const frame = container.firstElementChild;
    expect(frame?.className).toContain("border-b-2");
    expect(frame?.className).toContain("border-foreground");
    expect(frame?.className).toContain("md:border-b-4");
  });
});

/* ------------------------------------------------------------- 身份 / 标记 */

describe("monogramFrom", () => {
  it("takes initials from the first two words", () => {
    expect(monogramFrom("Nano Banana Pro")).toBe("NB");
    expect(monogramFrom("seedance 2.5")).toBe("S2");
  });

  it("takes two letters from a single word", () => {
    expect(monogramFrom("Kling")).toBe("KL");
  });

  it("ignores punctuation so a handle does not produce a symbol", () => {
    // `@` and `_` are separators, not letters: the handle reads as two words.
    expect(monogramFrom("@some_handle")).toBe("SH");
    expect(monogramFrom("@ziye")).toBe("ZI");
  });

  it("keeps CJK characters as characters rather than faking initials", () => {
    expect(monogramFrom("视觉中国")).toBe("视觉");
  });

  it("never returns an empty mark", () => {
    expect(monogramFrom("")).toBe("?");
    expect(monogramFrom("—")).toBe("?");
  });
});

describe("IdentityMark", () => {
  it("renders the monogram as decoration next to the name already in text", () => {
    const { container } = render(<IdentityMark name="Nano Banana Pro" />);
    const mark = container.firstElementChild;
    expect(mark).toHaveTextContent("NB");
    expect(mark).toHaveAttribute("aria-hidden", "true");
    expect(mark?.className).toContain("size-14");
    expect(mark?.className).toContain("border-2");
  });

  it("becomes an image with a name only when it is asked to stand alone", () => {
    render(<IdentityMark name="Kling" label="Kling" />);
    expect(screen.getByRole("img", { name: "Kling" })).toHaveTextContent("KL");
  });
});

describe("Avatar", () => {
  it("falls back to the first character when there is no image", () => {
    const { container } = render(<Avatar name="ziye" />);
    expect(container.firstElementChild).toHaveTextContent("Z");
    expect(container.querySelector("img")).toBeNull();
  });

  it("treats an empty src as no image rather than rendering a broken picture", () => {
    const { container } = render(<Avatar name="ziye" src="" />);
    expect(container.querySelector("img")).toBeNull();
  });

  it("renders the 28px round picture when one is available", () => {
    const { container } = render(<Avatar name="ziye" src="https://example.invalid/a.jpg" />);
    const image = container.querySelector("img");
    expect(image).toHaveAttribute("src", "https://example.invalid/a.jpg");
    expect(image).toHaveAttribute("width", "28");
    expect(container.firstElementChild?.className).toContain("rounded-pill");
    expect(container.firstElementChild?.className).toContain("size-7");
  });

  it("has a second, larger stop for a list that leads with the face", () => {
    const { container } = render(
      <Avatar name="ziye" src="https://example.invalid/a.jpg" size="md" />,
    );
    const image = container.querySelector("img");
    // The intrinsic size follows the stop, so the box is reserved and the
    // picture never shifts the row it sits in.
    expect(image).toHaveAttribute("width", "40");
    expect(image).toHaveAttribute("height", "40");
    expect(container.firstElementChild?.className).toContain("size-10");
    expect(container.firstElementChild?.className).toContain("rounded-pill");
  });
});

describe("StatusBadge", () => {
  it("says the status in words, not in yellow alone", () => {
    render(<StatusBadge>热门</StatusBadge>);
    expect(screen.getByText("热门")).toBeInTheDocument();
  });

  it("keeps its pill skin and can be pinned to a card corner", () => {
    const { container } = render(<StatusBadge corner="top-right">新</StatusBadge>);
    const badge = container.firstElementChild;
    expect(badge?.className).toContain("rounded-pill");
    expect(badge?.className).toContain("bg-accent-yellow");
    expect(badge?.className).toContain("absolute");
    expect(badge?.className).toContain("right-2");
  });

  it("stays inline when no corner is asked for", () => {
    const { container } = render(<StatusBadge>热门</StatusBadge>);
    expect(container.firstElementChild?.className).not.toContain("absolute");
  });
});

describe("Chevron", () => {
  it("is two borders rotated 45°, never an icon font or an emoji", () => {
    const { container } = render(<Chevron />);
    const chevron = container.firstElementChild;
    expect(chevron?.className).toContain("border-t-2");
    expect(chevron?.className).toContain("border-r-2");
    expect(chevron?.className).toContain("rotate-45");
    expect(chevron).toHaveAttribute("aria-hidden", "true");
    expect(chevron?.textContent).toBe("");
  });

  it("points other ways by rotation alone", () => {
    const { container } = render(<Chevron direction="down" />);
    expect(container.firstElementChild?.className).toContain("rotate-135");
  });
});

describe("ActionRow", () => {
  it("grows only the gap on hover, and answers the card's hover as well as its own", () => {
    const { container } = render(<ActionRow label="查看提示词" />);
    const row = container.firstElementChild;
    expect(row).toHaveTextContent("查看提示词");
    expect(row?.className).toContain("gap-1");
    expect(row?.className).toContain("group-hover:gap-2");
    expect(row?.className).toContain("hover:gap-2");
    expect(row?.className).toContain("transition-[gap]");
    // Only the gap moves: nothing here translates or resizes the row.
    expect(row?.className).not.toContain("translate");
  });

  it("is not itself a control — the card around it owns the link", () => {
    render(<ActionRow label="查看提示词" />);
    expect(screen.queryByRole("link")).not.toBeInTheDocument();
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });

  it("can draw the card-tier rule above itself", () => {
    const { container } = render(<ActionRow label="详情" divider />);
    expect(container.firstElementChild?.className).toContain("border-t-2");
  });

  it("only claims the column's free space when asked to", () => {
    // Two `mt-auto` siblings SPLIT the free space instead of pushing one block
    // to the floor, and a browse tile's proportion bar already claims it — so
    // the push is opt-in rather than something every caller has to undo.
    const { container } = render(<ActionRow label="详情" />);
    expect(container.firstElementChild?.className).not.toContain("mt-auto");

    const pushed = render(<ActionRow label="详情" pushToBottom />);
    expect(pushed.container.firstElementChild?.className).toContain("mt-auto");
  });
});

describe("GrowingUnderline", () => {
  it("grows a 2px bar from zero width on hover and focus", () => {
    const { container } = render(<GrowingUnderline>分类链接</GrowingUnderline>);
    const bar = container.querySelector("[aria-hidden='true']");
    expect(bar?.className).toContain("w-0");
    expect(bar?.className).toContain("group-hover:w-full");
    expect(bar?.className).toContain("group-focus-visible:w-full");
    expect(bar?.className).toContain("transition-[width]");
  });
});

describe("HairlineList / HairlineRow", () => {
  it("renders rows as real links separated by the lightest rule, not as cards", () => {
    render(
      <HairlineList>
        <HairlineRow href="/zh-CN/prompts?useCase=avatar">个人资料 / 头像</HairlineRow>
      </HairlineList>,
    );

    const link = screen.getByRole("link", { name: "个人资料 / 头像" });
    expect(link).toHaveAttribute("href", "/zh-CN/prompts?useCase=avatar");
    expect(link.className).toContain("border-b-2");
    expect(link.className).toContain("border-foreground/15");
    // Not a card: no frame, no shadow, no fill.
    expect(link.className).not.toContain("shadow-hard");
    expect(link.className).not.toContain("bg-surface");
  });

  it("keeps a 44px target however slight the row looks", () => {
    render(
      <HairlineList>
        <HairlineRow href="/zh-CN/prompts">全部</HairlineRow>
      </HairlineList>,
    );
    expect(screen.getByRole("link", { name: "全部" }).className).toContain("min-h-11");
  });

  it("hides the chevron until the row is hovered OR focused", () => {
    const { container } = render(
      <HairlineList>
        <HairlineRow href="/zh-CN/prompts">全部</HairlineRow>
      </HairlineList>,
    );
    const chevron = container.querySelector("li span[aria-hidden='true']");
    expect(chevron?.className).toContain("opacity-0");
    expect(chevron?.className).toContain("group-hover:opacity-100");
    // A keyboard must see exactly what a pointer sees.
    expect(chevron?.className).toContain("group-focus-visible:opacity-100");
    expect(screen.getByRole("link", { name: "全部" }).className).toContain("group");
  });

  it("drops the rule under the last row and marks external destinations", () => {
    render(
      <HairlineList>
        <HairlineRow href="https://example.invalid/x" external last>
          外部资料
        </HairlineRow>
      </HairlineList>,
    );
    const link = screen.getByRole("link", { name: /外部资料/ });
    expect(link).toHaveAttribute("rel", "noopener nofollow");
    expect(link).toHaveAttribute("target", "_blank");
    expect(link.className).not.toContain("border-b-2");
    expect(link).toHaveTextContent("（外部链接，新窗口打开）");
  });

  it("keeps a row with no destination as text: same rule, same target, no chevron", () => {
    const { container } = render(
      <HairlineList>
        <HairlineRow>全部创作者（即将推出）</HairlineRow>
      </HairlineList>,
    );

    // Never a link, and never a `#` href standing in for one.
    expect(screen.queryByRole("link")).not.toBeInTheDocument();
    const row = container.querySelector("li")?.firstElementChild as HTMLElement;
    expect(row.tagName).toBe("SPAN");
    expect(row.className).toContain("min-h-11");
    expect(row.className).toContain("border-b-2");
    expect(row.className).toContain("border-foreground/15");
    // An arrow on something that navigates nowhere is a lie.
    expect(row.querySelector("[aria-hidden='true']")).toBeNull();
  });

  it("fills its band on press, and only when the row actually navigates", () => {
    const { container } = render(
      <HairlineList>
        <HairlineRow href="/zh-CN/prompts">全部</HairlineRow>
        <HairlineRow>全部创作者（即将推出）</HairlineRow>
      </HairlineList>,
    );

    // A row has no border, no shadow and no fill, so there is nothing to
    // collapse and nothing to move against — its band is its only surface.
    const link = screen.getByRole("link", { name: "全部" });
    expect(link.className).toContain("active:bg-muted");
    expect(link.className).toContain("duration-200 ease-out");
    expect(link.className).not.toContain("active:translate");

    // Text does not answer a tap.
    const rows = container.querySelectorAll("li");
    const inert = rows[1]?.firstElementChild as HTMLElement;
    expect(inert.tagName).toBe("SPAN");
    expect(inert.className).not.toContain("active:");
  });

  it("darkens its band against the inverse surface instead of the canvas", () => {
    render(
      <HairlineList>
        <HairlineRow href="/zh-CN/prompts" surface="inverse">
          全部
        </HairlineRow>
      </HairlineList>,
    );
    const link = screen.getByRole("link", { name: "全部" });
    expect(link.className).toContain("active:bg-surface/10");
    expect(link.className).not.toContain("active:bg-muted");
  });

  it("forwards the rest of its props to the row itself, not to an inner wrapper", () => {
    const { container } = render(
      <HairlineList>
        <HairlineRow href="/zh-CN/prompts" data-model-related="kling">
          Kling
        </HairlineRow>
        <HairlineRow data-usecase-more="beauty" last>
          Beauty
        </HairlineRow>
      </HairlineList>,
    );

    expect(container.querySelector("a[data-model-related='kling']")).not.toBeNull();
    expect(container.querySelector("span[data-usecase-more='beauty']")).not.toBeNull();
  });
});

describe("Section", () => {
  it("takes a marker beside the heading without a second heading style", () => {
    render(
      <Section id="band" title="按模型浏览" marker={<GhostNumeral value="03" />}>
        <p>内容</p>
      </Section>,
    );

    // The heading keeps its level, its id and its wording; the marker is a
    // sibling, so it can never land on top of a description at any width.
    const heading = screen.getByRole("heading", { level: 2, name: "按模型浏览" });
    expect(heading.id).toBe("band");
    const header = heading.parentElement?.parentElement as HTMLElement;
    expect(header.querySelector(".ghost-numeral")).not.toBeNull();
    // Decoration only: it never reaches assistive technology.
    expect(header.querySelector(".ghost-numeral")?.getAttribute("aria-hidden")).toBe("true");
  });

  it("draws its rule at the card tier rather than writing the border out", () => {
    render(
      <Section id="plain" title="本期精选">
        <p>内容</p>
      </Section>,
    );
    const header = screen.getByRole("heading", { level: 2 }).parentElement
      ?.parentElement as HTMLElement;
    expect(header.className).toContain(dividerClassName("card", "bottom", { desktopThick: true }));
  });
});

describe("GhostNumeral", () => {
  it("is a low-contrast display number and is never announced", () => {
    const { container } = render(<GhostNumeral value="01" />);
    const numeral = container.firstElementChild as HTMLElement | null;
    // The digits are painted by `::before` from a custom property, so the
    // marker is decoration rather than a 10%-contrast text node an audit would
    // (correctly) read as a serious contrast failure.
    expect(numeral).toHaveTextContent("");
    expect(numeral?.style.getPropertyValue("--ghost-numeral")).toBe('"01"');
    expect(numeral).toHaveAttribute("aria-hidden", "true");
    expect(numeral?.className).toContain("text-foreground/10");
    expect(numeral?.className).toContain("text-5xl");
  });
});

describe("SpineCard", () => {
  it("renders a 38px accent column separated by the card-tier rule", () => {
    const { container } = render(
      <SpineCard accent="red">
        <h3>精选合集</h3>
      </SpineCard>,
    );
    const spine = container.querySelector("span[aria-hidden='true']");
    expect(spine?.className).toContain("w-9.5");
    expect(spine?.className).toContain("bg-accent-red");
    expect(spine?.className).toContain("border-r-2");
    expect(spine?.className).toContain("border-foreground");
    // The colour says nothing on its own — the heading does.
    expect(screen.getByRole("heading", { level: 3, name: "精选合集" })).toBeInTheDocument();
  });

  it("uses a different accent fill when asked, from the shared palette only", () => {
    const { container } = render(
      <SpineCard accent="blue">
        <p>内容</p>
      </SpineCard>,
    );
    expect(container.querySelector("span[aria-hidden='true']")?.className).toContain(
      "bg-accent-blue",
    );
  });

  it("becomes one whole-card link when given an href", () => {
    render(
      <SpineCard accent="yellow" href="/zh-CN/prompts?collection=a">
        <span>合集 A</span>
      </SpineCard>,
    );
    const link = screen.getByRole("link", { name: "合集 A" });
    expect(link).toHaveAttribute("href", "/zh-CN/prompts?collection=a");
    expect(link.className).toContain("no-underline");
  });

  it("owns the padding of the column beside the spine", () => {
    // The spine is full-bleed, so the card cannot carry the padding — without
    // a slot, every caller decided a spine card's padding from outside it.
    const { container } = render(
      <SpineCard accent="red" bodyClassName="p-4">
        <p>内容</p>
      </SpineCard>,
    );
    const body = container.querySelector("p")?.parentElement as HTMLElement;
    expect(body.className).toContain("p-4");
    expect(body.className).toContain("flex-1");
  });

  it("is a plain card when it has no destination", () => {
    render(
      <SpineCard accent="foreground">
        <p>内容</p>
      </SpineCard>,
    );
    expect(screen.queryByRole("link")).not.toBeInTheDocument();
  });
});
