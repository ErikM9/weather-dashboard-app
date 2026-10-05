/* Page model for the dashboard, holding the locators and the actions while assertions stay in the specs */
export class Dashboard {
  constructor(page, api) {
    this.page = page;
    this.api = api;
    this.heading = page.locator('h1');
    this.input = page.locator('#cityField');
    this.suggestionList = page.locator('#cityList');
    this.suggestions = page.locator('#cityList li');
    this.activeSuggestion = page.locator('#cityList li.active');
    this.geoButton = page.locator('#geoBtn');
    this.spinner = page.locator('#spinner');
    this.weatherBox = page.locator('#weatherBox');
    this.location = page.locator('#locName');
    this.condition = page.locator('#cond');
    this.temperature = page.locator('#temp');
    this.feelsLike = page.locator('#feel');
    this.humidity = page.locator('#humid');
    this.windSpeed = page.locator('#windSpd');
    this.raindrops = page.locator('.rain-bg .drop');
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

  suggestionTexts() {
    return this.suggestions.allTextContents();
  }

  searchRequests() {
    return this.api.requests.filter((url) => url.startsWith('https://geocoding-api.open-meteo.com'));
  }

  weatherRequests() {
    return this.api.requests.filter((url) => url.startsWith('https://api.open-meteo.com'));
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