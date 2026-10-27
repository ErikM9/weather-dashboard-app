import AxeBuilder from '@axe-core/playwright';
import { test, expect } from './support/fixtures.js';
import { blend, contrastRatio, pixelAt } from './support/contrast.js';

/* The raindrops are paused for the scan, as their blurred animation can starve it of time on a busy machine */
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

  /* Placeholders are left out of axe's contrast check, so the placeholder's colour is laid over the field as painted */
  test('keeps the placeholder at the AA contrast minimum on its field, focused or not, before and after a search', async ({ dashboard, page }) => {
    const placeholder = await page.evaluate(() => {
      const rule = [...document.styleSheets]
        .flatMap((sheet) => [...sheet.cssRules])
        .find((cssRule) => cssRule.selectorText?.startsWith('#cityField::') && cssRule.selectorText.includes('placeholder'));
      return rule.style.color.match(/[\d.]+/g).map(Number);
    });
    /* The rain goes and the field's transition is switched off, so the pixel read is the field's own settled colour */
    await page.addStyleTag({ content: '.rain-bg { display: none; } #cityField { transition: none; } #cityField::placeholder { color: transparent; }' });
    const fieldColours = async () => {
      const box = await dashboard.input.boundingBox();
      const fieldColour = () => pixelAt(page, box.x + box.width * 0.9, box.y + box.height / 2);
      await dashboard.input.blur();
      const resting = await fieldColour();
      await dashboard.input.focus();
      return [resting, await fieldColour()];
    };

    const beforeSearch = await fieldColours();
    /* The weather card makes the panel taller, which moves the field over a lighter part of the background */
    await dashboard.searchFor('London');
    await expect(dashboard.weatherBox).toBeVisible();
    await dashboard.input.clear();
    const afterSearch = await fieldColours();

    for (const field of [...beforeSearch, ...afterSearch]) {
      expect(contrastRatio(blend(placeholder, field), field)).toBeGreaterThanOrEqual(4.5);
    }
  });

  test('tells assistive technology when the list of suggestions opens', async ({ dashboard }) => {
    await expect(dashboard.input).toHaveAttribute('aria-expanded', 'false');

    await dashboard.typeCity('London');

    await expect(dashboard.suggestions).toHaveCount(3);
    await expect(dashboard.input).toHaveAttribute('aria-expanded', 'true');
  });

  test('announces the highlighted suggestion through the combobox', async ({ dashboard }) => {
    await dashboard.typeCity('London');
    await expect(dashboard.suggestions).toHaveCount(3);

    await dashboard.input.press('ArrowDown');

    const optionId = await dashboard.suggestions.first().getAttribute('id');
    await expect(dashboard.input).toHaveAttribute('aria-activedescendant', optionId);
    await expect(dashboard.highlightedSuggestion).toHaveText('London, United Kingdom');
  });

  test('keeps the weather card as a labelled live region', async ({ dashboard }) => {
    await dashboard.searchFor('London');

    await expect(dashboard.weatherBox).toHaveAttribute('aria-live', 'polite');
  });

  test("starts the location button's accessible name with the words it shows", async ({ dashboard }) => {
    await expect(dashboard.page.getByRole('button', { name: /^How's the weather outside\? / })).toBeVisible();
  });

  test('reaches the search field and the location button by keyboard alone', async ({ dashboard, page }) => {
    await page.keyboard.press('Tab');
    await expect(dashboard.input).toBeFocused();

    await page.keyboard.press('Tab');
    await expect(dashboard.geoButton).toBeFocused();
  });
});