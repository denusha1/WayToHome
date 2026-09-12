import { test, expect } from '@playwright/test';

test('journey links, route search, filters, dates and timetable work', async ({
  page,
}) => {
  await page.goto('/');
  await page
    .getByRole('link', { name: 'Find your journey', exact: true })
    .click();
  await expect(page).toHaveURL(/\/journeys/);
  const nextDate = new Date(Date.now() + 86400000).toISOString().slice(0, 10);
  await page.getByLabel('Travel date', { exact: true }).fill(nextDate);
  await page.getByRole('button', { name: 'Search Buses' }).click();
  await expect(page).toHaveURL(new RegExp(`date=${nextDate}`));
  await expect(page.locator('.journey-card')).toHaveCount(6);
  await page
    .getByLabel('Operator', { exact: true })
    .selectOption('Island Nightliner');
  await expect(page.locator('.journey-card').first()).toContainText(
    'Island Nightliner',
  );
  await page
    .getByLabel('Departure time', { exact: true })
    .selectOption('morning');
  await expect(
    page.getByRole('heading', { name: 'No journeys found' }),
  ).toBeVisible();
  await page.getByRole('button', { name: 'Remove filters' }).click();
  await page.getByLabel('From', { exact: true }).selectOption('Colombo');
  await page.getByLabel('To', { exact: true }).selectOption('Jaffna');
  await page.getByRole('button', { name: 'Search Buses' }).click();
  await expect(page).toHaveURL(/from=Colombo&to=Jaffna/);
  await expect(page.locator('.journey-card')).toHaveCount(3);
  await page
    .locator('.journey-card')
    .last()
    .getByText('Timetable', { exact: true })
    .click();
  await expect(
    page.locator('.journey-card').last().locator('details[open]'),
  ).toContainText('Jaffna Central Bus Station');
  await expect(page.locator('.journey-card').last()).toContainText(
    'This journey arrives the next day',
  );
  await page.locator('.journey-date-strip button').nth(2).click();
  await expect(
    page.locator('.journey-date-strip button').nth(2),
  ).toHaveAttribute('aria-pressed', 'true');
});

test('contact draft and redesigned pages remain usable on mobile', async ({
  page,
}) => {
  await page.goto('/contact');
  await page.getByLabel('Full name', { exact: true }).fill('Test Traveller');
  await page.getByLabel('Email', { exact: true }).fill('traveller@example.com');
  await page
    .getByLabel('Your message', { exact: true })
    .fill('Please help me find my booking reference.');
  const download = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Download message draft' }).click();
  expect((await download).suggestedFilename()).toBe('way-to-home-message.txt');
  await expect(page.getByRole('status')).toContainText('It has not been sent');
  await page.setViewportSize({ width: 390, height: 844 });
  for (const route of ['/journeys', '/contact', '/bookings', '/']) {
    await page.goto(route);
    await expect(page.locator('footer')).toHaveCount(1);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
  }
});
