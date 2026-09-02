import { expect, test, type Page } from "@playwright/test";

import {
  ROUTES,
  chipIndexAdding,
  currentPath,
  facetGroup,
  facetValues,
  resultCount,
  resultStatus,
} from "./routes";

/**
 * The L1 filter contract (global constraint 6): same axis ORs, different axes
 * AND, state lives in the URL, and nothing is silently ignored.
 *
 * Desktop only — the surface is identical at 375px (the same links), and the
 * mobile viewport is covered by `mobile-nav`, `responsive` and `a11y`.
 */
test.beforeEach(({}, testInfo) => {
  test.skip(testInfo.project.name !== "desktop", "one run of the filter contract is enough");
});

/** Clicks the chip that would add `axis=value`, then waits for the URL. */
async function addFacet(page: Page, axis: string, value: string): Promise<void> {
  const group = facetGroup(page, axis);
  const index = await chipIndexAdding(group, axis, value);
  expect(index, `no chip offering ${axis}=${value}`).toBeGreaterThanOrEqual(0);
  await group.locator("a").nth(index).click();
  await page.waitForFunction(
    ([key, wanted]) => new URLSearchParams(location.search).getAll(key).includes(wanted),
    [axis, value] as const,
  );
}

test.describe("L1 search and faceted filtering", () => {
  test("the search form is a GET form that writes q into the URL", async ({ page }) => {
    await page.goto(ROUTES.l1);

    const form = page.getByRole("search");
    await expect(form).toHaveAttribute("action", ROUTES.l1);
    await expect(form).toHaveAttribute("method", "get");

    await page.getByRole("searchbox", { name: "搜索提示词" }).fill("poster");
    await page.getByRole("button", { name: "搜索" }).click();
    await page.waitForURL(/\?.*q=poster/);

    expect(new URL(page.url()).searchParams.get("q")).toBe("poster");
    await expect(resultStatus(page)).toBeVisible();
    expect(await resultCount(page)).toBeGreaterThan(0);
  });

  test("same axis ORs, a second axis ANDs, and the count matches the cards", async ({ page }) => {
    await page.goto(ROUTES.l1);

    const models = facetGroup(page, "model");
    const [modelA, modelB] = await facetValues(models, "model");
    expect(modelA, "L1 needs at least two model facets").toBeDefined();
    expect(modelB, "L1 needs at least two model facets").toBeDefined();
    if (modelA === undefined || modelB === undefined) return;

    // ------------------------------------------- each value on its own first
    await addFacet(page, "model", modelA);
    const countA = await resultCount(page);

    await page.goto(ROUTES.l1);
    await addFacet(page, "model", modelB);
    const countB = await resultCount(page);

    // ------------------------------------------------------- same axis: OR
    await addFacet(page, "model", modelA);
    const countAorB = await resultCount(page);
    expect(new URL(page.url()).searchParams.getAll("model").sort()).toEqual(
      [modelA, modelB].sort(),
    );
    expect(countAorB, "same-axis selection must be a union").toBeGreaterThanOrEqual(countA);
    expect(countAorB, "same-axis selection must be a union").toBeGreaterThanOrEqual(countB);

    // The announced number is the number of cards actually rendered.
    const results = page.locator('section[aria-labelledby="prompt-explorer-results"] ul > li');
    await expect(results).toHaveCount(countAorB);

    // ------------------------------------------------------ cross axis: AND
    const styles = facetGroup(page, "style");
    const [style] = await facetValues(styles, "style");
    expect(style, "L1 needs at least one style facet in this state").toBeDefined();
    if (style === undefined) return;

    await addFacet(page, "style", style);
    const countAnd = await resultCount(page);
    expect(countAnd, "adding a second axis can only narrow").toBeLessThanOrEqual(countAorB);
    await expect(results).toHaveCount(countAnd);
  });

  test("state survives removal, reload, and browser back/forward", async ({ page }) => {
    await page.goto(ROUTES.l1);

    const models = facetGroup(page, "model");
    const [modelA, modelB] = await facetValues(models, "model");
    if (modelA === undefined || modelB === undefined) throw new Error("two model facets required");

    await addFacet(page, "model", modelA);
    const afterA = currentPath(page);
    const countA = await resultCount(page);

    await addFacet(page, "model", modelB);
    const afterBoth = currentPath(page);
    const countBoth = await resultCount(page);

    // --------------------------------------------------------- reload keeps
    await page.reload();
    expect(currentPath(page)).toBe(afterBoth);
    expect(await resultCount(page)).toBe(countBoth);

    // ------------------------------------------------- back / forward keeps
    await page.goBack();
    await page.waitForURL(`**${afterA}`);
    expect(await resultCount(page)).toBe(countA);

    await page.goForward();
    await page.waitForURL(`**${afterBoth}`);
    expect(await resultCount(page)).toBe(countBoth);

    // --------------------------------------------- removal link takes it off
    const removal = page.getByRole("link", { name: /^移除筛选：/ }).first();
    const removalName = await removal.getAttribute("aria-label");
    await removal.click();
    await page.waitForFunction(
      (previous) => `${location.pathname}${location.search}` !== previous,
      afterBoth,
    );
    expect(
      new URL(page.url()).searchParams.getAll("model"),
      `after removing ${removalName}`,
    ).toHaveLength(1);
    expect(await resultCount(page)).toBeLessThanOrEqual(countBoth);
  });

  test("an unknown facet value is reported, not silently applied", async ({ page }) => {
    await page.goto(`${ROUTES.l1}?model=does-not-exist`);

    await expect(page.getByText("以下筛选值不存在，已被忽略：model=does-not-exist")).toBeVisible();

    // The recovery link must lead somewhere else than the broken URL, and must
    // not carry the bad value forward.
    const recovery = page.getByRole("link", { name: "使用可识别的筛选条件重新打开" });
    const href = await recovery.getAttribute("href");
    expect(href).not.toBeNull();
    expect(href).not.toContain("does-not-exist");
    expect(href).not.toBe(currentPath(page));
  });

  test("an unknown query param is reported rather than dropped", async ({ page }) => {
    await page.goto(`${ROUTES.l1}?sort=hot`);
    await expect(page.getByText(/未知参数 sort 已被忽略/)).toBeVisible();
  });
});
