import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { InternalPreviewMarker } from "@/components/layout/InternalPreviewMarker";

describe("InternalPreviewMarker", () => {
  it("stays absent for the normal fixture source", () => {
    const { container } = render(
      <InternalPreviewMarker mode="fixture" revision="wireframe-flow-proto" />,
    );

    expect(container).toBeEmptyDOMElement();
  });

  it("shows only a short content revision for CMS preview mode", () => {
    render(
      <InternalPreviewMarker
        mode="cms-preview"
        revision="sha256:0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef"
      />,
    );

    const marker = screen.getByRole("status", { name: "内部 CMS 预览" });
    expect(marker).toHaveTextContent("CMS Preview · 0123456789ab");
    expect(marker).not.toHaveTextContent("sha256:");
    expect(marker.outerHTML).not.toMatch(/token|localhost|127\.0\.0\.1/i);
  });
});
