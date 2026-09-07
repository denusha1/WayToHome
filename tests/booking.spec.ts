import { test, expect } from '@playwright/test';
test('search → seat → demo payment → QR ticket', async ({ page }) => {
  await page.goto('/');
  await expect(
    page.getByRole('heading', { name: /Your journey home starts/ }),
  ).toBeVisible();
  await expect(page.getByText('Demo preview')).toBeVisible();
  const date = new Date(Date.now() + 86400000).toISOString().slice(0, 10);
  await page.getByLabel('Travel date', { exact: true }).fill(date);
  await page.getByRole('button', { name: 'Search Buses' }).click();
  await page.getByRole('button', { name: 'Select seats' }).first().click();
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
  await page.getByRole('button', { name: 'View e-ticket' }).click();
  await expect(page.getByAltText('Your booking QR code')).toBeVisible();
  await expect(
    page.getByText('DEMO TICKET · NOT VALID FOR TRAVEL'),
  ).toBeVisible();
});
test('mobile layout fits and navigation works', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  await expect(
    page.getByRole('button', { name: 'Search Buses' }),
  ).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBeTruthy();
  await page.getByRole('button', { name: 'Toggle menu' }).click();
  await page
    .getByRole('navigation', { name: 'Main navigation' })
    .getByRole('link', { name: 'My bookings', exact: true })
    .click();
  await expect(
    page.getByRole('heading', { name: 'My journeys.' }),
  ).toBeVisible();
});
test('API rejects invalid seats and unauthenticated booking access', async ({
  request,
}) => {
  const unauthenticated = await request.get(
    'http://localhost:4000/api/bookings',
  );
  expect(unauthenticated.status()).toBe(401);
  const invalid = await request.post('http://localhost:4000/api/holds', {
    headers: { 'x-demo-user': '00000000-0000-4000-8000-000000000000' },
    data: { tripId: 'test', seats: [1, 1], amount: 1 },
  });
  expect(invalid.status()).toBe(400);
});
test('admin can create a route and bus, then publish a new departure', async ({
  page,
}) => {
  const suffix = String(Date.now());
  const busName = `Browser Test Express ${suffix}`;
  const origin = `Vavuniya ${suffix}`;
  await page.goto('/admin');
  await page.getByRole('button', { name: 'buses', exact: true }).click();
  await page.getByLabel('Bus name', { exact: true }).fill(busName);
  await page.getByLabel('Registration plate').fill(`TEST-${Date.now()}`);
  await page.getByLabel('Seats', { exact: true }).fill('32');
  await page.getByLabel('Amenities (comma separated)').fill('AC, USB charging');
  await page.getByRole('button', { name: 'Add bus', exact: true }).click();
  await expect(page.getByText('Saved successfully.')).toBeVisible();
  await expect(page.getByRole('heading', { name: busName })).toBeVisible();
  await page.getByRole('button', { name: 'routes', exact: true }).click();
  await page.getByLabel('From', { exact: true }).fill(origin);
  await page.getByLabel('To', { exact: true }).fill('Negombo');
  await page.getByLabel('Boarding point').fill('Vavuniya Central');
  await page.getByLabel('Drop-off point').fill('Negombo Central');
  await page.getByLabel('Duration (minutes)').fill('240');
  await page.getByRole('button', { name: 'Add route', exact: true }).click();
  await expect(
    page.getByRole('heading', { name: `${origin} → Negombo` }),
  ).toBeVisible();
  await page.getByRole('button', { name: 'schedule', exact: true }).click();
  const bus = await page
    .getByRole('combobox', { name: 'Bus', exact: true })
    .locator('option')
    .filter({ hasText: busName })
    .getAttribute('value');
  const route = await page
    .getByRole('combobox', { name: 'Route', exact: true })
    .locator('option')
    .filter({ hasText: `${origin} → Negombo` })
    .getAttribute('value');
  await page
    .getByRole('combobox', { name: 'Bus', exact: true })
    .selectOption(bus!);
  await page
    .getByRole('combobox', { name: 'Route', exact: true })
    .selectOption(route!);
  await page
    .getByLabel('Departure (Sri Lanka time)')
    .fill(
      new Date(Date.now() + 86400000).toISOString().slice(0, 10) + 'T09:00',
    );
  await page.getByLabel('Fare per seat (LKR)').fill('1700');
  const saved = page.waitForResponse(
    (r) =>
      r.url().endsWith('/api/admin/trips') && r.request().method() === 'POST',
  );
  await page
    .getByRole('button', { name: 'Add departure', exact: true })
    .click();
  expect((await saved).status()).toBe(201);
  await expect(page.getByText('Saved successfully.')).toBeVisible();
  await expect(page.getByRole('main').getByRole('alert')).toHaveCount(0);
});
