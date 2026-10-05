import { formatLocation, createWeatherDisplay, parseReverseGeocodeResponse, fitOnOneLine, setPlaceName, fitWeatherCard } from '../../src/scripts.js';
import { SUNNY_WEATHER } from '../support/api-mock.js';

describe('formatLocation', () => {
  it.each([
    ['London', 'United Kingdom', 'London, United Kingdom'],
    ['London', '', 'London'],
    ['London', null, 'London'],
    ['London', undefined, 'London']
  ])('formats %s with country %s as "%s"', (name, country, expected) => {
    expect(formatLocation(name, country)).toBe(expected);
  });
});

describe('createWeatherDisplay', () => {
  it('turns an API payload into the lines shown on the card', () => {
    expect(createWeatherDisplay(SUNNY_WEATHER, 'London', 'United Kingdom')).toEqual({
      location: 'London, United Kingdom',
      condition: '☀️ Sunny',
      temperature: 'Temperature: 22.5 °C',
      feelsLike: 'Feels Like: 21 °C',
      humidity: 'Humidity: 65%',
      windSpeed: 'Wind Speed: 3.4 m/s'
    });
  });

  it.each([
    ['an empty object', {}],
    ['null', null],
    ['undefined', undefined],
    ['a payload whose current section is null', { current: null }]
  ])('returns null for %s', (_label, data) => {
    expect(createWeatherDisplay(data, 'London', 'United Kingdom')).toBeNull();
  });

  it('keeps zero and below-zero readings', () => {
    const freezing = {
      current: { weather_code: 71, temperature_2m: -5.5, apparent_temperature: -8.2, relative_humidity_2m: 0, wind_speed_10m: 0 }
    };

    expect(createWeatherDisplay(freezing, 'Moscow', 'Russia')).toMatchObject({
      temperature: 'Temperature: -5.5 °C',
      feelsLike: 'Feels Like: -8.2 °C',
      humidity: 'Humidity: 0%',
      windSpeed: 'Wind Speed: 0 m/s'
    });
  });

  it('describes an unrecognised code without a stray space where the icon would be', () => {
    const unknown = { current: { ...SUNNY_WEATHER.current, weather_code: 999 } };

    expect(createWeatherDisplay(unknown, 'Test', '').condition).toBe('Unknown');
  });
});

describe('parseReverseGeocodeResponse', () => {
  it.each([
    ['city', { address: { city: 'London', country: 'United Kingdom' } }, 'London'],
    ['town', { address: { town: 'Abingdon', country: 'United Kingdom' } }, 'Abingdon'],
    ['village', { address: { village: 'Bibury', country: 'United Kingdom' } }, 'Bibury']
  ])('reads the place name from %s', (_field, data, expected) => {
    expect(parseReverseGeocodeResponse(data)).toEqual({ name: expected, country: 'United Kingdom' });
  });

  it('prefers city over town and village', () => {
    const data = { address: { city: 'Oxford', town: 'Abingdon', village: 'Bibury', country: 'United Kingdom' } };

    expect(parseReverseGeocodeResponse(data).name).toBe('Oxford');
  });

  it.each([
    ['an address with no place fields', { address: {} }],
    ['null', null],
    ['undefined', undefined]
  ])('falls back to Current Location for %s', (_label, data) => {
    expect(parseReverseGeocodeResponse(data)).toEqual({ name: 'Current Location', country: '' });
  });
});

describe('fitOnOneLine', () => {
  /* jsdom lays nothing out, so the line is given a 100px width and text as wide as `perPx` times its font size */
  const line = (perPx) => {
    document.head.innerHTML = '<style>.line { font-size: 20px; }</style>';
    const el = document.createElement('p');
    el.className = 'line';
    document.body.append(el);
    Object.defineProperty(el, 'clientWidth', { configurable: true, get: () => 100 });
    Object.defineProperty(el, 'scrollWidth', { configurable: true, get: () => perPx * (parseFloat(el.style.fontSize) || 20) });
    return el;
  };

  afterEach(() => {
    document.head.innerHTML = '';
    document.body.innerHTML = '';
  });

  it('leaves text that fits at its stylesheet size, dropping any size left from a longer line before it', () => {
    const el = line(4.5);
    el.style.fontSize = '12px';

    fitOnOneLine(el);

    expect(el.style.fontSize).toBe('');
    expect(el.style.whiteSpace).toBe('nowrap');
  });

  it('shrinks text that overflows until it fits on its line', () => {
    /* 6px per point: 120px at 20px, 96px at 16px */
    const el = line(6);

    fitOnOneLine(el);

    expect(el.style.fontSize).toBe('16px');
    expect(el.style.whiteSpace).toBe('nowrap');
  });

  it('lets text wrap rather than shrink below 60% of its size', () => {
    /* 10px per point: still 120px at 12px, the smallest it may go */
    const el = line(10);

    fitOnOneLine(el);

    expect(el.style.fontSize).toBe('12px');
    expect(el.style.whiteSpace).toBe('');
  });

  it('starts no larger than the size it is given, even where the stylesheet size would fit', () => {
    const el = line(4.5);

    fitOnOneLine(el, 15);

    expect(el.style.fontSize).toBe('15px');
    expect(el.style.whiteSpace).toBe('nowrap');
  });
});

