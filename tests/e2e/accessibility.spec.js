import AxeBuilder from '@axe-core/playwright';
import { test, expect } from './support/fixtures.js';

/* The fifty raindrops are held still for the scan: their blurred, endlessly animated layers are the costliest
   thing on the page to draw, and on a slow or busy machine they can starve the scan of the time it needs */
const scan = async (page) => {
  await page.evaluate(() => document.getAnimations().forEach((animation) => animation.pause()));

  const { violations } = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
    .analyze();

  return violations.map((violation) => `${violation.id}: ${violation.help}`);
};

test.describe('Accessibility', () => {
  test('passes an automated WCAG 2.1 A and AA scan on load', async ({ dashboard, page }) => {
    await expect(dashboard.input).toBeVisible();

    expect(await scan(page)).toEqual([]);
  });

  test('passes the same scan while the suggestions are open', async ({ dashboard, page }) => {
    await dashboard.typeCity('London');
    await expect(dashboard.suggestions).toHaveCount(3);

    expect(await scan(page)).toEqual([]);
  });

  test('passes the same scan once the weather is on screen', async ({ dashboard, page }) => {
    await dashboard.searchFor('London');
    await expect(dashboard.weatherBox).toBeVisible();

    expect(await scan(page)).toEqual([]);
  });

  test('exposes the search field as a combobox that reports whether it is open', async ({ dashboard }) => {
    await expect(dashboard.input).toHaveAttribute('role', 'combobox');
    await expect(dashboard.input).toHaveAttribute('aria-expanded', 'false');

    await dashboard.typeCity('London');

    await expect(dashboard.input).toHaveAttribute('aria-expanded', 'true');
  });

  test('announces the highlighted suggestion through the combobox', async ({ dashboard }) => {
    await dashboard.typeCity('London');
    await expect(dashboard.suggestions).toHaveCount(3);
    await dashboard.input.press('ArrowDown');

    const optionId = await dashboard.suggestions.nth(0).getAttribute('id');
    await expect(dashboard.input).toHaveAttribute('aria-activedescendant', optionId);
    await expect(dashboard.suggestions.nth(0)).toHaveAttribute('aria-selected', 'true');
    await expect(dashboard.suggestions.nth(1)).toHaveAttribute('aria-selected', 'false');
  });

  test('presents every suggestion as an option of the listbox', async ({ dashboard }) => {
    await dashboard.typeCity('London');

    await expect(dashboard.suggestionList).toHaveAttribute('role', 'listbox');
    await expect(dashboard.suggestions.nth(0)).toHaveAttribute('role', 'option');
  });

  test('keeps the weather card as a labelled live region', async ({ dashboard }) => {
    await expect(dashboard.weatherBox).toHaveAttribute('aria-live', 'polite');
    await expect(dashboard.weatherBox).toHaveAttribute('role', 'region');
  });

  test('reaches the search field and the location button by keyboard alone', async ({ dashboard, page }) => {
    await page.keyboard.press('Tab');
    await expect(dashboard.input).toBeFocused();

    await page.keyboard.press('Tab');
    await expect(dashboard.geoButton).toBeFocused();
  });
});