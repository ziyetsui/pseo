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

  it("contains the picture on the mat instead of cropping it", () => {
    // These images ARE the prompt's result: `object-cover` would crop the
    // portrait outputs and show something the prompt did not produce.
    render(<MediaFrame {...base} />);
    expect(screen.getByAltText(base.alt)).toHaveClass("object-contain");
    expect(screen.getByAltText(base.alt)).not.toHaveClass("object-cover");
  });

  it("passes a responsive candidate set and its slot width through to the img", () => {
    const srcSet = "https://example.invalid/a.jpg?name=small 680w, https://example.invalid/a.jpg?name=large 2048w";
    render(<MediaFrame {...base} srcSet={srcSet} sizes="(min-width: 1024px) 340px, 80vw" />);
    const img = screen.getByAltText(base.alt);
    expect(img).toHaveAttribute("srcset", srcSet);
    expect(img).toHaveAttribute("sizes", "(min-width: 1024px) 340px, 80vw");
    // `src` stays the single-URL fallback.
    expect(img).toHaveAttribute("src", base.src);
  });

  it("omits srcset and sizes when the host publishes no size ladder", () => {
    render(<MediaFrame {...base} srcSet={null} sizes="100vw" />);
    const img = screen.getByAltText(base.alt);
    expect(img).not.toHaveAttribute("srcset");
    expect(img).not.toHaveAttribute("sizes");
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
