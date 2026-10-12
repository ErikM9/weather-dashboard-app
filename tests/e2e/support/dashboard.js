/* Page model for the dashboard, holding the locators and the actions while assertions stay in the specs */
export class Dashboard {
  constructor(page) {
    this.page = page;
    this.heading = page.getByRole('heading', { level: 1 });
    this.input = page.getByRole('combobox', { name: 'City name' });
    this.suggestionList = page.getByRole('listbox', { name: 'City suggestions' });
    this.suggestions = this.suggestionList.getByRole('option');
    this.highlightedSuggestion = this.suggestionList.getByRole('option', { selected: true });
    this.markedSuggestions = this.suggestionList.locator('[data-marked]');
    this.geoButton = page.getByRole('button', { name: "How's the weather outside?" });
    this.spinner = page.locator('#spinner');
    this.weatherBox = page.getByRole('region', { name: 'Weather information' });
    this.location = this.weatherBox.getByRole('heading', { level: 2 });
    this.condition = page.locator('#cond');
    this.temperature = page.locator('#temp');
    this.feelsLike = page.locator('#feel');
    this.humidity = page.locator('#humid');
    this.windSpeed = page.locator('#windSpd');
  }

  /* Types a character at a time so the debounce behaves as it does for a real person */
  async typeCity(city) {
    await this.input.pressSequentially(city, { delay: 30 });
  }

  async searchFor(city) {
    await this.typeCity(city);
    await this.input.press('Enter');
  }

  async pickSuggestion(index = 0) {
    await this.suggestions.nth(index).click();
  }

  /* Marks the options on screen, so a spec can wait for a refreshed list to replace them */
  async markSuggestions() {
    await this.suggestions.evaluateAll((options) => options.forEach((option) => option.setAttribute('data-marked', '')));
  }

  /* Waits until the page has the whole answer to a search, which is when a late answer would show itself */
  async waitForAnswerTo(query) {
    await this.page.waitForFunction((name) => performance.getEntriesByType('resource')
      .some((entry) => entry.name.includes(`name=${name}&`)), query);
  }

  /* Returns the message of the next alert the page opens while the action runs */
  async alertFrom(action) {
    const message = this.nextAlert();
    await action();
    return message;
  }

  /* Dismisses the alert the moment it opens, because an open dialog blocks whatever triggered it */
  nextAlert() {
    return new Promise((resolve) => {
      this.page.once('dialog', (dialog) => {
        resolve(dialog.message());
        dialog.dismiss();
      });
    });
  }
}