# Weather Dashboard

![CI](https://github.com/ErikM9/weather-dashboard-app/actions/workflows/ci.yml/badge.svg)

Weather app with city search, autocomplete, and geolocation.

## Run it

```bash
npm install
npm run serve
```

## Testing

Unit tests with Jest, E2E tests with Playwright.

```bash
npm test                 # unit tests
npm run test:e2e         # e2e tests (needs npm run serve first)
```

### Why these tools?

- **Jest** — Pairs well with `jsdom` for DOM testing and integrates cleanly with Testing Library matchers. The global fetch mock in `setup.js` intercepts all API calls so tests never hit real endpoints.
- **Playwright** — Built-in keyboard event support makes it the natural choice for testing arrow key navigation in the autocomplete dropdown. All three external APIs (Open-Meteo geocoding, Open-Meteo weather, Nominatim) are intercepted via `page.route()` so E2E tests never hit real endpoints and run reliably in CI.

### What's tested

**Unit (39 tests)**
- Weather code mappings (descriptions and emojis)
- Location formatting
- API response parsing
- Rain effect generation
- WeatherApp class (search, display, keyboard handling, geolocation, loading states, error handling)

**E2E (37 specs, 185 executions across 5 browser projects)**
- Search and autocomplete
- Keyboard navigation
- Geolocation flow
- Loading states
- Error handling
- Accessibility (aria-labels, aria-live, listbox role, button semantics, keyboard navigation)
- Mobile responsiveness
- Performance

## CI

GitHub Actions runs both test suites on push.