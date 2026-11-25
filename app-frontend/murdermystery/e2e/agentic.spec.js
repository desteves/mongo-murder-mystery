import { test, expect } from '@playwright/test';

// Lighthouse "Agentic browsing": WebMCP tools (imperative + declarative), a complete accessibility tree, stable layout.
test.describe('agent readiness', () => {
  test('registers WebMCP tools and exposes the AI question form declaratively', async ({ page }) => {
    await page.addInitScript(() => {
      window.__tools = [];
      Object.defineProperty(document, 'modelContext', {
        configurable: true,
        value: { registerTool: async (tool) => { window.__tools.push(tool.name); } },
      });
    });
    await page.goto('/ai');
    await expect.poll(() => page.evaluate(() => [...window.__tools].sort())).toEqual(['get_game_guide', 'navigate_to_page', 'run_mongo_query']);

    const form = page.locator('form[toolname="ask_detective_agent"]');
    await expect(form).toHaveAttribute('tooldescription', /.{20,}/);
    const question = form.locator('textarea[name="question"]');
    await expect(question).toHaveAttribute('toolparamdescription', /.+/);
    await expect(page.getByLabel('Your question for the agent')).toBeVisible();
  });

  test('each page has one h1 and every button has an accessible name', async ({ page }) => {
    for (const path of ['/', '/walkthrough', '/ai', '/about']) {
      await page.goto(path);
      await expect(page.locator('h1')).toHaveCount(1);
      const unnamed = await page.$$eval('button, [role="button"]', (els) =>
        els.filter((el) => !(el.getAttribute('aria-label') || el.textContent.trim() || el.getAttribute('title'))).length);
      expect(unnamed, `unnamed buttons on ${path}`).toBe(0);
    }
  });

  test('the hero image reserves its space and is loaded eagerly', async ({ page }) => {
    await page.goto('/');
    const hero = page.locator('img[fetchpriority="high"]');
    await expect(hero).toHaveAttribute('width', '1200');
    await expect(hero).toHaveAttribute('height', '807');
  });
});
