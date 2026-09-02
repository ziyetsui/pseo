import type { ComponentPropsWithoutRef, ReactNode } from "react";

import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { ActiveFilters } from "@/features/search/ActiveFilters";
import { FacetChips } from "@/features/search/FacetChips";
import type { AppliedFilter } from "@/lib/content/types";

import { makeFacetGroups } from "../support/prompt-fixtures";

/**
 * `next/link` consumes `scroll` and never puts it on the anchor, so the only
 * way to hold the contract is to stand in for the module and record what it was
 * handed. Everything else about the link is passed straight through, so the
 * components under test render exactly as they do in the app.
 */
interface MockLinkProps extends Omit<ComponentPropsWithoutRef<"a">, "href"> {
  href: string;
  scroll?: boolean;
  children?: ReactNode;
}

vi.mock("next/link", () => ({
  default: function MockLink({ href, scroll, children, ...rest }: MockLinkProps) {
    return (
      <a {...rest} href={href} data-scroll={scroll === false ? "false" : "true"}>
        {children}
      </a>
    );
  },
}));

const BASE = "/zh-CN/prompts";

const applied: AppliedFilter[] = [
  { key: "q", value: "cat", label: "关键词「cat」" },
  { key: "model", value: "seedance", label: "模型：Seedance" },
];

function everyLink(): HTMLAnchorElement[] {
  return screen.getAllByRole("link") as HTMLAnchorElement[];
}

/**
 * Filtering must not move the reader.
 *
 * A facet chip is a link to the same page with one value toggled, and by
 * default `next/link` restores scroll to the top of the document on every
 * navigation. On L1 the chip block sits several hundred pixels down the page
 * and the results sit below it, so every single filter threw the reader away
 * from the control they were in the middle of using and made them scroll back
 * to place the next one. The URL is still the state; only the viewport stays.
 *
 * This is asserted over EVERY link each component emits rather than over one
 * named chip, so a filter link added later cannot quietly ship without it.
 */
describe("filter links keep the reader in place", () => {
  it("sets scroll=false on every facet chip", () => {
    render(<FacetChips basePath={BASE} query={{ model: ["seedance"] }} groups={makeFacetGroups()} />);
    const links = everyLink();
    expect(links.length).toBeGreaterThan(0);
    for (const link of links) {
      expect(link, link.textContent ?? "").toHaveAttribute("data-scroll", "false");
    }
  });

  it("sets scroll=false on every removal link and on the reset link", () => {
    render(
      <ActiveFilters
        basePath={BASE}
        query={{ q: "cat", model: ["seedance"] }}
        total={3}
        appliedFilters={applied}
      />,
    );
    // Two removal links plus 清除全部筛选.
    expect(everyLink()).toHaveLength(3);
    for (const link of everyLink()) {
      expect(link, link.textContent ?? "").toHaveAttribute("data-scroll", "false");
    }
  });

  it("sets scroll=false on the unknown-parameter recovery link", () => {
    render(
      <ActiveFilters
        basePath={BASE}
        query={{ q: "cat" }}
        total={3}
        appliedFilters={[applied[0] as AppliedFilter]}
        unknownParams={["sort"]}
      />,
    );
    expect(screen.getByRole("link", { name: "使用可识别的筛选条件重新打开" })).toHaveAttribute(
      "data-scroll",
      "false",
    );
  });
});
