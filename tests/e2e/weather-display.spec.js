import { test, expect } from './support/fixtures.js';

test.describe('Weather card', () => {
  test('shows every reading the API returned', async ({ dashboard }) => {
    await dashboard.searchFor('London');

    await expect(dashboard.weatherBox).toBeVisible();
    await expect(dashboard.location).toHaveText('London, United Kingdom');
    await expect(dashboard.condition).toHaveText('☀️ Sunny');
    await expect(dashboard.temperature).toHaveText('Temperature: 22.5 °C');
    await expect(dashboard.feelsLike).toHaveText('Feels Like: 21 °C');
    await expect(dashboard.humidity).toHaveText('Humidity: 65%');
    await expect(dashboard.windSpeed).toHaveText('Wind Speed: 3.4 m/s');
  });

  test('asks the API for wind speed in the unit the card claims', async ({ dashboard }) => {
    await dashboard.searchFor('London');
    await expect(dashboard.weatherBox).toBeVisible();

    expect(dashboard.weatherRequests().at(-1)).toContain('wind_speed_unit=ms');
  });

  test('shows the spinner while the request is in flight, then the weather', async ({ dashboard, api }) => {
    api.weatherDelay = 1000;

    await dashboard.searchFor('London');

    await expect(dashboard.spinner).toBeVisible();
    await expect(dashboard.weatherBox).not.toBeVisible();

    await expect(dashboard.weatherBox).toBeVisible();
    await expect(dashboard.spinner).not.toBeVisible();
  });

  test('replaces the previous city rather than mixing the two', async ({ dashboard }) => {
    await dashboard.searchFor('London');
    await expect(dashboard.location).toHaveText('London, United Kingdom');

    await dashboard.input.clear();
    await dashboard.searchFor('Paris');

    await expect(dashboard.location).toHaveText('Paris, France');
    await expect(dashboard.condition).toHaveText('🌧️ Light Rain');
    await expect(dashboard.windSpeed).toHaveText('Wind Speed: 6.2 m/s');
  });

  test('shows the rain background behind the card', async ({ dashboard }) => {
    await expect(dashboard.raindrops).toHaveCount(50);
  });
});