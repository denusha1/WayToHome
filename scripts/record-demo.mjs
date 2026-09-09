import { chromium, expect } from '@playwright/test';
import { mkdir } from 'node:fs/promises';
await mkdir('docs/demo', { recursive: true });
const browser = await chromium.launch({ slowMo: 350 });
const context = await browser.newContext({
  baseURL: 'http://localhost:3000',
  viewport: { width: 1366, height: 900 },
  recordVideo: {
    dir: 'docs/demo/.recording',
    size: { width: 1366, height: 900 },
  },
});
const page = await context.newPage();
try {
  await page.goto('/');
  await page.waitForTimeout(1800);
  await expect(
    page.getByRole('heading', { name: /Your journey home starts/ }),
  ).toBeVisible();
  await expect(page.getByText('Demo preview')).toBeVisible();
  const date = new Date(Date.now() + 86400000).toISOString().slice(0, 10);
  await page.getByLabel('Travel date', { exact: true }).fill(date);
  await page.getByRole('button', { name: 'Search Buses' }).click();
  await page.waitForTimeout(2200);
  await page.getByRole('button', { name: 'Select seats' }).first().click();
  await page.waitForTimeout(1600);
  await page
    .getByRole('button', { name: /^Seat \d+, available$/ })
    .first()
    .click();
  await page
    .getByRole('button', { name: 'Continue with 1 seat', exact: true })
    .click();
  await page.getByLabel('Full name', { exact: true }).fill('Demo Traveller');
  await page.getByLabel('Email', { exact: true }).fill('demo@example.com');
  await page.getByLabel('Mobile number').fill('0771234567');
  await page.getByLabel('Billing address').fill('12 Lake Road');
  await page.getByLabel('City', { exact: true }).fill('Colombo');
  await page.getByRole('button', { name: 'Confirm demo booking' }).click();
  await expect(page).toHaveURL(/\/bookings/);
  await page.waitForTimeout(1800);
  await page.getByRole('button', { name: 'View e-ticket' }).click();
  await expect(page.getByAltText('Your booking QR code')).toBeVisible();
  await expect(
    page.getByText('DEMO TICKET · NOT VALID FOR TRAVEL'),
  ).toBeVisible();
  await page.waitForTimeout(3000);
  await page.screenshot({ path: 'docs/demo/ticket-preview.png' });
  const video = page.video();
  await context.close();
  await video.saveAs('docs/demo/booking-walkthrough.webm');
  await video.delete();
  console.log('Saved docs/demo/booking-walkthrough.webm');
} finally {
  await browser.close();
}
