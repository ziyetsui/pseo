import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { Breadcrumb } from "@/components/ui/Breadcrumb";
import { cardClassName, tileShellClassName } from "@/components/ui/Card";
import { ChipButton, ChipLink } from "@/components/ui/Chip";
import { Section } from "@/components/ui/Section";

describe("Breadcrumb", () => {
  it("renders a labelled nav with an ordered list and a current last item", () => {
    render(
      <Breadcrumb
        items={[
          { name: "首页", path: "/zh-CN" },
          { name: "提示词库", path: "/zh-CN/prompts" },
          { name: "玻璃立方城市", path: "/zh-CN/prompts/glass-cube-city" },
        ]}
      />,
    );

    const nav = screen.getByRole("navigation", { name: "面包屑" });
    expect(within(nav).getByRole("list")).toBeInTheDocument();
    expect(within(nav).getAllByRole("listitem")).toHaveLength(3);
    expect(within(nav).getByRole("link", { name: "提示词库" })).toHaveAttribute(
      "href",
      "/zh-CN/prompts",
    );
    expect(within(nav).queryByRole("link", { name: "玻璃立方城市" })).not.toBeInTheDocument();
    expect(screen.getByText("玻璃立方城市")).toHaveAttribute("aria-current", "page");
  });
});

describe("Section", () => {
  it("labels itself with its own h2 and renders a real 查看全部 link", () => {
    render(
      <Section id="featured" title="精选" description="人工挑选" moreHref="/zh-CN/prompts">
        <p>内容</p>
      </Section>,
    );

    const section = screen.getByRole("region", { name: "精选" });
    expect(within(section).getByRole("heading", { level: 2 })).toHaveAttribute("id", "featured");
    expect(within(section).getByText("人工挑选")).toBeInTheDocument();
    expect(within(section).getByRole("link", { name: "查看全部" })).toHaveAttribute(
      "href",
      "/zh-CN/prompts",
    );
  });

  it("omits the more link when no href is given", () => {
    render(
      <Section id="featured" title="精选">
        <p>内容</p>
      </Section>,
    );
    expect(screen.queryByRole("link")).not.toBeInTheDocument();
  });
});

describe("ChipLink", () => {
  it("renders the count in a small element and marks the active state", () => {
    const { container } = render(
      <ChipLink href="/zh-CN/prompts?model=kling" label="Kling" count={2} active />,
    );
    expect(container.querySelector("small")).toHaveTextContent("2");
    expect(screen.getByRole("link", { name: /Kling/ })).toHaveAttribute("aria-current", "true");
  });

  it("omits the count element when there is no count", () => {
    const { container } = render(<ChipLink href="/zh-CN/prompts" label="Kling" />);
    expect(container.querySelector("small")).toBeNull();
  });
});

describe("ChipButton", () => {
  it("toggles aria-pressed and its accessible state via the pressed prop, not colour alone", () => {
    const { rerender } = render(<ChipButton label="Kling" pressed={false} />);
    const button = screen.getByRole("button", { name: "Kling" });
    expect(button).toHaveAttribute("aria-pressed", "false");
    expect(button).not.toHaveTextContent("✓");

    rerender(<ChipButton label="Kling" pressed />);
    expect(button).toHaveAttribute("aria-pressed", "true");
    expect(button).toHaveTextContent("✓");
  });
});

describe("cardClassName", () => {
  const className = cardClassName();

  it("lifts up-left and grows the offset shadow by the same step on hover", () => {
    // Lift without shadow growth reads as the card sinking into its shadow.
    expect(className).toContain("hover:-translate-x-0.5");
    expect(className).toContain("hover:-translate-y-0.5");
    expect(className).toContain("shadow-hard-md");
    expect(className).toContain("hover:shadow-hard-md-hover");
    expect(className).toContain("md:shadow-hard-lg");
    expect(className).toContain("md:hover:shadow-hard-lg-hover");
  });

  it("runs both on one 200ms ease-out transition and emits no arbitrary colours", () => {
    expect(className).toContain("duration-200 ease-out");
    // Never `transition-all`, and never a transition whose property list drags
    // `outline-color` along with it — see `transitionClassName` in `hover.ts`,
    // which is what this chassis reaches for once the chip/button family moves
    // off the bare utility.
    expect(className).not.toContain("transition-all");
    expect(className).not.toContain("outline");
    expect(className).not.toMatch(/shadow-\[/);
    expect(className).not.toMatch(/#[0-9a-f]{3,6}/i);
  });
});

describe("tileShellClassName", () => {
  it("gives every browse tile the same floor and pins its last row to it", () => {
    // The floor rose with the display-scale count inside the tiles; what the
    // shell guarantees is unchanged — one shared floor, last row pinned to it.
    expect(tileShellClassName).toMatch(/min-h-\d+/);
    expect(tileShellClassName).toContain("justify-between");
  });
});
