import '@testing-library/jest-dom';
import { jest } from '@jest/globals';

Object.defineProperty(window, 'alert', {
  writable: true,
  value: jest.fn()
});

Object.defineProperty(navigator, 'geolocation', {
  writable: true,
  value: {
    getCurrentPosition: jest.fn()
  }
});

const mockCitySearchResponse = {
  results: [
    { name: 'London', country: 'United Kingdom', latitude: 51.5074, longitude: -0.1278 },
    { name: 'London', country: 'Canada', latitude: 42.9849, longitude: -81.2453 },
    { name: 'Londonderry', country: 'United Kingdom', latitude: 55.0, longitude: -7.3 }
  ]
};

const mockWeatherResponse = {
  current: {
    weather_code: 0,
    temperature_2m: 22.5,
    apparent_temperature: 21.0,
    relative_humidity_2m: 65,
    wind_speed_10m: 12.3
  }
};

const mockReverseGeocodeResponse = {
  address: {
    city: 'Oxford',
    country: 'United Kingdom'
  }
};

global.fetch = jest.fn((url) => {
  if (url.includes('geocoding-api.open-meteo.com')) {
    if (url.includes('nonexistentcity12345')) {
      return Promise.resolve({
        json: () => Promise.resolve({ results: [] })
      });
    }
    return Promise.resolve({
      json: () => Promise.resolve(mockCitySearchResponse)
    });
  }

  if (url.includes('api.open-meteo.com')) {
    if (url.includes('latitude=0') && url.includes('longitude=0')) {
      return Promise.resolve({
        json: () => Promise.resolve({})
      });
    }
    return Promise.resolve({
      json: () => Promise.resolve(mockWeatherResponse)
    });
  }

  if (url.includes('nominatim.openstreetmap.org')) {
    return Promise.resolve({
      json: () => Promise.resolve(mockReverseGeocodeResponse)
    });
  }

  return Promise.reject(new Error('Unknown URL'));
});

beforeEach(() => {
  jest.clearAllMocks();
});