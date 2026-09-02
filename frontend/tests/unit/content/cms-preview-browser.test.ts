import { expect, it, vi } from "vitest";

import { fetchCmsPreviewCatalog } from "@/lib/api/cms-preview-client";

it("refuses to execute the credentialed CMS preview client in a browser", async () => {
  const fetchImpl = vi.fn<typeof fetch>();
  await expect(
    fetchCmsPreviewCatalog({
      baseUrl: "http://127.0.0.1:3001",
      token: "must-stay-server-side",
      locale: "zh-CN",
      fetchImpl,
    }),
  ).rejects.toMatchObject({ code: "invalid-config" });
  expect(fetchImpl).not.toHaveBeenCalled();
});
