import { test, expect } from './support/fixtures.js';

test.describe('Weather where I am', () => {
  test.describe('with permission granted', () => {
    test.use({ permissions: ['geolocation'], geolocation: { latitude: 51.75, longitude: -1.26 } });

    test('names the place from reverse geocoding and shows its weather', async ({ dashboard }) => {
      await dashboard.geoButton.click();

      await expect(dashboard.location).toHaveText('Oxford, United Kingdom');
      await expect(dashboard.condition).toHaveText('☁️ Cloudy');
      await expect(dashboard.temperature).toHaveText('Temperature: 14.2 °C');
    });

    test('asks for the weather at the coordinates the browser reported', async ({ dashboard }) => {
      await dashboard.geoButton.click();
      await expect(dashboard.weatherBox).toBeVisible();

      expect(dashboard.weatherRequests().at(-1)).toContain('latitude=51.75&longitude=-1.26');
    });

    test('still shows the weather when the place name cannot be looked up', async ({ dashboard, api }) => {
      api.reverseStatus = 500;

      await dashboard.geoButton.click();

      await expect(dashboard.location).toHaveText('Current Location');
      await expect(dashboard.temperature).toHaveText('Temperature: 14.2 °C');
    });
  });

  /* Browsers offer no way to refuse the prompt from a test, so the refusal itself is stubbed in the page */
  test('passes on the browser message when location access is refused', async ({ dashboard, page }) => {
    await page.addInitScript(() => {
      navigator.geolocation.getCurrentPosition = (_success, failure) =>
        failure({ code: 1, message: 'User denied Geolocation' });
    });
    await page.reload();

    const message = await dashboard.alertFrom(() => dashboard.geoButton.click());

    expect(message).toBe('Location access denied: User denied Geolocation');
    await expect(dashboard.spinner).not.toBeVisible();
  });
});