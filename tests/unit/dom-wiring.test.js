import { jest } from '@jest/globals';
import { renderPage, pageElements, suggestionTexts } from '../support/page.js';
import {
  mockApi,
  jsonResponse,
  GEOCODING_ORIGIN,
  WEATHER_ORIGIN,
  LONDON_UK,
  LONDON_CA,
  PARIS,
  SUNNY_WEATHER,
  OXFORD_ADDRESS
} from '../support/api-mock.js';

const cityResults = (...cities) => jsonResponse({ results: cities });

/* The page wiring runs as a side effect of loading the module, so the markup has to exist first */
renderPage();
const { WeatherApp } = await import('../../src/scripts.js');

const elements = pageElements();

/* Typing is debounced (500ms), so tests push the timers past the wait and let the pending requests settle */
const type = async (value) => {
  elements.input.value = value;
  elements.input.dispatchEvent(new Event('input', { bubbles: true }));
  await jest.advanceTimersByTimeAsync(600);
};

describe('page wiring', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    elements.input.value = '';
    elements.list.innerHTML = '';
    elements.weatherBox.style.display = 'none';
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('shows suggestions for what has been typed', async () => {
    mockApi({ geocoding: cityResults(LONDON_UK, LONDON_CA) });

    await type('London');

    expect(suggestionTexts()).toEqual(['London, United Kingdom', 'London, Canada']);
    expect(elements.input).toHaveAttribute('aria-expanded', 'true');
  });

  it('sends one request for a burst of keystrokes', async () => {
    const api = mockApi({ geocoding: cityResults(LONDON_UK) });

    elements.input.value = 'L';
    elements.input.dispatchEvent(new Event('input', { bubbles: true }));
    elements.input.value = 'Lo';
    elements.input.dispatchEvent(new Event('input', { bubbles: true }));
    await type('London');

    expect(api.requests).toHaveLength(1);
    expect(api.requests[0]).toContain('name=London');
  });

  it('closes the dropdown when the field is emptied', async () => {
    mockApi({ geocoding: cityResults(LONDON_UK) });
    await type('London');

    await type('');

    expect(elements.list.children).toHaveLength(0);
  });

  it('closes the dropdown when something else is clicked', async () => {
    mockApi({ geocoding: cityResults(LONDON_UK) });
    await type('London');

    document.querySelector('h1').dispatchEvent(new MouseEvent('click', { bubbles: true }));

    expect(elements.list.children).toHaveLength(0);
  });

  /* Escape pressed inside the typing pause would otherwise be undone once the waiting search ran */
  it('keeps the dropdown closed when Escape follows typing straight away', async () => {
    const api = mockApi({ geocoding: cityResults(LONDON_UK) });
    elements.input.value = 'London';
    elements.input.dispatchEvent(new Event('input', { bubbles: true }));

    elements.input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    await jest.advanceTimersByTimeAsync(600);

    expect(api.requests).toHaveLength(0);
    expect(elements.list.children).toHaveLength(0);
  });

  it('shows the weather for a suggestion that is clicked', async () => {
    const api = mockApi({ geocoding: cityResults(PARIS), weather: jsonResponse(SUNNY_WEATHER) });
    await type('Paris');

    elements.list.querySelector('li').dispatchEvent(new MouseEvent('click', { bubbles: true }));
    await jest.advanceTimersByTimeAsync(0);

    expect(elements.input.value).toBe('Paris, France');
    expect(api.urlFor(WEATHER_ORIGIN)).toContain('latitude=48.8566&longitude=2.3522');
    expect(elements.locName).toHaveTextContent('Paris, France');
    expect(elements.list.children).toHaveLength(0);
  });

  it('searches for the typed city when Enter is pressed', async () => {
    const api = mockApi({ geocoding: cityResults(PARIS), weather: jsonResponse(SUNNY_WEATHER) });
    elements.input.value = 'Paris';

    elements.input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true }));
    await jest.advanceTimersByTimeAsync(0);

    expect(api.urlFor(GEOCODING_ORIGIN)).toContain('count=1');
    expect(elements.locName).toHaveTextContent('Paris, France');
  });

  it('asks for the device location when the geolocation button is pressed', async () => {
    mockApi({ reverse: jsonResponse(OXFORD_ADDRESS), weather: jsonResponse(SUNNY_WEATHER) });
    navigator.geolocation.getCurrentPosition.mockImplementation((success) =>
      success({ coords: { latitude: 51.75, longitude: -1.26 } }));

    document.getElementById('geoBtn').dispatchEvent(new MouseEvent('click', { bubbles: true }));
    await jest.advanceTimersByTimeAsync(0);

    expect(navigator.geolocation.getCurrentPosition).toHaveBeenCalled();
    expect(elements.locName).toHaveTextContent('Oxford, United Kingdom');
  });

  it('fits the card to the window again once a frame, however many resize events arrive', async () => {
    const refit = jest.spyOn(WeatherApp.prototype, 'refitCard').mockImplementation(() => {});

    window.dispatchEvent(new Event('resize'));
    window.dispatchEvent(new Event('resize'));
    window.dispatchEvent(new Event('resize'));
    await jest.advanceTimersByTimeAsync(50);

    expect(refit).toHaveBeenCalledTimes(1);
    refit.mockRestore();
  });

  it('puts the rain background behind the page', () => {
    const rain = document.querySelector('.rain-bg');

    expect(rain).not.toBeNull();
    expect(rain.querySelectorAll('.drop')).toHaveLength(50);
  });
});