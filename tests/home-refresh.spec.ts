import { test, expect } from '@playwright/test';

test('refresh starts at the hero, while section links still work', async ({
  page,
}) => {
  await page.goto('/');
  await page.locator('.utility-bar > a').click();
  await expect(page).toHaveURL(/#how-it-works$/);
  await expect.poll(() => page.evaluate(() => scrollY)).toBeGreaterThan(500);
  await page.reload();
  await expect(page).not.toHaveURL(/#/);
  await expect.poll(() => page.evaluate(() => scrollY)).toBe(0);
  await expect(page.locator('.hero h1')).toBeInViewport();
  await page.locator('.utility-bar > a').click();
  await expect.poll(() => page.evaluate(() => scrollY)).toBeGreaterThan(500);
  // Also cover browser restoration without a fragment in the URL.
  await page.evaluate(() => history.replaceState(history.state, '', '/'));
  await page.reload();
  await expect.poll(() => page.evaluate(() => scrollY)).toBe(0);
  await page.getByRole('link', { name: 'Contact', exact: true }).click();
  await page.locator('.utility-bar > a').click();
  await expect(page).toHaveURL(/#how-it-works$/);
  await expect.poll(() => page.evaluate(() => scrollY)).toBeGreaterThan(500);
});
