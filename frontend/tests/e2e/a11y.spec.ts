import AxeBuilder from "@axe-core/playwright";
import { expect, test, type TestInfo } from "@playwright/test";

import { ROUTES } from "./routes";

const PAGES = [
  { name: "L1 提示词库", path: ROUTES.l1 },
  { name: "L2 图片提示词", path: ROUTES.l2 },
  { name: "L3 模型页", path: ROUTES.l3 },
  { name: "L4 提示词详情", path: ROUTES.l4 },
  { name: "Blog 列表", path: ROUTES.blog },
  { name: "Blog 文章", path: ROUTES.blogArticle },
  { name: "404", path: ROUTES.notFound },
] as const;

/** Everything that is not critical/serious is reported, never asserted on. */
function attachSummary(
  testInfo: TestInfo,
  name: string,
  violations: { id: string; impact?: string | null; nodes: unknown[] }[],
): void {
  const lines = violations.map(
    (violation) =>
      `${violation.impact ?? "unknown"}\t${violation.id}\t${violation.nodes.length} node(s)`,
  );
  const body = lines.length === 0 ? "no violations" : lines.join("\n");
  // The run log is the deliverable, so this print is intentional.
  console.log(`[axe] ${testInfo.project.name} ${name}: ${lines.length} violation(s)\n${body}`);
  void testInfo.attach(`axe-${name}`, { body, contentType: "text/plain" });
}

for (const { name, path } of PAGES) {
  test(`axe: ${name} has no critical or serious violations`, async ({ page }, testInfo) => {
    await page.goto(path);
    const results = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
      .analyze();

    attachSummary(testInfo, name, results.violations);

    const blocking = results.violations.filter(
      (violation) => violation.impact === "critical" || violation.impact === "serious",
    );
    expect(
      blocking.map((violation) => `${violation.impact}: ${violation.id} (${violation.nodes.length})`),
      `${name} critical/serious axe violations`,
    ).toEqual([]);
  });
}
