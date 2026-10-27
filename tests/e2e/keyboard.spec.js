import { test, expect } from './support/fixtures.js';

test.describe('Keyboard navigation', () => {
  test.beforeEach(async ({ dashboard }) => {
    await dashboard.typeCity('London');
    await expect(dashboard.suggestions).toHaveCount(3);
  });

  test('moves down the list with ArrowDown', async ({ dashboard }) => {
    await dashboard.input.press('ArrowDown');
    await expect(dashboard.highlightedSuggestion).toHaveText('London, United Kingdom');

    await dashboard.input.press('ArrowDown');
    await expect(dashboard.highlightedSuggestion).toHaveText('London, Canada');
  });

  test('starts at the last suggestion when ArrowUp is pressed first', async ({ dashboard }) => {
    await dashboard.input.press('ArrowUp');

    await expect(dashboard.highlightedSuggestion).toHaveText('Londonderry, United Kingdom');
  });

  test('wraps around at both ends of the list', async ({ dashboard }) => {
    await dashboard.input.press('ArrowDown');
    await dashboard.input.press('ArrowUp');
    await expect(dashboard.highlightedSuggestion).toHaveText('Londonderry, United Kingdom');

    await dashboard.input.press('ArrowDown');
    await expect(dashboard.highlightedSuggestion).toHaveText('London, United Kingdom');
  });

  test('opens the highlighted suggestion with Enter', async ({ dashboard }) => {
    await dashboard.input.press('ArrowDown');
    await dashboard.input.press('ArrowDown');
    await dashboard.input.press('Enter');

    await expect(dashboard.location).toHaveText('London, Canada');
  });

  /* A search can answer while the arrow keys are in use, and the refreshed list has to keep the highlight */
  test('keeps the highlight when a late answer refreshes the list', async ({ dashboard, api }) => {
    await dashboard.markSuggestions();
    const releaseRefresh = api.holdNextSearch();
    await dashboard.input.press('End');
    await dashboard.input.press('Space');
    await expect.poll(() => api.searches()).toHaveLength(2);
    await dashboard.input.press('ArrowDown');
    await dashboard.input.press('ArrowDown');

    releaseRefresh();
    await expect(dashboard.markedSuggestions).toHaveCount(0);
    await dashboard.input.press('Enter');

    await expect(dashboard.location).toHaveText('London, Canada');
  });

  test('searches for the typed text when nothing is highlighted', async ({ dashboard, api }) => {
    await dashboard.input.press('Enter');

    await expect(dashboard.location).toHaveText('London, United Kingdom');
    expect(api.searches().at(-1)).toContain('count=1');
  });

  test('closes the dropdown with Escape', async ({ dashboard }) => {
    await dashboard.input.press('Escape');

    await expect(dashboard.suggestions).toHaveCount(0);
    await expect(dashboard.input).toHaveAttribute('aria-expanded', 'false');
  });
});