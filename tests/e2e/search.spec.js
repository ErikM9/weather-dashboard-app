import { test, expect, LONDON_UK, LONDON_CA, LONDONDERRY, PARIS } from './support/fixtures.js';

test.describe('City search', () => {
  test('suggests the cities that match what was typed', async ({ dashboard }) => {
    await dashboard.typeCity('London');

    await expect(dashboard.suggestions).toHaveText([
      'London, United Kingdom',
      'London, Canada',
      'Londonderry, United Kingdom'
    ]);
  });

  test('shows no more than three suggestions', async ({ dashboard, api }) => {
    api.citiesByQuery.london = [LONDON_UK, LONDON_CA, LONDONDERRY, PARIS, { ...PARIS, country: 'Texas' }];

    await dashboard.typeCity('London');

    await expect(dashboard.suggestions).toHaveCount(3);
  });

  test('leaves out repeats of the same city and country', async ({ dashboard, api }) => {
    api.citiesByQuery.london = [LONDON_UK, { ...LONDON_UK, latitude: 51.6 }, LONDON_CA];

    await dashboard.typeCity('London');

    await expect(dashboard.suggestions).toHaveText(['London, United Kingdom', 'London, Canada']);
  });

  /* The page's clock is paused while the city is typed, so the keys count as one burst however slowly they arrive */
  test('sends one search for a burst of typing rather than one per key', async ({ dashboard, api, page }) => {
    await page.clock.install();
    await page.clock.pauseAt(Date.now() + 60_000);

    await dashboard.typeCity('London');
    expect(api.searches()).toHaveLength(0);

    await page.clock.runFor(500);
    await expect(dashboard.suggestions).toHaveCount(3);

    expect(api.searches()).toHaveLength(1);
    expect(api.searches()[0]).toContain('name=London');
  });

  test('ignores a slow earlier search that arrives after a newer one', async ({ dashboard, api }) => {
    api.citiesByQuery = { lond: [PARIS], london: [LONDON_UK] };
    const releaseFirstSearch = api.holdNextSearch();
    await dashboard.typeCity('Lond');
    await expect.poll(() => api.searches()).toHaveLength(1);
    await dashboard.typeCity('on');
    await expect(dashboard.suggestions).toHaveText(['London, United Kingdom']);

    releaseFirstSearch();
    await dashboard.waitForAnswerTo('Lond');

    await expect(dashboard.suggestions).toHaveText(['London, United Kingdom']);
  });

  test('closes the dropdown when the field is cleared', async ({ dashboard }) => {
    await dashboard.typeCity('London');
    await expect(dashboard.suggestions).toHaveCount(3);

    await dashboard.input.clear();

    await expect(dashboard.suggestions).toHaveCount(0);
    await expect(dashboard.input).toHaveAttribute('aria-expanded', 'false');
  });

  test('closes the dropdown when the page is clicked elsewhere', async ({ dashboard }) => {
    await dashboard.typeCity('London');
    await expect(dashboard.suggestions).toHaveCount(3);

    await dashboard.heading.click();

    await expect(dashboard.suggestions).toHaveCount(0);
  });

  test('shows the weather of the suggestion that was chosen', async ({ dashboard }) => {
    await dashboard.typeCity('Paris');
    await dashboard.pickSuggestion();

    await expect(dashboard.input).toHaveValue('Paris, France');
    await expect(dashboard.location).toHaveText('Paris, France');
    await expect(dashboard.temperature).toHaveText('Temperature: 9.1 °C');
    await expect(dashboard.suggestions).toHaveCount(0);
  });
});