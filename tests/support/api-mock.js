import { jest } from '@jest/globals';

export const GEOCODING_ORIGIN = 'https://geocoding-api.open-meteo.com';
export const WEATHER_ORIGIN = 'https://api.open-meteo.com';
export const REVERSE_ORIGIN = 'https://nominatim.openstreetmap.org';

export const LONDON_UK = { name: 'London', country: 'United Kingdom', latitude: 51.5074, longitude: -0.1278 };
export const LONDON_CA = { name: 'London', country: 'Canada', latitude: 42.9849, longitude: -81.2453 };
export const LONDONDERRY = { name: 'Londonderry', country: 'United Kingdom', latitude: 55.0, longitude: -7.3 };
export const PARIS = { name: 'Paris', country: 'France', latitude: 48.8566, longitude: 2.3522 };

export const SUNNY_WEATHER = {
  current: {
    weather_code: 0,
    temperature_2m: 22.5,
    apparent_temperature: 21.0,
    relative_humidity_2m: 65,
    wind_speed_10m: 3.4
  }
};

export const OXFORD_ADDRESS = { address: { city: 'Oxford', country: 'United Kingdom' } };

/* Mirrors the parts of a real Response the app relies on, so status handling can be tested */
export const jsonResponse = (body, status = 200) => ({
  ok: status >= 200 && status < 300,
  status,
  json: async () => body
});

export const failedRequest = () => Promise.reject(new TypeError('Failed to fetch'));

/* Routes fetch by endpoint so each test decides what every API returns, and records the URLs requested */
export function mockApi({ geocoding, weather, reverse } = {}) {
  const requests = [];

  global.fetch = jest.fn((url) => {
    requests.push(url);

    const reply = url.startsWith(GEOCODING_ORIGIN) ? geocoding
      : url.startsWith(WEATHER_ORIGIN) ? weather
        : url.startsWith(REVERSE_ORIGIN) ? reverse
          : null;

    if (!reply) return Promise.reject(new Error(`Unmocked request to ${url}`));
    return Promise.resolve(typeof reply === 'function' ? reply(url) : reply);
  });

  return {
    requests,
    urlFor: (origin) => requests.find((url) => url.startsWith(origin))
  };
}

/* A promise the test resolves by hand, for checking what happens when responses arrive out of order */
export function deferred() {
  let resolve;
  const promise = new Promise((r) => { resolve = r; });
  return { promise, resolve };
}