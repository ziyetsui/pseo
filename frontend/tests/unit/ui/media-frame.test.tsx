import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { MediaFrame } from "@/components/ui/MediaFrame";

const base = {
  src: "https://example.invalid/a.jpg",
  alt: "玻璃立方体中的微缩城市",
  width: 640,
  height: 360,
};

describe("MediaFrame", () => {
  it("renders a sized, lazy, no-referrer image by default", () => {
    render(<MediaFrame {...base} />);
    const img = screen.getByAltText(base.alt);
    expect(img).toHaveAttribute("width", "640");
    expect(img).toHaveAttribute("height", "360");
    expect(img).toHaveAttribute("loading", "lazy");
    expect(img).toHaveAttribute("decoding", "async");
    expect(img).toHaveAttribute("referrerpolicy", "no-referrer");
  });

  it("marks above-the-fold media as eager and high priority", () => {
    render(<MediaFrame {...base} priority />);
    const img = screen.getByAltText(base.alt);
    expect(img).toHaveAttribute("loading", "eager");
    expect(img).toHaveAttribute("fetchpriority", "high");
  });

  it("falls back to a geometric placeholder and says 媒体不可用 on error", () => {
    render(<MediaFrame {...base} />);
    fireEvent.error(screen.getByAltText(base.alt));

    expect(screen.getByText("媒体不可用")).toBeInTheDocument();
    expect(screen.queryByRole("img", { name: base.alt })).not.toBeInTheDocument();
    // The alt text stays available to assistive technology.
    expect(screen.getByText(base.alt)).toBeInTheDocument();
  });
});
