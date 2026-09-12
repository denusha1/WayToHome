import { test, expect } from '@playwright/test';
test('route shortcuts persist and comparison can open the seat picker', async ({
  page,
}) => {
  const date = new Date(Date.now() + 86400000).toISOString().slice(0, 10);
  await page.goto(`/journeys?from=Colombo&to=Kandy&date=${date}`);
  await expect(page.locator('.journey-card')).toHaveCount(3);
  await page
    .getByRole('button', { name: 'Save this route', exact: true })
    .click();
  await page.reload();
  await expect(
    page.getByRole('button', { name: 'Route saved', exact: true }),
  ).toHaveAttribute('aria-pressed', 'true');
  await page.getByLabel('Sort by', { exact: true }).selectOption('price');
  const prices = await page.locator('.journey-fare strong').allTextContents();
  expect(prices.map((x) => Number(x.replace(/[^\d]/g, '')))).toEqual(
    [...prices]
      .map((x) => Number(x.replace(/[^\d]/g, '')))
      .sort((a, b) => a - b),
  );
  await page.getByLabel('Add to comparison', { exact: true }).nth(0).check();
  await page.getByLabel('Add to comparison', { exact: true }).nth(1).check();
  await page
    .getByRole('button', { name: 'Compare journeys', exact: true })
    .click();
  const dialog = page.getByRole('dialog');
  await expect(dialog.getByRole('table')).toBeVisible();
  await expect(dialog).toContainText('Boarding point');
  await dialog
    .getByRole('button', { name: 'Select seats', exact: true })
    .first()
    .click();
  await expect(
    page.getByRole('button', { name: /^Seat \d+, available$/ }).first(),
  ).toBeVisible();
});
