# Weather Dashboard

![CI](https://github.com/ErikM9/weather-dashboard-app/actions/workflows/ci.yml/badge.svg)

A weather dashboard which gets the current weather from the Open-Meteo APIs. You can search for a city, with suggestions as you type, or ask for the weather where you are, and Nominatim then names the place for you.

**Live demo:** [erikm9.github.io/weather-dashboard-app](https://erikm9.github.io/weather-dashboard-app/)

## Run it

```bash
npm install
npm run serve
```

Then open http://localhost:3000.

## Testing

I used Jest for the unit tests and Playwright for the end-to-end tests.

```bash
npm test                 # unit tests
npm run test:coverage    # unit tests with coverage (fails below 90%)
npm run test:e2e         # e2e tests, which start their own server
npm run test:e2e:headed  # the same run in a visible browser
npm run test:all         # coverage run followed by the e2e suite
```

Playwright starts the server by itself (see `webServer` in `playwright.config.js`), so you don't need to run `npm run serve` first. Before the first e2e run, install its browsers with `npx playwright install`. When a test fails, its screenshot and video are saved to `test-results/`.

### Why these tools?

I chose the testing tools for my smaller projects so I could learn how various testing tools work, which is why each of them uses a different set. For the weather dashboard I went with Jest, jsdom, jest-dom, Playwright and axe-core.

- Jest comes with its own mock functions, fake timers and coverage thresholds, so replacing `fetch` in each test, stepping through the pause before a search and failing the run below 90% needed no extra libraries.
- jsdom loads the real page markup, so the page wiring (typing, clicks, Enter and Escape, the location button and resizing the window) is unit tested as well.
- jest-dom adds matchers such as `toHaveTextContent` and `toHaveAttribute`, which keep the assertions about what is on the page and give clear messages when they fail.
- Playwright runs the same specs in Chromium, Firefox and WebKit, and in phone-sized Chrome and Safari. Its `page.route` stands in for all three APIs, it can grant location access and say where the browser is, and its clock lets a test hold the pause before a search.
- axe-core runs automated WCAG 2.1 A and AA scans inside the e2e suite, through `@axe-core/playwright`.

### How the APIs are faked

No test touches the real Open-Meteo or Nominatim services:

- The unit tests replace `fetch` in each test with replies shaped like a real `Response`, `ok` and `status` included, so failed requests can be tested too (`tests/support/api-mock.js`).
- The e2e tests answer all three APIs through `page.route`, with different readings for each city, so a test can tell whose weather reached the screen. A test can also hold a reply back until it lets it go, which is how slow and late answers are staged, and any request which gets past the fakes fails the test (`tests/e2e/support/fixtures.js`).

### What's tested

**Unit (101 tests, 99% of statements)**
- Weather code descriptions and icons, including unknown codes
- Card formatting: location, units, zero and below-zero readings, long lines shrinking to fit the card, and the place name kept larger than the lines under it, breaking after its comma when it needs two lines, all fitted again when the window changes size
- Reverse geocoding, which falls back from city to town to village
- Debounce timing and cancelling, and the raindrops
- `WeatherApp`: suggestions, ranking, de-duplication, late answers, the loading state, keyboard handling, geolocation and every error path
- The page wiring itself, driven through the real `index.html` markup

**End-to-end (39 tests, each run in 5 browser projects)**
- Search: suggestions, the three-item cap, de-duplication, one request per burst of typing and late answers
- Keyboard: the arrow keys in both directions, wrapping round, Enter, Escape, and a late answer which must not undo a highlight
- Weather card: exact readings, the spinner while the weather is on its way and switching cities
- Errors: unknown city, failing lookup and failing weather service
- Geolocation: allowed, a failing place-name lookup and refused
- Accessibility: axe scans, the placeholder's contrast (axe leaves placeholders out), the combobox and its list of suggestions, the live region, the location button's name and the focus order
- Responsive layout from 320px upwards, including a card shown on a wide screen staying inside its edges when the window narrows

## CI

GitHub Actions runs the unit tests with coverage, the e2e suite in Chromium, Firefox and WebKit, and a separate mobile run, on every push and pull request to `main`. A push to `main` which passes them is then deployed to GitHub Pages, straight from `src/`.