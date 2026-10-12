import { test as base, expect } from '@playwright/test';
import { Dashboard } from './dashboard.js';

const GEOCODING_ORIGIN = 'https://geocoding-api.open-meteo.com';
const WEATHER_ORIGIN = 'https://api.open-meteo.com';
const REVERSE_ORIGIN = 'https://nominatim.openstreetmap.org';

export const LONDON_UK = { name: 'London', country: 'United Kingdom', latitude: 51.5074, longitude: -0.1278 };
export const LONDON_CA = { name: 'London', country: 'Canada', latitude: 42.9849, longitude: -81.2453 };
export const LONDONDERRY = { name: 'Londonderry', country: 'United Kingdom', latitude: 55.0, longitude: -7.3 };
export const PARIS = { name: 'Paris', country: 'France', latitude: 48.8566, longitude: 2.3522 };
const OXFORD = { name: 'Oxford', country: 'United Kingdom', latitude: 51.75, longitude: -1.26 };

/* Every place reports different readings so a spec can tell whose weather reached the screen */
const CURRENT_BY_LATITUDE = {
  '51.5074': { weather_code: 0, temperature_2m: 22.5, apparent_temperature: 21.0, relative_humidity_2m: 65, wind_speed_10m: 3.4 },
  '42.9849': { weather_code: 2, temperature_2m: 18.3, apparent_temperature: 17.1, relative_humidity_2m: 58, wind_speed_10m: 4.0 },
  '55': { weather_code: 51, temperature_2m: 11.6, apparent_temperature: 9.8, relative_humidity_2m: 80, wind_speed_10m: 5.5 },
  '48.8566': { weather_code: 61, temperature_2m: 9.1, apparent_temperature: 7.4, relative_humidity_2m: 88, wind_speed_10m: 6.2 },
  '51.75': { weather_code: 3, temperature_2m: 14.2, apparent_temperature: 13.0, relative_humidity_2m: 71, wind_speed_10m: 2.1 }
};

const CITIES_BY_QUERY = {
  london: [LONDON_UK, LONDON_CA, LONDONDERRY],
  paris: [PARIS],
  oxford: [OXFORD]
};

export const test = base.extend({
  /* Stands in for the three public APIs and lets each spec reshape the replies */
  api: async ({ page, baseURL }, use) => {
    const held = { search: [], weather: [] };
    const releases = [];

    /* Makes the next reply of a kind wait until the spec releases it, which is how a slow answer is staged */
    const holdNext = (kind) => {
      let release;
      held[kind].push(new Promise((resolve) => { release = resolve; }));
      releases.push(release);
      return release;
    };

    const api = {
      requests: [],
      citiesByQuery: { ...CITIES_BY_QUERY },
      address: { city: 'Oxford', country: 'United Kingdom' },
      geocodingStatus: 200,
      weatherStatus: 200,
      reverseStatus: 200,
      holdNextSearch: () => holdNext('search'),
      holdNextWeather: () => holdNext('weather'),
      searches: () => api.requests.filter((url) => url.startsWith(GEOCODING_ORIGIN)),
      weatherLookups: () => api.requests.filter((url) => url.startsWith(WEATHER_ORIGIN))
    };

    const escaped = [];

    /* Anything a spec has not mocked would be a live call, so it is blocked and reported at the end */
    await page.route('**/*', (route) => {
      const url = route.request().url();

      if (url.startsWith(baseURL)) return route.continue();

      escaped.push(url);
      return route.abort();
    });

    await page.route(`${GEOCODING_ORIGIN}/**`, async (route) => {
      const url = new URL(route.request().url());
      api.requests.push(url.href);
      await held.search.shift();

      if (api.geocodingStatus !== 200) {
        return route.fulfill({ status: api.geocodingStatus, json: { error: true } });
      }

      const query = (url.searchParams.get('name') || '').toLowerCase();
      const partial = Object.entries(api.citiesByQuery).find(([key]) => key.startsWith(query));
      const results = api.citiesByQuery[query] ?? (partial ? partial[1] : []);

      return route.fulfill({ json: { results } });
    });

    await page.route(`${WEATHER_ORIGIN}/**`, async (route) => {
      const url = new URL(route.request().url());
      api.requests.push(url.href);
      await held.weather.shift();

      if (api.weatherStatus !== 200) {
        return route.fulfill({ status: api.weatherStatus, json: { error: true } });
      }

      const current = CURRENT_BY_LATITUDE[url.searchParams.get('latitude')] ?? CURRENT_BY_LATITUDE['51.5074'];
      return route.fulfill({ json: { current } });
    });

    await page.route(`${REVERSE_ORIGIN}/**`, (route) => {
      api.requests.push(route.request().url());

      if (api.reverseStatus !== 200) {
        return route.fulfill({ status: api.reverseStatus, json: { error: true } });
      }

      return route.fulfill({ json: { address: api.address } });
    });

    await use(api);

    /* A reply still held when the spec ends is let go, so its route finishes before the page closes */
    releases.forEach((release) => release());
    expect(escaped, 'requests that escaped the mocks').toEqual([]);
  },

  /* Asks for the fake APIs as well, so their routes are in place before the page loads */
  dashboard: async ({ page, api }, use) => {
    await page.goto('/');
    await use(new Dashboard(page));
  }
});

export { expect };