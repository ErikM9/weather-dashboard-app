import { test, expect } from './support/fixtures.js';

test.describe('Error handling', () => {
  test('says so when the city is not in the search results', async ({ dashboard }) => {
    const message = await dashboard.alertFrom(() => dashboard.searchFor('Nowhereville'));

    expect(message).toBe('City not found');
    await expect(dashboard.spinner).not.toBeVisible();
    await expect(dashboard.weatherBox).not.toBeVisible();
  });

  test('says so when the city lookup fails', async ({ dashboard, api }) => {
    api.geocodingStatus = 500;

    const message = await dashboard.alertFrom(() => dashboard.searchFor('London'));

    expect(message).toBe('Failed to load weather');
    await expect(dashboard.spinner).not.toBeVisible();
  });

  test('says so when the weather service fails', async ({ dashboard, api }) => {
    api.weatherStatus = 503;

    const message = await dashboard.alertFrom(() => dashboard.searchFor('London'));

    expect(message).toBe('Failed to retrieve data');
    await expect(dashboard.spinner).not.toBeVisible();
    await expect(dashboard.weatherBox).not.toBeVisible();
  });

  test('keeps the dashboard usable after a failed search', async ({ dashboard, api }) => {
    api.weatherStatus = 503;
    await dashboard.alertFrom(() => dashboard.searchFor('London'));

    api.weatherStatus = 200;
    await dashboard.input.clear();
    await dashboard.searchFor('Paris');

    await expect(dashboard.location).toHaveText('Paris, France');
  });
});