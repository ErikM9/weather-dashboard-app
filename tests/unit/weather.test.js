import { jest } from '@jest/globals';
import {
  WEATHER_DESC,
  WEATHER_ICON,
  getWeatherDescription,
  getWeatherIcon,
  formatLocation,
  createWeatherDisplay,
  parseReverseGeocodeResponse,
  createRaindrop,
  initRainEffect,
  WeatherApp
} from '../../src/scripts.js';

describe('Weather Description Mappings', () => {
  const allCodes = [0,1,2,3,45,48,51,53,55,56,57,61,63,65,66,67,71,73,75,77,80,81,82,85,86,95,96,99];

  it('WEATHER_DESC defines all 28 standard codes as strings', () => {
    allCodes.forEach(code => {
      expect(typeof WEATHER_DESC[code]).toBe('string');
    });
  });

  it('WEATHER_DESC maps key conditions correctly', () => {
    expect(WEATHER_DESC[0]).toBe('Sunny');
    expect(WEATHER_DESC[2]).toBe('Partly Cloudy');
    expect(WEATHER_DESC[3]).toBe('Cloudy');
    expect(WEATHER_DESC[61]).toBe('Light Rain');
    expect(WEATHER_DESC[65]).toBe('Heavy Rain');
    expect(WEATHER_DESC[71]).toBe('Light Snow');
    expect(WEATHER_DESC[75]).toBe('Heavy Snow');
    expect(WEATHER_DESC[95]).toBe('Thunderstorm');
    expect(WEATHER_DESC[99]).toBe('Thunderstorm + Hail');
  });

  it('WEATHER_ICON maps key conditions to correct emoji', () => {
    expect(WEATHER_ICON[0]).toBe('☀️');
    expect(WEATHER_ICON[3]).toBe('☁️');
    expect(WEATHER_ICON[61]).toBe('🌧️');
    expect(WEATHER_ICON[71]).toBe('❄️');
    expect(WEATHER_ICON[85]).toBe('🌨️');
    expect(WEATHER_ICON[95]).toBe('⛈️');
  });
});

describe('getWeatherDescription', () => {
  it('returns the correct description for known codes', () => {
    expect(getWeatherDescription(0)).toBe('Sunny');
    expect(getWeatherDescription(3)).toBe('Cloudy');
    expect(getWeatherDescription(95)).toBe('Thunderstorm');
  });

  it('returns "Unknown" for unrecognised codes', () => {
    expect(getWeatherDescription(999)).toBe('Unknown');
    expect(getWeatherDescription(-1)).toBe('Unknown');
    expect(getWeatherDescription(undefined)).toBe('Unknown');
  });
});

describe('getWeatherIcon', () => {
  it('returns the correct icon for known codes and empty string for unknown', () => {
    expect(getWeatherIcon(0)).toBe('☀️');
    expect(getWeatherIcon(3)).toBe('☁️');
    expect(getWeatherIcon(999)).toBe('');
    expect(getWeatherIcon(-1)).toBe('');
  });
});

describe('formatLocation', () => {
  it('formats with and without country', () => {
    expect(formatLocation('London', 'United Kingdom')).toBe('London, United Kingdom');
    expect(formatLocation('London', '')).toBe('London');
    expect(formatLocation('London', null)).toBe('London');
    expect(formatLocation('London', undefined)).toBe('London');
  });
});

describe('createWeatherDisplay', () => {
  const validData = {
    current: {
      weather_code: 0,
      temperature_2m: 22.5,
      apparent_temperature: 21.0,
      relative_humidity_2m: 65,
      wind_speed_10m: 12.3
    }
  };

  it('creates a correct display object from valid data', () => {
    expect(createWeatherDisplay(validData, 'London', 'UK')).toEqual({
      location: 'London, UK',
      condition: '☀️ Sunny',
      temperature: 'Temperature: 22.5 °C',
      feelsLike: 'Feels Like: 21 °C',
      humidity: 'Humidity: 65%',
      windSpeed: 'Wind Speed: 12.3 m/s'
    });
  });

  it('returns null for missing or invalid current data', () => {
    expect(createWeatherDisplay({}, 'London', 'UK')).toBeNull();
    expect(createWeatherDisplay(null, 'London', 'UK')).toBeNull();
    expect(createWeatherDisplay(undefined, 'London', 'UK')).toBeNull();
  });

  it('handles unknown weather codes, negative temperatures, and zero values', () => {
    const unknownCode = { current: { ...validData.current, weather_code: 999 } };
    expect(createWeatherDisplay(unknownCode, 'Test', 'UK').condition).toBe(' Unknown');

    const cold = { current: { ...validData.current, temperature_2m: -5.5, apparent_temperature: -8.2 } };
    const coldResult = createWeatherDisplay(cold, 'Moscow', 'Russia');
    expect(coldResult.temperature).toBe('Temperature: -5.5 °C');
    expect(coldResult.feelsLike).toBe('Feels Like: -8.2 °C');

    const zeros = { current: { weather_code: 0, temperature_2m: 0, apparent_temperature: 0, relative_humidity_2m: 0, wind_speed_10m: 0 } };
    const zeroResult = createWeatherDisplay(zeros, 'Test', '');
    expect(zeroResult.temperature).toBe('Temperature: 0 °C');
    expect(zeroResult.humidity).toBe('Humidity: 0%');
    expect(zeroResult.windSpeed).toBe('Wind Speed: 0 m/s');
  });
});

