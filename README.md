# Weather Dashboard

![CI](https://github.com/ErikM9/weather-dashboard-app/actions/workflows/ci.yml/badge.svg)

Weather app with city search, autocomplete, and geolocation, built on the Open-Meteo and Nominatim APIs.

## Run it

```bash
npm install
npm run serve
```

Then open http://localhost:3000.

## Testing

Unit tests with Jest, end-to-end tests with Playwright.

```bash
npm test                 # unit tests
npm run test:coverage    # unit tests with coverage (fails below 90%)
npm run test:e2e         # e2e tests, which start their own server
npm run test:e2e:headed  # the same run in a visible browser
npm run test:all         # coverage run followed by the e2e suite
```

Playwright starts the dev server itself (see `webServer` in `playwright.config.js`), so there is no need to run `npm run serve` first.

### Why these tools?

- **Jest with jsdom** — Runs the DOM logic headlessly in milliseconds, and Testing Library matchers keep the assertions about rendered text rather than internals.
- **Playwright** — Real browsers, `page.route` for API mocking, built-in geolocation and permission control, and traces and video on failure.
- **axe-core** — Automated WCAG 2.1 A and AA scans inside the e2e suite.

### How the APIs are faked

No test touches the real Open-Meteo or Nominatim services:

- Unit tests replace `fetch` per test with objects shaped like a real `Response`, including `ok` and `status`, so HTTP failures can be tested (`tests/support/api-mock.js`).
- E2E tests intercept all three endpoints and return different readings per city, so a spec can prove whose weather reached the screen. Any request that escapes the mocks fails the test (`tests/e2e/support/fixtures.js`).

### What's tested

**Unit (109 tests, 99% of statements)**
- Weather code descriptions and icons, including unknown codes
- Card formatting: location, units, zero and below-zero readings, long lines shrinking to fit the card, and the place name kept larger than the lines under it, breaking after its comma when it needs two lines, all fitted again when the window changes size
- Reverse geocoding fallbacks from city to town to village
- Debounce timing and cancelling, and raindrop generation
- `WeatherApp`: suggestions, ranking, de-duplication, stale responses, loading state, keyboard handling, geolocation, and every error path
- The page wiring itself, driven through the real `index.html` markup

**E2E (42 specs across 5 browser projects)**
- Search: suggestions, the three-item cap, de-duplication, one request per burst of typing, stale responses
- Keyboard: arrow navigation in both directions, wrap-around, Enter, Escape, and late search answers that must not undo a highlight or reopen a closed list
- Weather card: exact readings, spinner during the request, switching cities
- Errors: unknown city, failing lookup, failing weather service
- Geolocation: granted, reverse-geocode failure, refusal
- Accessibility: axe scans, combobox and listbox semantics, focus order
- Responsive layout from 320px upwards, including a card shown on a wide screen staying inside its edges when the window narrows

## CI

GitHub Actions runs the unit tests with coverage, the e2e suite in Chromium, Firefox and WebKit, and a separate mobile run, on every push and pull request.