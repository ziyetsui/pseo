import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { ActionRow } from "@/components/ui/ActionRow";
import { CardLink, cardClassName } from "@/components/ui/Card";
import { CardMedia } from "@/components/ui/CardMedia";
import { CategoryPill } from "@/components/ui/CategoryPill";
import { Chevron } from "@/components/ui/Chevron";
import { GhostNumeral } from "@/components/ui/GhostNumeral";
import { GrowingUnderline } from "@/components/ui/GrowingUnderline";
import { HairlineList, HairlineRow } from "@/components/ui/HairlineList";
import { Avatar, IdentityMark, monogramFrom } from "@/components/ui/IdentityMark";
import { SpineCard } from "@/components/ui/SpineCard";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { dividerClassName } from "@/components/ui/dividers";
import {
  displayTitleClassName,
  microLabelClassName,
  singleLineTitleClassName,
} from "@/components/ui/type-scale";

/* ------------------------------------------------------------ 第二步: tiers */

describe("title tiers", () => {
  it("keeps the three tiers far enough apart to be unmistakable", () => {
    const display = displayTitleClassName();
    const single = singleLineTitleClassName();
    const micro = microLabelClassName();

    expect(display).toContain("text-2xl");
    expect(single).toContain("text-sm");
    expect(micro).toContain("text-xs");
    expect(new Set([display, single, micro]).size).toBe(3);
  });

  it("clamps the display tier to two lines so a poster title cannot grow the card", () => {
    expect(displayTitleClassName()).toContain("line-clamp-2");
    expect(displayTitleClassName()).toContain("font-black");
    expect(displayTitleClassName()).toContain("leading-none");
  });

  it("always truncates the single-line tier", () => {
    // The whole point of the tier: a long title can never wrap and make this
    // card taller than its neighbours.
    expect(singleLineTitleClassName()).toContain("truncate");
    expect(singleLineTitleClassName("extra")).toContain("extra");
  });

  it("opens the micro label with the tracking token rather than a literal em value", () => {
    expect(microLabelClassName()).toContain("tracking-micro");
    expect(microLabelClassName()).toContain("uppercase");
    expect(microLabelClassName()).not.toMatch(/tracking-\[/);
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
    expect(dividerClassName("card", "bottom")).not.toContain("md:border-b-4");
    expect(dividerClassName("card", "bottom", { desktopThick: true })).toContain("md:border-b-4");
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

describe("CategoryPill", () => {
  it("is the inverted pill and is not a link", () => {
    const { container } = render(<CategoryPill>图片</CategoryPill>);
    const pill = container.firstElementChild;
    expect(pill?.className).toContain("bg-foreground");
    expect(pill?.className).toContain("text-canvas");
    expect(pill?.className).toContain("rounded-pill");
    expect(screen.queryByRole("link")).not.toBeInTheDocument();
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

  it("is a plain card when it has no destination", () => {
    render(
      <SpineCard accent="foreground">
        <p>内容</p>
      </SpineCard>,
    );
    expect(screen.queryByRole("link")).not.toBeInTheDocument();
  });
});
