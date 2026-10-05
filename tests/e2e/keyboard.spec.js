import { test, expect } from './support/fixtures.js';

test.describe('Keyboard navigation', () => {
  test.beforeEach(async ({ dashboard }) => {
    await dashboard.typeCity('London');
    await expect(dashboard.suggestions).toHaveCount(3);
  });

  test('moves down the list with ArrowDown', async ({ dashboard }) => {
    await dashboard.input.press('ArrowDown');
    await expect(dashboard.suggestions.nth(0)).toHaveClass(/active/);

    await dashboard.input.press('ArrowDown');
    await expect(dashboard.suggestions.nth(1)).toHaveClass(/active/);
    await expect(dashboard.activeSuggestion).toHaveCount(1);
  });

  test('starts at the last suggestion when ArrowUp is pressed first', async ({ dashboard }) => {
    await dashboard.input.press('ArrowUp');

    await expect(dashboard.suggestions.nth(2)).toHaveClass(/active/);
  });

  test('wraps around at both ends of the list', async ({ dashboard }) => {
    await dashboard.input.press('ArrowDown');
    await dashboard.input.press('ArrowUp');
    await expect(dashboard.suggestions.nth(2)).toHaveClass(/active/);

    await dashboard.input.press('ArrowDown');
    await expect(dashboard.suggestions.nth(0)).toHaveClass(/active/);
  });

  test('opens the highlighted suggestion with Enter', async ({ dashboard }) => {
    await dashboard.input.press('ArrowDown');
    await dashboard.input.press('ArrowDown');
    await dashboard.input.press('Enter');

    await expect(dashboard.location).toHaveText('London, Canada');
  });

  /* On a slow machine a search can answer while the arrow keys are in use, and the refreshed list must not undo the highlight */
  test('keeps the highlight when a slower answer refreshes the list', async ({ dashboard, api }) => {
    const firstOption = await dashboard.suggestions.nth(0).elementHandle();
    api.searchDelays.push(400);

    await dashboard.input.press('End');
    await dashboard.input.press('Space');
    await dashboard.input.press('ArrowDown');
    await dashboard.input.press('ArrowDown');
    await firstOption.waitForElementState('hidden');
    await dashboard.input.press('Enter');

    await expect(dashboard.location).toHaveText('London, Canada');
  });

  test('searches for the typed text when nothing is highlighted', async ({ dashboard }) => {
    await dashboard.input.press('Enter');

    await expect(dashboard.location).toHaveText('London, United Kingdom');
    expect(dashboard.searchRequests().at(-1)).toContain('count=1');
  });

  test('closes the dropdown with Escape', async ({ dashboard }) => {
    await dashboard.input.press('Escape');

    await expect(dashboard.suggestions).toHaveCount(0);
    await expect(dashboard.input).toHaveAttribute('aria-expanded', 'false');
  });

  /* Escape pressed while the typing pause is still running has to win over the search that pause was about to start */
  test('keeps the dropdown closed when Escape follows typing straight away', async ({ dashboard }) => {
    await dashboard.input.press('End');
    await dashboard.input.press('Space');
    await dashboard.input.press('Escape');

    await dashboard.page.waitForTimeout(600);
    await expect(dashboard.suggestions).toHaveCount(0);
  });
});