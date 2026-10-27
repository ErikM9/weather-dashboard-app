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

  /* A card shown on a wide window has to be fitted again when the window narrows, or its place name runs past its edge */
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
});