describe('parseReverseGeocodeResponse', () => {
  it('extracts city, falls back to town then village', () => {
    expect(parseReverseGeocodeResponse({ address: { city: 'London', country: 'UK' } })).toEqual({ name: 'London', country: 'UK' });
    expect(parseReverseGeocodeResponse({ address: { town: 'Oxford', country: 'UK' } })).toEqual({ name: 'Oxford', country: 'UK' });
    expect(parseReverseGeocodeResponse({ address: { village: 'Bibury', country: 'UK' } })).toEqual({ name: 'Bibury', country: 'UK' });
  });

  it('defaults to "Current Location" with empty country for missing or null input', () => {
    expect(parseReverseGeocodeResponse({ address: {} })).toEqual({ name: 'Current Location', country: '' });
    expect(parseReverseGeocodeResponse(null)).toEqual({ name: 'Current Location', country: '' });
    expect(parseReverseGeocodeResponse(undefined)).toEqual({ name: 'Current Location', country: '' });
  });
});

describe('Rain Effect', () => {
  describe('createRaindrop', () => {
    it('creates a div.drop with all properties in valid ranges', () => {
      for (let i = 0; i < 20; i++) {
        const drop = createRaindrop();
        expect(drop.tagName).toBe('DIV');
        expect(drop.className).toBe('drop');

        const left = parseFloat(drop.style.left);
        expect(drop.style.left).toMatch(/^\d+(\.\d+)?vw$/);
        expect(left).toBeGreaterThanOrEqual(0);
        expect(left).toBeLessThanOrEqual(100);

        const duration = parseFloat(drop.style.animationDuration);
        expect(drop.style.animationDuration).toMatch(/^\d+(\.\d+)?s$/);
        expect(duration).toBeGreaterThanOrEqual(0.3);
        expect(duration).toBeLessThanOrEqual(1.3);

        const delay = parseFloat(drop.style.animationDelay);
        expect(drop.style.animationDelay).toMatch(/^\d+(\.\d+)?s$/);
        expect(delay).toBeGreaterThanOrEqual(0);
        expect(delay).toBeLessThanOrEqual(2);

        const opacity = parseFloat(drop.style.opacity);
        expect(opacity).toBeGreaterThanOrEqual(0.3);
        expect(opacity).toBeLessThanOrEqual(0.8);
      }
    });
  });

  describe('initRainEffect', () => {
    it('appends the specified number of .drop children', () => {
      const container = document.createElement('div');
      initRainEffect(container, 10);
      expect(container.children.length).toBe(10);
      Array.from(container.children).forEach(c => expect(c.className).toBe('drop'));
    });

    it('defaults to 50 drops', () => {
      const container = document.createElement('div');
      initRainEffect(container);
      expect(container.children.length).toBe(50);
    });
  });
});

