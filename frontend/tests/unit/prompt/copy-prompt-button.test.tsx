import { act, fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import { CopyPromptButton } from "@/features/prompt/CopyPromptButton";

const TEXT = "A tiny city inside a glass cube";

function setClipboard(value: unknown): void {
  Object.defineProperty(navigator, "clipboard", {
    value,
    configurable: true,
    writable: true,
  });
}

function renderButton() {
  return render(
    <div>
      <pre id="prompt-body">{TEXT}</pre>
      <CopyPromptButton text={TEXT} targetId="prompt-body" />
    </div>,
  );
}

function copyButton() {
  return screen.getByRole("button", { name: /复制/ });
}

afterEach(() => {
  setClipboard(undefined);
  vi.useRealTimers();
  window.getSelection()?.removeAllRanges();
});

describe("CopyPromptButton", () => {
  it("writes the full text and only then announces success", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    setClipboard({ writeText });

    renderButton();
    await userEvent.click(copyButton());

    expect(writeText).toHaveBeenCalledWith(TEXT);
    expect(copyButton()).toHaveTextContent("已复制");
    expect(screen.getByRole("status")).toHaveTextContent("已复制到剪贴板");
    expect(screen.getByRole("status")).toHaveAttribute("aria-live", "polite");
  });

  it("never claims success when writeText rejects, and selects the target text", async () => {
    const writeText = vi.fn().mockRejectedValue(new Error("denied"));
    setClipboard({ writeText });

    renderButton();
    await userEvent.click(copyButton());

    expect(screen.getByRole("status")).toHaveTextContent("复制失败，可选中文本手动复制");
    expect(screen.queryByText(/已复制/)).not.toBeInTheDocument();

    const selection = window.getSelection();
    expect(selection?.rangeCount).toBe(1);
    const range = selection?.getRangeAt(0);
    const pre = document.getElementById("prompt-body");
    expect(range !== undefined && pre !== null && pre.contains(range.commonAncestorContainer)).toBe(
      true,
    );
  });

  it("never claims success when the clipboard API is missing", async () => {
    setClipboard(undefined);

    renderButton();
    await userEvent.click(copyButton());

    expect(screen.getByRole("status")).toHaveTextContent("复制失败，可选中文本手动复制");
    expect(screen.queryByText(/已复制/)).not.toBeInTheDocument();
  });

  it("resets the label after 2500ms", async () => {
    vi.useFakeTimers();
    setClipboard({ writeText: vi.fn().mockResolvedValue(undefined) });

    renderButton();
    await act(async () => {
      fireEvent.click(copyButton());
    });
    expect(copyButton()).toHaveTextContent("已复制");

    await act(async () => {
      vi.advanceTimersByTime(2500);
    });
    expect(copyButton()).not.toHaveTextContent("已复制");
  });
});
