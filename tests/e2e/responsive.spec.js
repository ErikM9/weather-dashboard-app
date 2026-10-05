import { test, expect } from './support/fixtures.js';

const SCREENS = [
  { name: 'small phone', width: 320, height: 568 },
  { name: 'phone', width: 375, height: 667 },
  { name: 'tablet', width: 768, height: 1024 }
];

const horizontalOverflow = (page) => page.evaluate(() =>
  document.documentElement.scrollWidth - document.documentElement.clientWidth);

test.describe('Responsive layout', () => {
  for (const { name, width, height } of SCREENS) {
    test(`fits the page within a ${name} screen (${width}x${height})`, async ({ dashboard, page }) => {
      await page.setViewportSize({ width, height });
      await dashboard.searchFor('London');
      await expect(dashboard.weatherBox).toBeVisible();

      expect(await horizontalOverflow(page)).toBe(0);
    });
  }

  /* The card is fitted to the screen it is shown on, so it has to be fitted again when the window narrows, as when a
     phone is picked in a browser's device toolbar, or the place name runs out past the card */
  test('keeps the place name inside the card when the window narrows after it is shown', async ({ dashboard, page }) => {
    await page.setViewportSize({ width: 768, height: 1024 });
    await dashboard.searchFor('Oxford');
    await expect(dashboard.location).toHaveText('Oxford, United Kingdom');

    await page.setViewportSize({ width: 375, height: 667 });

    await expect.poll(() => dashboard.location.evaluate((heading) => {
      const box = heading.getBoundingClientRect();
      const range = document.createRange();
      range.selectNodeContents(heading);
      const text = range.getBoundingClientRect();
      return text.left >= box.left - 0.5 && text.right <= box.right + 0.5;
    })).toBe(true);
  });

  test('searches and shows the weather on a phone screen', async ({ dashboard, page }) => {
    await page.setViewportSize({ width: 375, height: 667 });

    await dashboard.typeCity('London');
    await dashboard.pickSuggestion();

    await expect(dashboard.location).toHaveText('London, United Kingdom');
  });
});