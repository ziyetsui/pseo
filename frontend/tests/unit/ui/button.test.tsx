import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { Button, ButtonLink, buttonClassName } from "@/components/ui/Button";

describe("buttonClassName", () => {
  it("only emits token utilities, never raw hex or arbitrary shadows", () => {
    for (const variant of ["primary", "secondary", "yellow", "outline", "ghost"] as const) {
      const className = buttonClassName({ variant });
      expect(className).not.toMatch(/#[0-9a-f]{3,8}/i);
      expect(className).not.toMatch(/shadow-\[/);
    }
  });

  it("uses square or pill radius and nothing in between", () => {
    expect(buttonClassName({ shape: "square" })).toContain("rounded-none");
    expect(buttonClassName({ shape: "pill" })).toContain("rounded-pill");
  });
});

describe("Button", () => {
  it("defaults to type=button so it never submits a form by accident", () => {
    render(<Button>复制</Button>);
    expect(screen.getByRole("button", { name: "复制" })).toHaveAttribute("type", "button");
  });

  it("stays focusable when disabled and explains why", async () => {
    const onClick = vi.fn();
    render(
      <Button disabled disabledReason="生成功能尚未接入" onClick={onClick}>
        生成
      </Button>,
    );

    const button = screen.getByRole("button", { name: "生成" });
    expect(button).toHaveAttribute("aria-disabled", "true");
    expect(button).not.toHaveAttribute("disabled");

    const describedBy = button.getAttribute("aria-describedby") ?? "";
    expect(document.getElementById(describedBy)).toHaveTextContent("生成功能尚未接入");

    await userEvent.click(button);
    expect(onClick).not.toHaveBeenCalled();
  });

  it("joins a caller-supplied aria-describedby with the disabled reason instead of dropping it", () => {
    render(
      <Button disabled disabledReason="生成功能尚未接入" aria-describedby="external-help">
        生成
      </Button>,
    );

    const button = screen.getByRole("button", { name: "生成" });
    const ids = (button.getAttribute("aria-describedby") ?? "").split(" ").filter(Boolean);

    expect(ids).toContain("external-help");
    expect(ids).toHaveLength(2);
    const reasonId = ids.find((id) => id !== "external-help");
    expect(document.getElementById(reasonId ?? "")).toHaveTextContent("生成功能尚未接入");
  });
});

describe("ButtonLink", () => {
  it("renders a real link with the shared button styling", () => {
    render(<ButtonLink href="/zh-CN/prompts">提示词</ButtonLink>);
    const link = screen.getByRole("link", { name: "提示词" });
    expect(link).toHaveAttribute("href", "/zh-CN/prompts");
    expect(link.className).toContain("rounded-none");
  });
});
