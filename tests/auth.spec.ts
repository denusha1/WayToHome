import { test, expect } from '@playwright/test';

test('sign-in has phone/email, social options, local sign-up, and the supplied photograph', async ({
  page,
}) => {
  await page.goto('/');
  await page.locator('.header-signin').click();
  await expect(page).toHaveURL(/\/login$/);
  await expect(
    page.getByRole('heading', { name: "What's your phone number or email?" }),
  ).toBeVisible();
  await expect(
    page.getByRole('button', { name: 'Continue with Google' }),
  ).toBeVisible();
  await expect(
    page.getByRole('button', { name: 'Continue with Facebook' }),
  ).toBeVisible();
  await expect(page.locator('.auth-scene-photo')).toBeVisible();
  await page
    .getByLabel('Phone number or email', { exact: true })
    .fill('invalid');
  await page.getByRole('button', { name: 'Continue', exact: true }).click();
  await expect(page.getByRole('main').getByRole('alert')).toContainText(
    'Enter a valid email',
  );
  await page
    .getByRole('main')
    .getByRole('link', { name: 'Create Account', exact: true })
    .click();
  await expect(page).toHaveURL(/\/signup$/);
  await expect(
    page.getByRole('heading', { name: 'Create your account.' }),
  ).toBeVisible();
});

test('sign-in remains usable in mobile, night mode, Tamil and Sinhala', async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/login');
  await page.locator('.theme-toggle').click();
  for (const language of ['ta', 'si', 'en']) {
    await page.getByLabel('Language', { exact: true }).selectOption(language);
    await expect(page.locator('html')).toHaveAttribute('lang', language);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
  }
  await page.setViewportSize({ width: 320, height: 844 });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await expect(
    page.getByRole('button', { name: 'Continue with Google' }),
  ).toBeVisible();
});
