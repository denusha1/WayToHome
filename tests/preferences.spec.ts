import { test, expect } from '@playwright/test';

test('language and night mode persist, including on mobile', async ({
  page,
}) => {
  await page.goto('/');
  const controls = page.locator('.utility-controls');
  await expect(controls.locator('> *')).toHaveCount(3);
  await expect(controls.locator('> *').nth(1)).toHaveText('LKR · Sri Lanka');
  await page.getByRole('button', { name: 'Night mode', exact: true }).click();
  await page
    .getByRole('combobox', { name: 'Language', exact: true })
    .selectOption('ta');
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  await expect(page.locator('html')).toHaveAttribute('lang', 'ta');
  await expect(page.locator('h1')).toContainText('இல்லம் நோக்கிய');
  await expect(
    page.getByRole('button', { name: 'பேருந்துகளைத் தேடுக' }),
  ).toBeVisible();
  // Translation must not change the canonical city value sent to the API.
  await expect(page.getByLabel('From', { exact: true })).toHaveValue('Colombo');
  await page.reload();
  await expect(page.locator('html')).toHaveAttribute('lang', 'ta');
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(
    page.getByRole('combobox', { name: 'Language', exact: true }),
  ).toBeVisible();
  await page
    .getByRole('combobox', { name: 'Language', exact: true })
    .selectOption('si');
  await expect(page.locator('h1')).toContainText('නිවස බලා');
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.locator('.theme-toggle').click();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
  await page
    .getByRole('combobox', { name: 'Language', exact: true })
    .selectOption('en');
  await expect(
    page.getByRole('button', { name: 'Search Buses' }),
  ).toBeVisible();
});
