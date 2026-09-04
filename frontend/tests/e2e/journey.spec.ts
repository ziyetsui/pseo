import { test, expect } from "@playwright/test";

for (const kind of ["image", "video"] as const) {
  test(`${kind}: L1 → L2 → model L3 → Recipe L4`, async ({ page }) => {
    const errors: string[] = [];
    page.on("pageerror", error => errors.push(error.message));
    await page.goto("/zh-CN/prompts", { waitUntil: "domcontentloaded" });
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Somebody already wrote this");
    await expect(page.getByRole("button", { name: /copy/i })).toHaveCount(0);
    const ctaName = `Generate ${kind}`;
    const entry = page.locator(`.run [data-entry][data-kind="${kind}"]`).first();
    // Anchored peeks intentionally close on scroll. Finish positioning before opening one.
    await entry.locator("[data-expand]").evaluate(element => element.scrollIntoView({ block: "center", behavior: "instant" }));
    await page.evaluate(() => new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve()))));
    await entry.locator("[data-expand]").focus();
    await page.keyboard.press("Enter");
    const hubCta = entry.getByRole("link", { name: ctaName, exact: true });
    const hubTarget = await hubCta.getAttribute("href");
    expect(hubTarget).toBeTruthy();
    await hubCta.click();
    await expect(page).toHaveURL(new RegExp(`${hubTarget}/?$`));
    await expect(page.locator(".prototype-recipe .acts").getByRole("link", { name: ctaName, exact: true })).toHaveAttribute("href", "https://bo.video/home");
    await page.goBack();
    await page.locator(`#category a[href$="/${kind}"]`).click();
    await expect(page).toHaveURL(new RegExp(`/zh-CN/prompts/${kind}/?$`));
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(kind === "image" ? "Image prompts" : "Video prompts");
    await expect(page.getByRole("button", { name: /copy/i })).toHaveCount(0);
    const deckCta = page.locator(".dc[data-top]").getByRole("link", { name: ctaName, exact: true });
    await expect(deckCta).toHaveAttribute("href", await page.locator(".dc[data-top] h3 a").getAttribute("href") ?? "");
    await page.locator("main .entry .go").first().click();
    await expect(page).toHaveURL(/\/zh-CN\/prompts\/(?:models|model-families)\/[^/?]+\/?$/);
    // Wait for the hero's client effect; pre-hydration links intentionally retain their L4 fallback.
    await expect(page.locator(".model-signature .msh-wall")).not.toHaveAttribute("data-paused", "");
    await expect(page.locator(".model-signature").getByRole("textbox", { name: "Your prompt", exact: true })).toBeVisible();
    await expect(page.getByRole("button", { name: /copy/i })).toHaveCount(0);
    // A model page can contain both images and videos; follow this journey's actual content type.
    const generate = page.locator(".anth .entry").getByRole("link", { name: ctaName, exact: true }).first();
    const detailHref = await generate.getAttribute("href");
    await generate.click();
    await expect(page.locator(".model-signature textarea")).not.toHaveValue("");
    await page.locator(`.anth .entry h4 a[href="${detailHref}"]`).click();
    await expect(page.locator(".prototype-recipe")).toBeVisible();
    for (const name of ["See what it makes", "Set the placeholders", "Take the text", "Run it"]) {
      await expect(page.getByRole("heading", { level: 2, name, exact: true })).toBeAttached();
    }
    await expect(page.getByRole("button", { name: /copy/i })).toHaveCount(0);
    await expect(page.locator(".prototype-recipe .acts").getByRole("link", { name: ctaName, exact: true })).toHaveAttribute("href", "https://bo.video/home");
    expect(errors).toEqual([]);
  });
}

