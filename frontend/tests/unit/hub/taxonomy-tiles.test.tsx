import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { TaxonomyTiles } from "@/features/hub/TaxonomyTiles";
import type { TaxonomyWithCount } from "@/lib/content/types";

const BASE = "/zh-CN/prompts";

function term(overrides: Partial<TaxonomyWithCount> = {}): TaxonomyWithCount {
  return {
    id: "useCase:fashion",
    axis: "useCase",
    slug: "fashion",
    label: "Fashion",
    labelZh: "时尚",
    aliases: [],
    href: null,
    wireframeDeclaredCount: 162,
    count: 4,
    highValueCount: 1,
    ...overrides,
  };
}

describe("TaxonomyTiles", () => {
  it("links a term without a page of its own to the pre-filtered hub", () => {
    render(<TaxonomyTiles basePath={BASE} axis="useCase" terms={[term()]} />);

    // The tile carries the prototype's English value, not `labelZh`.
    expect(screen.getByRole("link", { name: /Fashion/ })).toHaveAttribute(
      "href",
      `${BASE}?useCase=fashion`,
    );
    expect(screen.queryByText("时尚")).not.toBeInTheDocument();
  });

  it("links a model that has a real page to that page", () => {
    render(
      <TaxonomyTiles
        basePath={BASE}
        axis="model"
        terms={[
          term({
            id: "model:nano-banana-pro",
            axis: "model",
            slug: "nano-banana-pro",
            label: "Nano Banana Pro",
            labelZh: null,
            href: "/zh-CN/prompts/models/nano-banana-pro",
            count: 6,
          }),
        ]}
      />,
    );

    expect(screen.getByRole("link", { name: /Nano Banana Pro/ })).toHaveAttribute(
      "href",
      "/zh-CN/prompts/models/nano-banana-pro",
    );
  });

  it("renders the count from the data, never the prototype's declared number", () => {
    const { container } = render(<TaxonomyTiles basePath={BASE} axis="useCase" terms={[term()]} />);

    // The number and its unit are now two elements — display-scale figure over a
    // caption — but the tile still reads `4 条提示词`, word for word.
    expect(container.textContent).toContain("4 条提示词");
    expect(screen.getByText("4")).toBeInTheDocument();
    expect(screen.getByText(/条提示词/)).toBeInTheDocument();
    expect(screen.queryByText(/162/)).not.toBeInTheDocument();
  });

  it("sets the count in display type with tabular numerals", () => {
    render(<TaxonomyTiles basePath={BASE} axis="useCase" terms={[term()]} />);

    const figure = screen.getByText("4");
    expect(figure.className).toContain("tabular-nums");
    expect(figure.className).toMatch(/text-(3|4|5)xl/);
    expect(figure.className).toContain("font-black");
  });

  it("takes its title from the shared tiers, and answers the card's hover", () => {
    render(
      <TaxonomyTiles
        basePath={BASE}
        axis="technique"
        terms={[
          term({ id: "t:a", slug: "a", label: "Camera movement / shot language", count: 4 }),
          term({ id: "t:b", slug: "b", label: "Transition / morph / match cut", count: 1 }),
          term({ id: "t:c", slug: "c", label: "Lip sync / dialogue", count: 1 }),
        ]}
      />,
    );

    // The band's biggest term takes the display tier — clamped to two lines, so
    // a long label can never push the number off the card.
    const lead = screen.getByRole("heading", { name: "Camera movement / shot language" });
    expect(lead.className).toContain("line-clamp-2");
    // Every other tile takes the single-line tier, so no label can make one
    // tile taller than its neighbours. The full string stays in the DOM.
    const rest = screen.getByRole("heading", { name: "Transition / morph / match cut" });
    expect(rest.className).toContain("truncate");
    expect(rest.textContent).toBe("Transition / morph / match cut");
    // Both answer the card's `group`, not their own hover.
    for (const heading of [lead, rest]) {
      expect(heading.className).toContain("group-hover:text-accent-red");
    }
  });

  it("sets the unit under the number as a micro label", () => {
    render(<TaxonomyTiles basePath={BASE} axis="useCase" terms={[term()]} />);

    const caption = screen.getByText(/条提示词/);
    expect(caption.className).toContain("tracking-micro");
    // `uppercase` is a no-op on these glyphs — the words are untouched.
    expect(caption.textContent).toContain("条提示词");
  });

  /** `n` terms, the first of them the biggest, so the lead is on the table. */
  function band(n: number) {
    return Array.from({ length: n }, (_, index) =>
      term({ id: `t:${index}`, slug: `t-${index}`, label: `T${index}`, count: index === 0 ? 9 : 1 }),
    );
  }

  it("gives the leading tile the full mobile row when the tiles then fill their rows", () => {
    // Seven tiles, two-up: the lead's two cells make eight, which is four full
    // rows. `col-span-2` is unprefixed, so it holds at `lg` too, where eight
    // cells are two full rows of four.
    const { container } = render(<TaxonomyTiles basePath={BASE} axis="useCase" terms={band(7)} />);

    const cells = [...container.querySelectorAll("li")];
    expect(cells[0]?.className).toMatch(/(^|\s)col-span-2/);
    expect(cells[0]?.className).not.toContain("lg:col-span-1");
    for (const cell of cells.slice(1)) {
      expect(cell.className).not.toContain("col-span-2");
    }
  });

  it("takes the span back rather than stranding one tile alone on the last row", () => {
    // Eight tiles, two-up: spanning the lead would make nine cells and leave
    // the ninth alone on a fifth row, so every tile takes one cell and the
    // eight fill four rows exactly. Same answer four-up at `lg`.
    const { container } = render(<TaxonomyTiles basePath={BASE} axis="useCase" terms={band(8)} />);

    for (const cell of container.querySelectorAll("li")) {
      expect(cell.className).not.toContain("col-span-2");
    }
    // And the tile that cannot have the width does not get the weight either:
    // a display-scale title in a half-row cell clamps away half of its label.
    expect(screen.getByRole("heading", { name: "T0" }).className).toContain("truncate");
  });

  it("keeps the lead's width and its weight as one decision", () => {
    // Six tiles two-up already fill three rows, so there is no lead at all —
    // not a lead that is narrow here and wide there. The band still renders
    // every tile, in the order it was given.
    const { container } = render(<TaxonomyTiles basePath={BASE} axis="useCase" terms={band(6)} />);

    const cells = [...container.querySelectorAll("li")];
    expect(cells).toHaveLength(6);
    for (const cell of cells) {
      expect(cell.className).not.toContain("col-span-");
    }
    expect(container.querySelector("h3")?.textContent).toBe("T0");
  });

  it("leaves every tile in one cell when the first is not the group's biggest", () => {
    const { container } = render(
      <TaxonomyTiles
        basePath={BASE}
        axis="useCase"
        terms={[
          term({ count: 2 }),
          term({ id: "useCase:beauty", slug: "beauty", label: "Beauty", count: 8 }),
        ]}
      />,
    );

    for (const cell of container.querySelectorAll("li")) {
      expect(cell.className).not.toContain("col-span-2");
    }
  });

  it("paints the tile's top edge in the accent the section was given", () => {
    const { container } = render(
      <TaxonomyTiles basePath={BASE} axis="technique" accent="blue" terms={[term()]} />,
    );

    const edge = container.querySelector('span[aria-hidden="true"]');
    expect(edge?.className).toContain("bg-accent-blue");
    expect(edge?.className).not.toContain("bg-accent-red");
    // Pinned to the frame rather than laid out, so the accent costs the tile
    // no height at all.
    expect(edge?.className).toContain("absolute");
  });

  it("renders no proportion bar: the count beside it already is the number", () => {
    const { container } = render(
      <TaxonomyTiles
        basePath={BASE}
        axis="useCase"
        terms={[term({ count: 9 }), term({ id: "t:b", slug: "b", label: "B", count: 3 })]}
      />,
    );

    // The bar was the only element on a browse tile carrying an inline width,
    // so a tile with no `style` attribute anywhere is a tile with no bar.
    expect(container.querySelector("[style]")).toBeNull();
  });

  it("falls back to an empty state instead of an empty list", () => {
    render(<TaxonomyTiles basePath={BASE} axis="style" terms={[]} />);

    expect(screen.queryByRole("list")).not.toBeInTheDocument();
    expect(document.querySelector('[data-state="empty"]')).not.toBeNull();
  });

  it("links to a term's own href whenever it has one, regardless of axis", () => {
    // `href` is only ever populated for a term with a real page in this phase;
    // trusting it directly (instead of also checking `axis === "model"`)
    // means a future axis gaining a real page needs no change here.
    render(
      <TaxonomyTiles
        basePath={BASE}
        axis="useCase"
        terms={[term({ href: "/zh-CN/prompts/use-cases/fashion" })]}
      />,
    );

    expect(screen.getByRole("link", { name: /Fashion/ })).toHaveAttribute(
      "href",
      "/zh-CN/prompts/use-cases/fashion",
    );
  });

  it("caps how many tiles it renders when asked", () => {
    render(
      <TaxonomyTiles
        basePath={BASE}
        axis="useCase"
        limit={1}
        terms={[term(), term({ id: "useCase:beauty", slug: "beauty", labelZh: "美妆", count: 3 })]}
      />,
    );

    expect(screen.getAllByRole("listitem")).toHaveLength(1);
  });
});
