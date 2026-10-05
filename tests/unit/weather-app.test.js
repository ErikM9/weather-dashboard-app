import { jest } from '@jest/globals';
import { WeatherApp } from '../../src/scripts.js';
import { renderPage, pageElements, suggestionTexts } from '../support/page.js';
import {
  mockApi,
  jsonResponse,
  failedRequest,
  deferred,
  GEOCODING_ORIGIN,
  WEATHER_ORIGIN,
  REVERSE_ORIGIN,
  LONDON_UK,
  LONDON_CA,
  LONDONDERRY,
  PARIS,
  SUNNY_WEATHER,
  OXFORD_ADDRESS
} from '../support/api-mock.js';

const cityResults = (...cities) => jsonResponse({ results: cities });

describe('WeatherApp', () => {
  let app;
  let elements;

  beforeEach(() => {
    renderPage();
    elements = pageElements();
    app = new WeatherApp(elements);
  });

  describe('clearList', () => {
    it('empties the dropdown and tells the combobox it is closed', () => {
      app.renderCityList([LONDON_UK]);

      app.clearList();

      expect(elements.list.children).toHaveLength(0);
      expect(app.selIndex).toBe(-1);
      expect(elements.input).not.toHaveClass('show');
      expect(elements.input).toHaveAttribute('aria-expanded', 'false');
      expect(elements.input).not.toHaveAttribute('aria-activedescendant');
    });
  });

  describe('renderCityList', () => {
    it('renders each city as a listbox option with its coordinates attached', () => {
      app.renderCityList([LONDON_UK, PARIS]);

      const items = elements.list.querySelectorAll('li');
      expect(suggestionTexts()).toEqual(['London, United Kingdom', 'Paris, France']);
      expect(items[0]).toHaveAttribute('role', 'option');
      expect(items[0]).toHaveAttribute('aria-selected', 'false');
      expect(items[0].id).toBeTruthy();
      expect(items[0].id).not.toBe(items[1].id);
      expect(items[0].dataset).toMatchObject({
        lat: '51.5074',
        lon: '-0.1278',
        name: 'London',
        country: 'United Kingdom'
      });
      expect(elements.input).toHaveClass('show');
      expect(elements.input).toHaveAttribute('aria-expanded', 'true');
    });

    it('keeps the highlighted city when a refreshed list still offers it', () => {
      app.renderCityList([LONDON_UK, LONDON_CA, LONDONDERRY]);
      app.selIndex = 1;

      app.renderCityList([LONDON_CA, LONDON_UK]);

      expect(app.selIndex).toBe(0);
      expect(elements.list.children[0]).toHaveClass('active');
      expect(elements.input).toHaveAttribute('aria-activedescendant', 'city-option-0');
    });

    it('drops the highlight when the refreshed list no longer offers that city', () => {
      app.renderCityList([LONDON_UK, LONDON_CA]);
      app.selIndex = 1;

      app.renderCityList([LONDON_UK, LONDONDERRY]);

      expect(app.selIndex).toBe(-1);
      expect(elements.input).not.toHaveAttribute('aria-activedescendant');
    });

    it('leaves the combobox closed when there are no cities', () => {
      app.renderCityList([]);

      expect(elements.list.children).toHaveLength(0);
      expect(elements.input).not.toHaveClass('show');
      expect(elements.input).toHaveAttribute('aria-expanded', 'false');
    });
  });

  describe('highlight', () => {
    beforeEach(() => {
      app.renderCityList([LONDON_UK, LONDON_CA, LONDONDERRY]);
    });

    it('marks the selected option and points the combobox at it', () => {
      app.selIndex = 1;

      app.highlight();

      const items = elements.list.querySelectorAll('li');
      expect(items[1]).toHaveClass('active');
      expect(items[1]).toHaveAttribute('aria-selected', 'true');
      expect(items[0]).not.toHaveClass('active');
      expect(items[0]).toHaveAttribute('aria-selected', 'false');
      expect(elements.input).toHaveAttribute('aria-activedescendant', items[1].id);
    });

    it('clears the selection when nothing is highlighted', () => {
      app.selIndex = 1;
      app.highlight();

      app.selIndex = -1;
      app.highlight();

      expect(elements.list.querySelectorAll('li.active')).toHaveLength(0);
      expect(elements.input).not.toHaveAttribute('aria-activedescendant');
    });
  });

  describe('loading state', () => {
    it('shows the spinner instead of the previous weather, then hides it again', () => {
      elements.weatherBox.style.display = 'block';

      app.showLoading();
      expect(elements.loader.style.display).toBe('block');
      expect(elements.weatherBox.style.display).toBe('none');

      app.hideLoading();
      expect(elements.loader.style.display).toBe('none');
    });
  });

  describe('displayWeather', () => {
    it('writes every line onto the card and reveals it', () => {
      app.displayWeather({
        location: 'London, United Kingdom',
        condition: '☀️ Sunny',
        temperature: 'Temperature: 22.5 °C',
        feelsLike: 'Feels Like: 21 °C',
        humidity: 'Humidity: 65%',
        windSpeed: 'Wind Speed: 3.4 m/s'
      });

      expect(elements.locName).toHaveTextContent('London, United Kingdom');
      expect(elements.cond).toHaveTextContent('☀️ Sunny');
      expect(elements.temp).toHaveTextContent('Temperature: 22.5 °C');
      expect(elements.feel).toHaveTextContent('Feels Like: 21 °C');
      expect(elements.humid).toHaveTextContent('Humidity: 65%');
      expect(elements.windSpd).toHaveTextContent('Wind Speed: 3.4 m/s');
      expect(elements.weatherBox.style.display).toBe('block');
    });
  });

  describe('refitCard', () => {
    it('fits a card that is showing to the window again', () => {
      const fit = jest.spyOn(app, 'fitCard').mockImplementation(() => {});
      elements.weatherBox.style.display = 'block';

      app.refitCard();

      expect(fit).toHaveBeenCalledTimes(1);
    });

    it('sets the place name out afresh first, so its two runs are back however the last pass left them', () => {
      jest.spyOn(app, 'fitCard').mockImplementation(() => {});
      elements.weatherBox.style.display = 'block';
      elements.locName.textContent = 'Abingdon-on-Thames, United Kingdom';

      app.refitCard();

      expect(Array.from(elements.locName.children, (run) => run.textContent)).toEqual(['Abingdon-on-Thames,', 'United Kingdom']);
    });

    it('leaves a card that is not showing alone', () => {
      const fit = jest.spyOn(app, 'fitCard').mockImplementation(() => {});
      elements.weatherBox.style.display = 'none';

      app.refitCard();

      expect(fit).not.toHaveBeenCalled();
    });
  });

  describe('searchCities', () => {
    it('asks for nothing when the query is empty', async () => {
      const api = mockApi({ geocoding: cityResults(LONDON_UK) });

      expect(await app.searchCities('')).toEqual([]);
      expect(api.requests).toHaveLength(0);
    });

    it('requests up to ten matches and escapes the query', async () => {
      const api = mockApi({ geocoding: cityResults(LONDON_UK) });

      await app.searchCities('São Paulo');

      expect(api.urlFor(GEOCODING_ORIGIN)).toContain('name=S%C3%A3o%20Paulo');
      expect(api.urlFor(GEOCODING_ORIGIN)).toContain('count=10');
    });

    it('returns at most three suggestions', async () => {
      mockApi({ geocoding: cityResults(LONDON_UK, LONDON_CA, LONDONDERRY, PARIS, { ...PARIS, country: 'Texas' }) });

      expect(await app.searchCities('london')).toHaveLength(3);
    });

    it('drops repeats of the same city and country', async () => {
      mockApi({ geocoding: cityResults(LONDON_UK, { ...LONDON_UK, latitude: 51.6 }, LONDON_CA) });

      const cities = await app.searchCities('london');

      expect(cities.map((c) => `${c.name}, ${c.country}`)).toEqual(['London, United Kingdom', 'London, Canada']);
    });

    it('puts cities starting with the query ahead of partial matches', async () => {
      mockApi({ geocoding: cityResults({ ...LONDON_UK, name: 'New London' }, LONDON_UK) });

      const cities = await app.searchCities('london');

      expect(cities[0].name).toBe('London');
    });

    it.each([
      ['the request fails', failedRequest],
      ['the API answers with an error status', () => jsonResponse({ error: true }, 500)]
    ])('returns no suggestions when %s', async (_label, geocoding) => {
      mockApi({ geocoding });

      expect(await app.searchCities('london')).toEqual([]);
    });
  });

  describe('updateSuggestions', () => {
    it('renders what the search returned', async () => {
      mockApi({ geocoding: cityResults(LONDON_UK, LONDON_CA) });

      await app.updateSuggestions('london');

      expect(suggestionTexts()).toEqual(['London, United Kingdom', 'London, Canada']);
    });

    it('closes the dropdown when nothing matches', async () => {
      mockApi({ geocoding: cityResults() });
      app.renderCityList([LONDON_UK]);

      await app.updateSuggestions('nowhere');

      expect(elements.list.children).toHaveLength(0);
      expect(elements.input).toHaveAttribute('aria-expanded', 'false');
    });

    it('ignores a slow earlier search that finishes after a newer one', async () => {
      const slow = deferred();
      global.fetch = jest.fn((url) => (url.includes('name=Lo&') ? slow.promise : Promise.resolve(cityResults(LONDON_UK))));

      const stale = app.updateSuggestions('Lo');
      const current = app.updateSuggestions('London');
      await current;
      slow.resolve(cityResults(PARIS));

      expect(await stale).toBe(false);
      expect(suggestionTexts()).toEqual(['London, United Kingdom']);
    });

    it('drops an answer that arrives after the dropdown was closed', async () => {
      const slow = deferred();
      global.fetch = jest.fn(() => slow.promise);

      const pending = app.updateSuggestions('London');
      app.clearList();
      slow.resolve(cityResults(LONDON_UK));

      expect(await pending).toBe(false);
      expect(elements.list.children).toHaveLength(0);
      expect(elements.input).toHaveAttribute('aria-expanded', 'false');
    });
  });

  describe('showWeather', () => {
    it('shows the card and asks the API for wind in metres per second', async () => {
      const api = mockApi({ weather: jsonResponse(SUNNY_WEATHER) });

      const shown = await app.showWeather(51.5074, -0.1278, 'London', 'United Kingdom');

      expect(shown).toBe(true);
      expect(api.urlFor(WEATHER_ORIGIN)).toContain('latitude=51.5074&longitude=-0.1278');
      expect(api.urlFor(WEATHER_ORIGIN)).toContain('wind_speed_unit=ms');
      expect(elements.locName).toHaveTextContent('London, United Kingdom');
      expect(elements.windSpd).toHaveTextContent('Wind Speed: 3.4 m/s');
      expect(elements.weatherBox.style.display).toBe('block');
    });

    it('warns when the payload carries no current conditions', async () => {
      mockApi({ weather: jsonResponse({}) });

      expect(await app.showWeather(0, 0, 'Nowhere', '')).toBe(false);
      expect(window.alert).toHaveBeenCalledWith('Weather unavailable');
      expect(elements.weatherBox.style.display).not.toBe('block');
    });

    it.each([
      ['the request fails', failedRequest],
      ['the API answers with an error status', () => jsonResponse({}, 503)]
    ])('warns when %s', async (_label, weather) => {
      mockApi({ weather });

      expect(await app.showWeather(51.5, -0.1, 'London', 'United Kingdom')).toBe(false);
      expect(window.alert).toHaveBeenCalledWith('Failed to retrieve data');
    });
  });

  describe('fetchWeatherByCity', () => {
    it.each([['an empty field', ''], ['a field of spaces', '   ']])('does nothing for %s', async (_label, value) => {
      const api = mockApi({ geocoding: cityResults(LONDON_UK) });
      elements.input.value = value;

      await app.fetchWeatherByCity();

      expect(api.requests).toHaveLength(0);
      expect(elements.loader.style.display).toBe('none');
    });

    it('looks up a single match, shows its weather and hides the spinner', async () => {
      const api = mockApi({ geocoding: cityResults(PARIS), weather: jsonResponse(SUNNY_WEATHER) });
      elements.input.value = 'Paris';

      const pending = app.fetchWeatherByCity();
      expect(elements.loader.style.display).toBe('block');

      expect(await pending).toBe(true);
      expect(api.urlFor(GEOCODING_ORIGIN)).toContain('count=1');
      expect(api.urlFor(WEATHER_ORIGIN)).toContain('latitude=48.8566&longitude=2.3522');
      expect(elements.locName).toHaveTextContent('Paris, France');
      expect(elements.loader.style.display).toBe('none');
    });

    it('closes the dropdown while it searches', async () => {
      mockApi({ geocoding: cityResults(PARIS), weather: jsonResponse(SUNNY_WEATHER) });
      app.renderCityList([LONDON_UK]);
      elements.input.value = 'Paris';

      await app.fetchWeatherByCity();

      expect(elements.list.children).toHaveLength(0);
    });

    it('warns when the city is not in the geocoding results', async () => {
      mockApi({ geocoding: cityResults() });
      elements.input.value = 'nowhereville';

      expect(await app.fetchWeatherByCity()).toBe(false);
      expect(window.alert).toHaveBeenCalledWith('City not found');
      expect(elements.loader.style.display).toBe('none');
    });

    it.each([
      ['the lookup fails', failedRequest],
      ['the lookup answers with an error status', () => jsonResponse({ error: true }, 500)]
    ])('warns that loading failed when %s', async (_label, geocoding) => {
      mockApi({ geocoding });
      elements.input.value = 'London';

      expect(await app.fetchWeatherByCity()).toBe(false);
      expect(window.alert).toHaveBeenCalledWith('Failed to load weather');
      expect(elements.loader.style.display).toBe('none');
    });
  });

  describe('fetchWeatherByLocation', () => {
    const allowPosition = (coords) =>
      navigator.geolocation.getCurrentPosition.mockImplementation((success) => success({ coords }));

    it('warns when the browser has no geolocation', async () => {
      const original = navigator.geolocation;
      Object.defineProperty(navigator, 'geolocation', { value: null, writable: true });

      expect(await app.fetchWeatherByLocation()).toBe(false);
      expect(window.alert).toHaveBeenCalledWith('Geolocation not supported');

      Object.defineProperty(navigator, 'geolocation', { value: original, writable: true });
    });

    it('names the place from reverse geocoding and uses the device coordinates', async () => {
      const api = mockApi({ reverse: jsonResponse(OXFORD_ADDRESS), weather: jsonResponse(SUNNY_WEATHER) });
      allowPosition({ latitude: 51.75, longitude: -1.26 });

      expect(await app.fetchWeatherByLocation()).toBe(true);
      expect(api.urlFor(REVERSE_ORIGIN)).toContain('lat=51.75&lon=-1.26');
      expect(api.urlFor(WEATHER_ORIGIN)).toContain('latitude=51.75&longitude=-1.26');
      expect(elements.locName).toHaveTextContent('Oxford, United Kingdom');
      expect(elements.loader.style.display).toBe('none');
    });

    it('still shows the weather when reverse geocoding fails', async () => {
      mockApi({ reverse: failedRequest, weather: jsonResponse(SUNNY_WEATHER) });
      allowPosition({ latitude: 51.75, longitude: -1.26 });

      expect(await app.fetchWeatherByLocation()).toBe(true);
      expect(elements.locName).toHaveTextContent('Current Location');
    });

    it('passes on the browser message when the user refuses', async () => {
      navigator.geolocation.getCurrentPosition.mockImplementation((_success, failure) =>
        failure({ message: 'User denied Geolocation' }));

      expect(await app.fetchWeatherByLocation()).toBe(false);
      expect(window.alert).toHaveBeenCalledWith('Location access denied: User denied Geolocation');
      expect(elements.loader.style.display).toBe('none');
    });
  });

  describe('handleKeydown', () => {
    const press = (key) => {
      const event = new KeyboardEvent('keydown', { key, cancelable: true });
      app.handleKeydown(event);
      return event;
    };

    beforeEach(() => {
      app.renderCityList([LONDON_UK, LONDON_CA, LONDONDERRY]);
    });

    it('moves down the list and wraps back to the first option', () => {
      press('ArrowDown');
      expect(app.selIndex).toBe(0);

      press('ArrowDown');
      press('ArrowDown');
      expect(app.selIndex).toBe(2);

      press('ArrowDown');
      expect(app.selIndex).toBe(0);
      expect(elements.list.querySelectorAll('li')[0]).toHaveClass('active');
    });

    it('moves up the list and wraps round to the last option', () => {
      press('ArrowUp');

      expect(app.selIndex).toBe(2);
      expect(elements.list.querySelectorAll('li')[2]).toHaveClass('active');
    });

    it('keeps the arrow keys from moving the text cursor', () => {
      expect(press('ArrowDown').defaultPrevented).toBe(true);
      expect(press('ArrowUp').defaultPrevented).toBe(true);
    });

    it('leaves the selection alone when the dropdown is empty', () => {
      app.clearList();

      press('ArrowDown');
      press('ArrowUp');

      expect(app.selIndex).toBe(-1);
    });

    it('opens the highlighted suggestion on Enter', () => {
      const items = elements.list.querySelectorAll('li');
      const clicked = jest.fn();
      items[1].addEventListener('click', clicked);
      app.selIndex = 1;

      press('Enter');

      expect(clicked).toHaveBeenCalled();
    });

    it('searches for the typed text on Enter when nothing is highlighted', () => {
      app.fetchWeatherByCity = jest.fn().mockResolvedValue(true);

      press('Enter');

      expect(app.fetchWeatherByCity).toHaveBeenCalled();
    });

    it('closes the dropdown on Escape', () => {
      press('Escape');

      expect(elements.list.children).toHaveLength(0);
      expect(app.selIndex).toBe(-1);
    });

    it('ignores other keys', () => {
      const event = press('a');

      expect(app.selIndex).toBe(-1);
      expect(elements.list.children).toHaveLength(3);
      expect(event.defaultPrevented).toBe(false);
    });
  });
});