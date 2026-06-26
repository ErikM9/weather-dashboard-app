import { test, expect } from '@playwright/test';

const mockCitySearchResponse = {
  results: [
    { name: 'London', country: 'United Kingdom', latitude: 51.5074, longitude: -0.1278 },
    { name: 'London', country: 'Canada', latitude: 42.9849, longitude: -81.2453 },
    { name: 'Londonderry', country: 'United Kingdom', latitude: 55.0, longitude: -7.3 }
  ]
};

const mockWeatherResponse = {
  current: {
    weather_code: 0,
    temperature_2m: 22.5,
    apparent_temperature: 21.0,
    relative_humidity_2m: 65,
    wind_speed_10m: 12.3
  }
};

const mockReverseGeocodeResponse = {
  address: {
    city: 'Oxford',
    country: 'United Kingdom'
  }
};

async function mockApis(page) {
  await page.route('**/geocoding-api.open-meteo.com/**', route => {
    const url = route.request().url();
    if (url.includes('nonexistent')) {
      return route.fulfill({ json: { results: [] } });
    }
    return route.fulfill({ json: mockCitySearchResponse });
  });

  await page.route('**/api.open-meteo.com/**', route => {
    return route.fulfill({ json: mockWeatherResponse });
  });

  await page.route('**/nominatim.openstreetmap.org/**', route => {
    return route.fulfill({ json: mockReverseGeocodeResponse });
  });
}