test("Deck arrow controls preserve a single active card and reset after query changes", async ({ page }) => {
  await page.goto("/zh-CN/prompts/image", { waitUntil: "domcontentloaded" });
  const cards = page.locator(".dc"), active = page.locator(".dc[data-top]");
  const count = await cards.count();
  expect(count).toBeGreaterThan(1);
  await expect(page.getByRole("button", { name: "← Previous" })).toBeDisabled();
  await expect(page.locator(".dc[inert]")).toHaveCount(count - 1);
  const first = await active.locator("h3").textContent();
  await page.locator(".deck").scrollIntoViewIfNeeded();
  if ((page.viewportSize()?.width ?? 0) > 700) await expect(page.locator("nav.nav")).toBeInViewport();
  await page.locator(".deck").focus();
  await page.keyboard.press("ArrowRight");
  await expect(active.locator("h3")).not.toHaveText(first ?? "");
  await expect(page.locator(".dkpos")).toHaveText(`2 of ${count}`);
  await expect(page.locator(".dc[inert]")).toHaveCount(count - 1);
  await page.keyboard.press("ArrowLeft");
  await expect(active.locator("h3")).toHaveText(first ?? "");
  await page.getByRole("searchbox").fill("no-result-query-948372");
  await expect(page.getByText("No image prompts match those filters.")).toBeVisible();
  await page.getByRole("button", { name: "Clear filters", exact: true }).last().click();
  await expect(page.locator(".dkpos")).toHaveText(`1 of ${count}`);
  await expect(active.locator("h3")).toHaveText(first ?? "");
});

test("Hub filters use repeated URL parameters, OR within an axis, AND across axes, and browser Back", async ({ page }) => {
  await page.goto("/zh-CN/prompts", { waitUntil: "domcontentloaded" });
  const alpha = page.getByRole("button", { name: /^Nano Banana Pro \d+/ });
  const beta = page.getByRole("button", { name: /^Seedance \d+/ });
  await alpha.click();
  const firstURL = page.url();
  const oneModelCount = await page.locator(".run [data-entry]").count();
  await beta.click();
  const twoModelsURL = page.url();
  expect(new URL(twoModelsURL).searchParams.getAll("model")).toHaveLength(2);
  const twoModelCount = await page.locator(".run [data-entry]").count();
  expect(twoModelCount).toBeGreaterThanOrEqual(oneModelCount);
  await page.getByRole("button", { name: /^Cinematic \d+/ }).click();
  expect(new URL(page.url()).searchParams.getAll("style")).toHaveLength(1);
  expect(await page.locator(".run [data-entry]").count()).toBeLessThanOrEqual(twoModelCount);
  await page.goBack();
  await expect(page).toHaveURL(twoModelsURL);
  await expect(page.locator(".run [data-entry]")).toHaveCount(twoModelCount);
  await page.goBack();
  await expect(page).toHaveURL(firstURL);
  await expect(page.locator(".run [data-entry]")).toHaveCount(oneModelCount);
  await page.reload({ waitUntil: "domcontentloaded" });
  await expect(alpha).toHaveAttribute("aria-pressed", "true");
  await expect(page.locator(".run [data-entry]")).toHaveCount(oneModelCount);
});

test("Anthology index and entries agree; scratchpad survives filtering, Back, and reload", async ({ page }) => {
  await page.goto("/zh-CN/prompts/models/nano-banana-pro", { waitUntil: "domcontentloaded" });
  await expect(page.locator(".model-signature .msh-wall")).not.toHaveAttribute("data-paused", "");
  const firstIndex = page.locator(".toc li a").first();
  const target = await firstIndex.getAttribute("href");
  expect(target).toBeTruthy();
  await expect(page.locator(target ?? "#missing").locator(".idx")).toHaveText("01");
  await expect(page.locator(target ?? "#missing").locator("h4")).toHaveText(await firstIndex.locator(".t").innerText());
  await expect(page.getByRole("button", { name: "Send to the scratchpad", exact: true })).toHaveCount(0);
  const scratch = page.getByRole("textbox", { name: "Your prompt", exact: true });
  const draft = "A local draft that must survive filtering.\nKeep this second line.";
  await scratch.fill(draft);
  await expect(page.locator(".msh-count")).toHaveText(`${draft.length} characters`);
  await page.locator(".axes .chip").first().click();
  await expect(page).toHaveURL(/\?useCase=/);
  await expect(scratch).toHaveValue(draft);
  await page.goBack();
  await expect(page).toHaveURL(/\/models\/nano-banana-pro$/);
  await expect(scratch).toHaveValue(draft);
  await page.reload({ waitUntil: "domcontentloaded" });
  await expect(scratch).toHaveValue(draft);
});
