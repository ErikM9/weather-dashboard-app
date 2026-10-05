import { WEATHER_DESC, WEATHER_ICON, getWeatherDescription, getWeatherIcon } from '../../src/scripts.js';

describe('weather code lookups', () => {
  const codes = Object.keys(WEATHER_DESC).map(Number);

  it('covers the same WMO codes in both the description and icon tables', () => {
    expect(Object.keys(WEATHER_ICON).map(Number)).toEqual(codes);
  });

  it('gives every known code a description and an icon', () => {
    codes.forEach((code) => {
      expect(getWeatherDescription(code).length).toBeGreaterThan(0);
      expect(getWeatherIcon(code).length).toBeGreaterThan(0);
    });
  });

  it.each([
    [0, 'Sunny', '☀️'],
    [3, 'Cloudy', '☁️'],
    [45, 'Foggy', '🌫️'],
    [61, 'Light Rain', '🌧️'],
    [71, 'Light Snow', '❄️'],
    [85, 'Light Snow Showers', '🌨️'],
    [95, 'Thunderstorm', '⛈️']
  ])('maps code %i to "%s" and its icon', (code, description, icon) => {
    expect(getWeatherDescription(code)).toBe(description);
    expect(getWeatherIcon(code)).toBe(icon);
  });

  it.each([999, -1, undefined, null])('falls back to Unknown with no icon for code %s', (code) => {
    expect(getWeatherDescription(code)).toBe('Unknown');
    expect(getWeatherIcon(code)).toBe('');
  });
});