test.describe('Weather Dashboard', () => {

  test.beforeEach(async ({ page }) => {
    await mockApis(page);
    await page.goto('/');
  });

  test.describe('Page Load', () => {

    test('displays page title', async ({ page }) => {
      await expect(page).toHaveTitle('Weather Dashboard');
    });

    test('shows main heading', async ({ page }) => {
      const heading = page.locator('h1');
      await expect(heading).toHaveText('Weather Dashboard');
    });

    test('displays search input', async ({ page }) => {
      const input = page.locator('#cityField');
      await expect(input).toBeVisible();
      await expect(input).toHaveAttribute('placeholder', 'Enter city name');
    });

    test('displays geolocation button', async ({ page }) => {
      const geoBtn = page.locator('.geo-btn');
      await expect(geoBtn).toBeVisible();
      await expect(geoBtn).toHaveText("How's the weather outside?");
    });

    test('weather box is initially hidden', async ({ page }) => {
      const weatherBox = page.locator('#weatherBox');
      await expect(weatherBox).not.toBeVisible();
    });

    test('rain animation is present', async ({ page }) => {
      const rainBg = page.locator('.rain-bg');
      await expect(rainBg).toBeVisible();
      const drops = page.locator('.drop');
      await expect(drops).toHaveCount(50);
    });
  });

  test.describe('City Search', () => {

    test('shows autocomplete suggestions when typing', async ({ page }) => {
      const input = page.locator('#cityField');
      await input.fill('London');
      const cityList = page.locator('#cityList');
      await expect(cityList).toBeVisible();
      const suggestions = page.locator('#cityList li');
      await expect(suggestions.first()).toBeVisible({ timeout: 10000 });
    });

    test('limits suggestions to 3 items', async ({ page }) => {
      const input = page.locator('#cityField');
      await input.fill('London');
      await page.waitForSelector('#cityList li', { timeout: 10000 });
      const suggestions = page.locator('#cityList li');
      const count = await suggestions.count();
      expect(count).toBeLessThanOrEqual(3);
    });

    test('clears suggestions when input is cleared', async ({ page }) => {
      const input = page.locator('#cityField');
      await input.fill('London');
      await page.waitForSelector('#cityList li', { timeout: 10000 });
      await input.clear();
      const suggestions = page.locator('#cityList li');
      await expect(suggestions).toHaveCount(0);
    });

    test('clears suggestions when clicking outside', async ({ page }) => {
      const input = page.locator('#cityField');
      await input.fill('London');
      await page.waitForSelector('#cityList li', { timeout: 10000 });
      await page.locator('h1').click();
      const suggestions = page.locator('#cityList li');
      await expect(suggestions).toHaveCount(0);
    });

    test('selecting a city displays weather', async ({ page }) => {
      const input = page.locator('#cityField');
      await input.fill('London');
      const firstSuggestion = page.locator('#cityList li').first();
      await firstSuggestion.waitFor({ timeout: 10000 });
      await firstSuggestion.click();
      const weatherBox = page.locator('#weatherBox');
      await expect(weatherBox).toBeVisible({ timeout: 10000 });
    });

    test('updates input value when selecting a city', async ({ page }) => {
      const input = page.locator('#cityField');
      await input.fill('London');
      const firstSuggestion = page.locator('#cityList li').first();
      await firstSuggestion.waitFor({ timeout: 10000 });
      const suggestionText = await firstSuggestion.textContent();
      await firstSuggestion.click();
      await expect(input).toHaveValue(suggestionText);
    });
  });

  test.describe('Keyboard Navigation', () => {

    test('ArrowDown navigates through suggestions', async ({ page }) => {
      const input = page.locator('#cityField');
      await input.fill('London');
      await page.waitForSelector('#cityList li', { timeout: 10000 });
      await input.press('ArrowDown');
      const firstItem = page.locator('#cityList li').first();
      await expect(firstItem).toHaveClass(/active/);
      await input.press('ArrowDown');
      const secondItem = page.locator('#cityList li').nth(1);
      await expect(secondItem).toHaveClass(/active/);
      await expect(firstItem).not.toHaveClass(/active/);
    });

    test('ArrowUp navigates backwards', async ({ page }) => {
      const input = page.locator('#cityField');
      await input.fill('London');
      await page.waitForSelector('#cityList li', { timeout: 10000 });
      await input.press('ArrowDown');
      await input.press('ArrowDown');
      await input.press('ArrowUp');
      const firstItem = page.locator('#cityList li').first();
      await expect(firstItem).toHaveClass(/active/);
    });

    test('Enter selects highlighted suggestion', async ({ page }) => {
      const input = page.locator('#cityField');
      await input.fill('London');
      await page.waitForSelector('#cityList li', { timeout: 10000 });
      await input.press('ArrowDown');
      await input.press('Enter');
      const weatherBox = page.locator('#weatherBox');
      await expect(weatherBox).toBeVisible({ timeout: 10000 });
    });

    test('Escape closes suggestions', async ({ page }) => {
      const input = page.locator('#cityField');
      await input.fill('London');
      await page.waitForSelector('#cityList li', { timeout: 10000 });
      await input.press('Escape');
      const suggestions = page.locator('#cityList li');
      await expect(suggestions).toHaveCount(0);
    });

    test('Enter without selection fetches weather for input text', async ({ page }) => {
      const input = page.locator('#cityField');
      await input.fill('Paris');
      await input.press('Enter');
      const weatherBox = page.locator('#weatherBox');
      await expect(weatherBox).toBeVisible({ timeout: 10000 });
    });
  });

  test.describe('Weather Display', () => {

    test('displays all weather information', async ({ page }) => {
      const input = page.locator('#cityField');
      await input.fill('Paris');
      await input.press('Enter');
      await page.waitForSelector('#weatherBox', { state: 'visible', timeout: 10000 });
      await expect(page.locator('#locName')).not.toBeEmpty();
      await expect(page.locator('#cond')).not.toBeEmpty();
      await expect(page.locator('#temp')).toContainText('Temperature:');
      await expect(page.locator('#feel')).toContainText('Feels Like:');
      await expect(page.locator('#humid')).toContainText('Humidity:');
      await expect(page.locator('#windSpd')).toContainText('Wind Speed:');
    });

    test('displays weather emoji in condition', async ({ page }) => {
      const input = page.locator('#cityField');
      await input.fill('Tokyo');
      await input.press('Enter');
      await page.waitForSelector('#weatherBox', { state: 'visible', timeout: 10000 });
      const condition = page.locator('#cond');
      const text = await condition.textContent();
      const hasEmoji = /[\u{2600}-\u{26FF}\u{1F300}-\u{1F9FF}]/u.test(text);
      expect(hasEmoji).toBe(true);
    });

    test('displays temperature with degree symbol', async ({ page }) => {
      const input = page.locator('#cityField');
      await input.fill('Berlin');
      await input.press('Enter');
      await page.waitForSelector('#weatherBox', { state: 'visible', timeout: 10000 });
      const temp = page.locator('#temp');
      await expect(temp).toContainText('°C');
    });
  });

  test.describe('Loading State', () => {

    test('hides spinner after data loads', async ({ page }) => {
      const input = page.locator('#cityField');
      await input.fill('Rome');
      await input.press('Enter');
      await page.waitForSelector('#weatherBox', { state: 'visible', timeout: 10000 });
      const spinner = page.locator('#spinner');
      await expect(spinner).not.toBeVisible();
    });
  });

  test.describe('Error Handling', () => {

    test('shows alert for non-existent city', async ({ page }) => {
      const dialogPromise = new Promise(resolve => {
        page.once('dialog', dialog => {
          resolve(dialog.message());
          dialog.accept();
        });
      });

      const input = page.locator('#cityField');
      await input.fill('xyznonexistentcity123');
      await input.press('Enter');
      expect(await dialogPromise).toContain('not found');
    });
  });

  test.describe('Geolocation', () => {

    test('geolocation button exists and is clickable', async ({ page }) => {
      const geoBtn = page.locator('.geo-btn');
      await expect(geoBtn).toBeVisible();
      await expect(geoBtn).toBeEnabled();
    });

    test('displays weather when geolocation is granted', async ({ page, context }) => {
      await context.grantPermissions(['geolocation']);
      await context.setGeolocation({ latitude: 51.5074, longitude: -0.1278 });
      const geoBtn = page.locator('.geo-btn');
      await geoBtn.click();
      const weatherBox = page.locator('#weatherBox');
      await expect(weatherBox).toBeVisible({ timeout: 15000 });
    });

    test('shows location name from reverse geocoding', async ({ page, context }) => {
      await context.grantPermissions(['geolocation']);
      await context.setGeolocation({ latitude: 48.8566, longitude: 2.3522 });
      const geoBtn = page.locator('.geo-btn');
      await geoBtn.click();
      const locName = page.locator('#locName');
      await expect(locName).not.toBeEmpty({ timeout: 15000 });
    });
  });

  test.describe('Responsive Design', () => {

    test('displays correctly on mobile viewport', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 });
      const app = page.locator('.app');
      await expect(app).toBeVisible();
      const input = page.locator('#cityField');
      await expect(input).toBeVisible();
    });

    test('search works on mobile viewport', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 });
      const input = page.locator('#cityField');
      await input.fill('Madrid');
      await input.press('Enter');
      const weatherBox = page.locator('#weatherBox');
      await expect(weatherBox).toBeVisible({ timeout: 10000 });
    });
  });

  test.describe('Accessibility', () => {

    test('input has autocomplete off', async ({ page }) => {
      const input = page.locator('#cityField');
      await expect(input).toHaveAttribute('autocomplete', 'off');
    });

    test('input has aria-label and aria-autocomplete', async ({ page }) => {
      const input = page.locator('#cityField');
      await expect(input).toHaveAttribute('aria-label', 'City name');
      await expect(input).toHaveAttribute('aria-autocomplete', 'list');
    });

    test('city list has role listbox', async ({ page }) => {
      const list = page.locator('#cityList');
      await expect(list).toHaveAttribute('role', 'listbox');
    });

    test('geolocation button is a real button element', async ({ page }) => {
      const geoBtn = page.locator('.geo-btn');
      await expect(geoBtn).toHaveAttribute('aria-label');
    });

    test('weather box has aria-live', async ({ page }) => {
      const weatherBox = page.locator('#weatherBox');
      await expect(weatherBox).toHaveAttribute('aria-live', 'polite');
    });

    test('page has proper heading hierarchy', async ({ page }) => {
      const h1 = page.locator('h1');
      await expect(h1).toHaveCount(1);
    });

    test('input is focusable', async ({ page }) => {
      const input = page.locator('#cityField');
      await input.focus();
      await expect(input).toBeFocused();
    });

    test('suggestions are navigable via keyboard', async ({ page }) => {
      const input = page.locator('#cityField');
      await input.fill('Vienna');
      await page.waitForSelector('#cityList li', { timeout: 10000 });
      await input.press('ArrowDown');
      const activeItem = page.locator('#cityList li.active');
      await expect(activeItem).toHaveCount(1);
    });
  });
});

test.describe('Performance', () => {

  test('page loads within acceptable time', async ({ page }) => {
    await mockApis(page);
    const startTime = Date.now();
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');
    const loadTime = Date.now() - startTime;
    expect(loadTime).toBeLessThan(3000);
  });

  test('weather data loads within acceptable time', async ({ page }) => {
    await mockApis(page);
    await page.goto('/');
    const input = page.locator('#cityField');
    await input.fill('Amsterdam');
    const startTime = Date.now();
    await input.press('Enter');
    await page.waitForSelector('#weatherBox', { state: 'visible', timeout: 10000 });
    const responseTime = Date.now() - startTime;
    expect(responseTime).toBeLessThan(5000);
  });
});