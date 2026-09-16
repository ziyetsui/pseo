import { expect, test } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { readFileSync } from 'node:fs';
import type { Skill } from '../../src/lib/skills';
const catalog = JSON.parse(readFileSync(new URL('../../src/lib/skills/catalog.generated.json', import.meta.url), 'utf8')) as { skills: Skill[]; agentPrompt: string; installCommand: string };
const { skills, agentPrompt: ALL_SKILLS_AGENT_PROMPT, installCommand: ALL_SKILLS_INSTALL_COMMAND } = catalog;

for (const locale of ['zh-CN', 'en']) {
  test(`Skills catalog and all detail routes: ${locale}`, async ({ page, request }, testInfo) => {
    await page.goto(`/${locale}/skills`);
    await expect(page.locator('main h1')).toHaveCount(1);
    await expect(page.locator('.skills-groups .skills-row')).toHaveCount(25);
    await expect(page.locator('.navlinks a[aria-current="page"]')).toHaveText('Skills');
    await expect(page.getByRole('link', { name: 'Account', exact: true })).toHaveCount(0);
    if (locale === 'zh-CN') await page.screenshot({ path: `evidence/skills/${testInfo.project.name}-index.png`, fullPage: true });
    for (const skill of skills) {
      const response = await request.get(`/${locale}/skills/${skill.id}`);
      expect(response.status(), skill.id).toBe(200);
      expect(await response.text()).toContain('View original Markdown');
    }
    await page.locator(`.skills-row[href="/${locale}/skills/pseo"]`).click();
    await expect(page.locator('main h1')).toHaveText('/pseo');
    await expect(page.locator('.skills-markdown')).toContainText('开始与继续');
    await page.getByText('View original Markdown', { exact: true }).click();
    await expect(page.locator('.skills-raw-source pre')).toHaveText(skills.find(skill => skill.id === 'pseo')!.markdown);
    const violations = (await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze()).violations;
    expect(violations.filter(v => ['serious', 'critical'].includes(v.impact ?? '')).map(v => ({ id: v.id, nodes: v.nodes.map(n => n.target) }))).toEqual([]);
    expect((await request.get(`/${locale}/skills/does-not-exist`)).status()).toBe(404);
  });
}

test('homepage entry and copied instructions are complete', async ({ page, context }) => {
  await context.grantPermissions(['clipboard-read', 'clipboard-write']);
  await page.goto('/zh-CN/prompts');
  await page.locator('.navlinks').getByRole('link', { name: 'Skills', exact: true }).click();
  await expect(page).toHaveURL(/\/zh-CN\/skills$/);
  await page.getByRole('button', { name: 'Copy install command', exact: true }).click();
  await expect.poll(() => page.evaluate(() => navigator.clipboard.readText())).toBe(ALL_SKILLS_INSTALL_COMMAND);
  await page.getByRole('button', { name: 'Copy agent instructions', exact: true }).click();
  await expect.poll(() => page.evaluate(() => navigator.clipboard.readText())).toBe(ALL_SKILLS_AGENT_PROMPT);
});

test('responsive index and long detail, keyboard and no-JS body', async ({ page, browser }) => {
  for (const width of [320, 375, 768, 1024, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    for (const route of ['/zh-CN/skills', '/zh-CN/skills/pseo-wireframe']) {
      await page.goto(route);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `${width} ${route}`).toBe(true);
      await expect(page.locator('main h1')).toBeVisible();
    }
  }
  await page.goto('/zh-CN/skills');
  await page.keyboard.press('Tab');
  await expect(page.getByRole('link', { name: 'Skip to content' })).toBeFocused();
  const violations = (await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze()).violations;
  expect(violations.filter(v => ['serious', 'critical'].includes(v.impact ?? '')).map(v => v.id)).toEqual([]);
  const context = await browser.newContext({ javaScriptEnabled: false, baseURL: process.env.FRONTEND_TEST_URL ?? 'http://127.0.0.1:3000' });
  const noJs = await context.newPage();
  await noJs.goto('/zh-CN/skills');
  await expect(noJs.locator('.skills-row')).toHaveCount(25);
  await noJs.goto('/zh-CN/skills/pseo');
  await expect(noJs.locator('.skills-markdown')).toContainText('开始与继续');
  await context.close();
});