describe('WeatherApp Class', () => {
  let app;
  let elements;

  beforeEach(() => {
    document.body.innerHTML = `
      <input id="cityField" type="text">
      <ul id="cityList"></ul>
      <div id="spinner" style="display:none;"></div>
      <div id="weatherBox" style="display:none;">
        <h2 id="locName"></h2>
        <p id="cond"></p>
        <p id="temp"></p>
        <p id="feel"></p>
        <p id="humid"></p>
        <p id="windSpd"></p>
      </div>
    `;

    elements = {
      input: document.getElementById('cityField'),
      list: document.getElementById('cityList'),
      loader: document.getElementById('spinner'),
      weatherBox: document.getElementById('weatherBox'),
      locName: document.getElementById('locName'),
      cond: document.getElementById('cond'),
      temp: document.getElementById('temp'),
      feel: document.getElementById('feel'),
      humid: document.getElementById('humid'),
      windSpd: document.getElementById('windSpd')
    };

    app = new WeatherApp(elements);
  });

  afterEach(() => {
    document.body.innerHTML = '';
  });

  describe('clearList', () => {
    it('empties the list, resets selIndex, and removes the show class', () => {
      elements.list.innerHTML = '<li>Test</li>';
      elements.input.classList.add('show');
      app.selIndex = 2;
      app.clearList();
      expect(elements.list.innerHTML).toBe('');
      expect(app.selIndex).toBe(-1);
      expect(elements.input.classList.contains('show')).toBe(false);
    });
  });

  describe('highlight', () => {
    beforeEach(() => {
      elements.list.innerHTML = '<li>A</li><li>B</li><li>C</li>';
    });

    it('marks only the selected index as active', () => {
      app.selIndex = 1;
      app.highlight();
      const items = elements.list.querySelectorAll('li');
      expect(items[0].classList.contains('active')).toBe(false);
      expect(items[1].classList.contains('active')).toBe(true);
      expect(items[2].classList.contains('active')).toBe(false);
    });

    it('removes all active classes when selIndex is -1', () => {
      elements.list.querySelector('li').classList.add('active');
      app.selIndex = -1;
      app.highlight();
      elements.list.querySelectorAll('li').forEach(li => {
        expect(li.classList.contains('active')).toBe(false);
      });
    });
  });

  describe('showLoading / hideLoading', () => {
    it('showLoading reveals the spinner and hides the weather box', () => {
      elements.weatherBox.style.display = 'block';
      app.showLoading();
      expect(elements.loader.style.display).toBe('block');
      expect(elements.weatherBox.style.display).toBe('none');
    });

    it('hideLoading hides the spinner', () => {
      elements.loader.style.display = 'block';
      app.hideLoading();
      expect(elements.loader.style.display).toBe('none');
    });
  });

  describe('displayWeather', () => {
    it('populates all fields and shows the weather box', () => {
      const display = {
        location: 'London, UK',
        condition: '☀️ Sunny',
        temperature: 'Temperature: 22 °C',
        feelsLike: 'Feels Like: 20 °C',
        humidity: 'Humidity: 65%',
        windSpeed: 'Wind Speed: 10 m/s'
      };
      app.displayWeather(display);
      expect(elements.locName.innerText).toBe('London, UK');
      expect(elements.cond.innerHTML).toBe('☀️ Sunny');
      expect(elements.temp.innerText).toBe('Temperature: 22 °C');
      expect(elements.feel.innerText).toBe('Feels Like: 20 °C');
      expect(elements.humid.innerText).toBe('Humidity: 65%');
      expect(elements.windSpd.innerText).toBe('Wind Speed: 10 m/s');
      expect(elements.weatherBox.style.display).toBe('block');
    });
  });

  describe('renderCityList', () => {
    it('creates list items with correct text and data attributes', () => {
      const cities = [
        { name: 'London', country: 'UK', latitude: 51.5, longitude: -0.1 },
        { name: 'Paris', country: 'France', latitude: 48.8, longitude: 2.3 }
      ];
      app.renderCityList(cities);
      expect(elements.list.children.length).toBe(2);
      expect(elements.list.children[0].textContent).toBe('London, UK');
      const li = elements.list.children[0];
      expect(li.dataset.lat).toBe('51.5');
      expect(li.dataset.lon).toBe('-0.1');
      expect(li.dataset.name).toBe('London');
      expect(li.dataset.country).toBe('UK');
      expect(elements.input.classList.contains('show')).toBe(true);
    });

    it('handles empty array without adding show class', () => {
      app.renderCityList([]);
      expect(elements.list.children.length).toBe(0);
      expect(elements.input.classList.contains('show')).toBe(false);
    });
  });

  describe('handleKeydown', () => {
    beforeEach(() => {
      elements.list.innerHTML = '<li>A</li><li>B</li><li>C</li>';
    });

    it('ArrowDown increments selection and wraps around', () => {
      const down = new KeyboardEvent('keydown', { key: 'ArrowDown' });
      down.preventDefault = jest.fn();
      app.handleKeydown(down); expect(app.selIndex).toBe(0);
      app.handleKeydown(down); expect(app.selIndex).toBe(1);
      app.selIndex = 2;
      app.handleKeydown(down); expect(app.selIndex).toBe(0);
    });

    it('ArrowUp decrements selection and wraps around', () => {
      const up = new KeyboardEvent('keydown', { key: 'ArrowUp' });
      up.preventDefault = jest.fn();
      app.selIndex = 2;
      app.handleKeydown(up); expect(app.selIndex).toBe(1);
      app.selIndex = 0;
      app.handleKeydown(up); expect(app.selIndex).toBe(2);
    });

    it('Escape clears the list', () => {
      app.selIndex = 1;
      app.handleKeydown(new KeyboardEvent('keydown', { key: 'Escape' }));
      expect(elements.list.innerHTML).toBe('');
      expect(app.selIndex).toBe(-1);
    });

    it('Enter clicks the highlighted item when one is selected', () => {
      app.selIndex = 1;
      const items = elements.list.querySelectorAll('li');
      items[1].click = jest.fn();
      const enter = new KeyboardEvent('keydown', { key: 'Enter' });
      enter.preventDefault = jest.fn();
      app.handleKeydown(enter);
      expect(items[1].click).toHaveBeenCalled();
    });

    it('Enter with no selection calls fetchWeatherByCity', async () => {
      app.selIndex = -1;
      app.fetchWeatherByCity = jest.fn().mockResolvedValue(true);
      const enter = new KeyboardEvent('keydown', { key: 'Enter' });
      enter.preventDefault = jest.fn();
      app.handleKeydown(enter);
      expect(app.fetchWeatherByCity).toHaveBeenCalled();
    });
  });

  describe('searchCities', () => {
    it('returns empty array for empty query', async () => {
      expect(await app.searchCities('')).toEqual([]);
    });

    it('returns up to 3 cities from the API', async () => {
      const result = await app.searchCities('London');
      expect(result.length).toBeGreaterThan(0);
      expect(result.length).toBeLessThanOrEqual(3);
      expect(result[0].name).toBe('London');
    });

    it('returns empty array for a non-existent city', async () => {
      expect(await app.searchCities('nonexistentcity12345')).toEqual([]);
    });
  });

  describe('showWeather', () => {
    it('returns true and shows weather for valid coordinates', async () => {
      const result = await app.showWeather(51.5, -0.1, 'London', 'UK');
      expect(result).toBe(true);
      expect(elements.weatherBox.style.display).toBe('block');
      expect(elements.locName.innerText).toBe('London, UK');
    });

    it('returns false and alerts when weather data is unavailable', async () => {
      const result = await app.showWeather(0, 0, 'Test', '');
      expect(result).toBe(false);
      expect(window.alert).toHaveBeenCalledWith('Weather unavailable');
    });
  });

  describe('fetchWeatherByCity', () => {
    it('does nothing for empty input', async () => {
      elements.input.value = '';
      await app.fetchWeatherByCity();
      expect(elements.loader.style.display).toBe('none');
    });

    it('shows loading immediately, then displays weather for a valid city', async () => {
      elements.input.value = 'London';
      const promise = app.fetchWeatherByCity();
      expect(elements.loader.style.display).toBe('block');
      await promise;
      expect(elements.weatherBox.style.display).toBe('block');
    });

    it('returns false and alerts for a non-existent city', async () => {
      elements.input.value = 'nonexistentcity12345';
      const result = await app.fetchWeatherByCity();
      expect(result).toBe(false);
      expect(window.alert).toHaveBeenCalledWith('City not found');
    });
  });

  describe('fetchWeatherByLocation', () => {
    it('alerts and returns false when geolocation is not supported', async () => {
      const orig = navigator.geolocation;
      Object.defineProperty(navigator, 'geolocation', { value: null, writable: true });
      const result = await app.fetchWeatherByLocation();
      expect(result).toBe(false);
      expect(window.alert).toHaveBeenCalledWith('Geolocation not supported');
      Object.defineProperty(navigator, 'geolocation', { value: orig, writable: true });
    });

    it('returns true and shows weather on successful geolocation', async () => {
      navigator.geolocation.getCurrentPosition.mockImplementation(success => {
        success({ coords: { latitude: 51.5, longitude: -0.1 } });
      });
      const result = await app.fetchWeatherByLocation();
      expect(result).toBe(true);
      expect(elements.weatherBox.style.display).toBe('block');
    });

    it('returns false and alerts on geolocation error', async () => {
      navigator.geolocation.getCurrentPosition.mockImplementation((_, error) => {
        error({ message: 'User denied' });
      });
      const result = await app.fetchWeatherByLocation();
      expect(result).toBe(false);
      expect(window.alert).toHaveBeenCalledWith('Location access denied: User denied');
    });
  });
});