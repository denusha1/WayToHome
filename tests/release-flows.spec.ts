import { test, expect } from '@playwright/test';
test('live user pages require login and non-admins cannot mount the admin dashboard', async ({
  page,
}) => {
  await page.route('**/api/health', (r) =>
    r.fulfill({ json: { ok: true, demo: false } }),
  );
  await page.route('**/api/me', (r) =>
    r.fulfill({ status: 401, json: { message: 'Please sign in' } }),
  );
  await page.goto('/bookings');
  await expect(
    page.getByRole('heading', { name: 'Sign in to continue' }),
  ).toBeVisible();
  await expect(
    page.getByRole('main').getByRole('link', { name: 'Sign in', exact: true }),
  ).toHaveAttribute('href', '/login?next=%2Fbookings');
  await page.unroute('**/api/me');
  await page.route('**/api/me', (r) =>
    r.fulfill({ json: { user: { id: 'traveller', admin: false } } }),
  );
  await page.goto('/admin');
  await expect(
    page.getByRole('heading', { name: 'Admin access required' }),
  ).toBeVisible();
  await expect(
    page.getByRole('button', { name: 'Add bus', exact: true }),
  ).toHaveCount(0);
});
test('confirmed demo booking can request cancellation and receive one admin-approved demo refund', async ({
  page,
}) => {
  await page.goto('/');
  await expect(
    page.getByText('Demo preview · sample schedules & payments'),
  ).toBeVisible();
  const id = await page.evaluate(() => localStorage.getItem('wth-demo-user'));
  const headers = { 'x-demo-user': id! };
  const date = new Date(Date.now() + 86400000).toISOString().slice(0, 10);
  const trips = await (
    await page.request.get(
      `http://localhost:4000/api/trips?from=Colombo&to=Kandy&date=${date}`,
    )
  ).json();
  const held = await (
    await page.request.post('http://localhost:4000/api/holds', {
      headers,
      data: { tripId: trips[0].id, seats: [38] },
    })
  ).json();
  const details = {
    name: 'Refund Test',
    email: 'refund@example.com',
    phone: '0771234567',
    address: '10 Lake Road',
    city: 'Colombo',
  };
  expect(
    (
      await page.request.post(
        `http://localhost:4000/api/bookings/${held.id}/checkout`,
        { headers, data: details },
      )
    ).ok(),
  ).toBe(true);
  expect(
    (
      await page.request.post(
        `http://localhost:4000/api/bookings/${held.id}/demo-payment`,
        { headers },
      )
    ).ok(),
  ).toBe(true);
  await page.goto('/bookings');
  await page.getByText('Request cancellation', { exact: true }).click();
  await page.getByLabel('Reason', { exact: true }).fill('Changed travel plans');
  await page.getByRole('button', { name: 'Confirm request' }).click();
  await expect(
    page.getByText('Cancellation requested. Refund awaits operator approval.'),
  ).toBeVisible();
  await page.goto('/admin');
  const row = page.getByRole('row').filter({ hasText: held.id.slice(0, 8) });
  page.once('dialog', (dialog) => dialog.accept());
  await row.getByRole('button', { name: 'Approve full refund' }).click();
  await expect(row).toContainText('REFUNDED');
  await page.goto('/bookings');
  await expect(page.locator('.booking-card')).toContainText('Refund processed');
  await expect(
    page.getByRole('button', { name: 'View e-ticket', exact: true }),
  ).toHaveCount(0);
});