describe('setPlaceName', () => {
  afterEach(() => {
    document.body.innerHTML = '';
  });

  it('splits the name after its last comma into two runs, keeping the text as it was', () => {
    const heading = document.createElement('h2');

    setPlaceName(heading, 'Abingdon-on-Thames, United Kingdom');

    expect([...heading.children].map((run) => run.textContent)).toEqual(['Abingdon-on-Thames,', 'United Kingdom']);
    expect(heading).toHaveTextContent('Abingdon-on-Thames, United Kingdom');
  });

  it('leaves a name with no country as plain text', () => {
    const heading = document.createElement('h2');
    heading.innerHTML = '<span>Old,</span> <span>Name</span>';

    setPlaceName(heading, 'Current Location');

    expect(heading.children).toHaveLength(0);
    expect(heading.textContent).toBe('Current Location');
  });
});

describe('fitWeatherCard', () => {
  /* jsdom lays nothing out, so the card is 100px wide, the name is `oneLine` times its font size wide on one line and
     its widest run `widestRun` times it when it breaks after its comma, and each line under it is 3 times its size */
  const card = (location, oneLine, widestRun) => {
    document.head.innerHTML = '<style>h2 { font-size: 40px; } p { font-size: 30px; }</style>';
    const heading = document.createElement('h2');
    setPlaceName(heading, location);
    const lines = Array.from({ length: 5 }, () => document.createElement('p'));
    const box = document.createElement('div');
    box.append(heading, ...lines);
    document.body.append(box);
    const size = (el) => parseFloat(el.style.fontSize) || parseFloat(getComputedStyle(el).fontSize);
    const breaks = () => heading.style.whiteSpace !== 'nowrap' && heading.children.length > 0;
    [heading, ...lines].forEach((el) => Object.defineProperty(el, 'clientWidth', { configurable: true, get: () => 100 }));
    Object.defineProperty(heading, 'scrollWidth', { configurable: true, get: () => (breaks() ? widestRun : oneLine) * size(heading) });
    lines.forEach((el) => Object.defineProperty(el, 'scrollWidth', { configurable: true, get: () => 3 * size(el) }));
    return { box, heading, lines };
  };

  afterEach(() => {
    document.head.innerHTML = '';
    document.body.innerHTML = '';
  });

  it('keeps a short name on one line at full size, with the lines under it at theirs', () => {
    const { heading, lines } = card('Rome, Italy', 2, 1.5);

    fitWeatherCard(heading, lines);

    expect(heading.style.fontSize).toBe('');
    expect(heading.style.whiteSpace).toBe('nowrap');
    lines.forEach((line) => expect(line.style.fontSize).toBe(''));
  });

  it('breaks a long name after its comma where that lets it be larger, and holds the lines to four-fifths of it', () => {
    /* One line fits at 25px, two at up to 40px, but two lines may be no larger than (40 + 5 x 30) / (2 + 5 x 0.8) */
    const { heading, lines } = card('Abingdon-on-Thames, United Kingdom', 4, 2.5);

    fitWeatherCard(heading, lines);

    expect(heading.style.fontSize).toBe('31px');
    expect(heading.style.whiteSpace).toBe('');
    expect(heading.children).toHaveLength(2);
    lines.forEach((line) => expect(line.style.fontSize).toBe('24.8px'));
  });

  it('stays on one line where that is larger than two would be', () => {
    /* One line fits at 34px, above the 31px two lines may take */
    const { heading, lines } = card('Rio de Janeiro, Brazil', 2.9, 2);

    fitWeatherCard(heading, lines);

    expect(heading.style.fontSize).toBe('34px');
    expect(heading.style.whiteSpace).toBe('nowrap');
    lines.forEach((line) => expect(line.style.fontSize).toBe('27.2px'));
  });

  it('starts again from the stylesheet sizes when it fits a card a second time', () => {
    /* The lines' own size goes into how large two lines may be, so the sizes the first pass gave them must not */
    const { heading, lines } = card('Abingdon-on-Thames, United Kingdom', 4, 2.5);

    fitWeatherCard(heading, lines);
    fitWeatherCard(heading, lines);

    expect(heading.style.fontSize).toBe('31px');
    lines.forEach((line) => expect(line.style.fontSize).toBe('24.8px'));
  });

  it('lets a name too long for either wrap where it can at 60% of its size', () => {
    const { heading, lines } = card('Llanfairpwllgwyngyll, United Kingdom', 10, 5);

    fitWeatherCard(heading, lines);

    expect(heading.style.fontSize).toBe('24px');
    expect(heading.style.whiteSpace).toBe('');
    expect(heading.children).toHaveLength(0);
    expect(heading.textContent).toBe('Llanfairpwllgwyngyll, United Kingdom');
    lines.forEach((line) => expect(line.style.fontSize).toBe('19.2px'));
  });

  it('lets a name with no country wrap at 60% of its size when it cannot fit one line', () => {
    const { heading, lines } = card('Somewhere With A Very Long Name', 10, 10);

    fitWeatherCard(heading, lines);

    expect(heading.style.fontSize).toBe('24px');
    expect(heading.style.whiteSpace).toBe('');
  });

  it('tells the card the size its name ends at, which the stylesheet sizes the room under the last line by', () => {
    const short = card('Rome, Italy', 2, 1.5);
    const long = card('Abingdon-on-Thames, United Kingdom', 4, 2.5);

    fitWeatherCard(short.heading, short.lines);
    fitWeatherCard(long.heading, long.lines);

    expect(short.box.style.getPropertyValue('--heading-size')).toBe('40px');
    expect(long.box.style.getPropertyValue('--heading-size')).toBe('31px');
  });
});