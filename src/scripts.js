export const WEATHER_DESC = {
  0:"Sunny",1:"Mainly Sunny",2:"Partly Cloudy",3:"Cloudy",45:"Foggy",48:"Rime Fog",
  51:"Light Drizzle",53:"Drizzle",55:"Heavy Drizzle",56:"Light Freezing Drizzle",57:"Freezing Drizzle",
  61:"Light Rain",63:"Rain",65:"Heavy Rain",66:"Light Freezing Rain",67:"Freezing Rain",
  71:"Light Snow",73:"Snow",75:"Heavy Snow",77:"Snow Grains",80:"Light Showers",81:"Showers",
  82:"Heavy Showers",85:"Light Snow Showers",86:"Snow Showers",95:"Thunderstorm",
  96:"Light Thunderstorm + Hail",99:"Thunderstorm + Hail"
};

export const WEATHER_ICON = {
  0:"☀️",1:"🌤️",2:"⛅",3:"☁️",45:"🌫️",48:"🌫️",51:"🌧️",53:"🌧️",55:"🌧️",56:"🌧️",
  57:"🌧️",61:"🌧️",63:"🌧️",65:"🌧️",66:"🌧️",67:"🌧️",71:"❄️",73:"❄️",75:"❄️",
  77:"❄️",80:"🌧️",81:"🌧️",82:"🌧️",85:"🌨️",86:"🌨️",95:"⛈️",96:"⛈️",99:"⛈️"
};

export const getWeatherDescription = (code) => WEATHER_DESC[code] || 'Unknown';
export const getWeatherIcon = (code) => WEATHER_ICON[code] || '';

export const formatLocation = (name, country) => {
  return `${name}${country ? ", " + country : ""}`;
};

/* Build the weather display object consumed by the UI */
export const createWeatherDisplay = (data, name, country) => {
  if (!data?.current) return null;

  const code = data.current.weather_code;
  return {
    location: formatLocation(name, country),
    condition: `${getWeatherIcon(code)} ${getWeatherDescription(code)}`.trim(),
    temperature: `Temperature: ${data.current.temperature_2m} °C`,
    feelsLike: `Feels Like: ${data.current.apparent_temperature} °C`,
    humidity: `Humidity: ${data.current.relative_humidity_2m}%`,
    windSpeed: `Wind Speed: ${data.current.wind_speed_10m} m/s`
  };
};

const buildGeocodingUrl = (cityName, count) => {
  return `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(cityName)}&count=${count}`;
};

/* Open-Meteo reports wind in km/h unless the unit is requested, and the dashboard shows m/s */
const buildWeatherUrl = (lat, lon) => {
  return `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=weather_code,temperature_2m,apparent_temperature,relative_humidity_2m,wind_speed_10m&wind_speed_unit=ms`;
};

const buildReverseGeocodeUrl = (lat, lon) => {
  return `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json`;
};

/* Nominatim may return city, town, or village depending on location */
export const parseReverseGeocodeResponse = (data) => {
  const name = data?.address?.city ||
               data?.address?.town ||
               data?.address?.village ||
               'Current Location';

  const country = data?.address?.country || '';
  return { name, country };
};

/* Randomise each raindrop so the animation feels natural */
export const createRaindrop = () => {
  const drop = document.createElement('div');
  drop.className = 'drop';
  drop.style.left = `${Math.random() * 100}vw`;
  drop.style.animationDuration = `${Math.random() * 1 + 0.3}s`;
  drop.style.animationDelay = `${Math.random() * 2}s`;
  drop.style.opacity = Math.random() * 0.5 + 0.3;
  return drop;
};

/* Shrinks an element's text, down to 60% of its stylesheet size, until it fits its line without wrapping. A
   largest size, where given, caps where it starts */
export const fitOnOneLine = (element, largest) => {
  element.style.fontSize = '';
  element.style.whiteSpace = 'nowrap';
  const full = parseFloat(getComputedStyle(element).fontSize);
  let size = Math.min(full, largest ?? full);
  if (size < full) element.style.fontSize = `${size}px`;
  while (element.scrollWidth > element.clientWidth && size > full * 0.6) {
    size -= 1;
    element.style.fontSize = `${size}px`;
  }
  /* Past the smallest size the text wraps after all, since cutting a place's name short would be worse */
  if (element.scrollWidth > element.clientWidth) element.style.whiteSpace = '';
};

/* The lines under the place name are held to this share of its size, so the name always reads as the card's heading */
const LINES_TO_HEADING = 0.8;

/* Sets the place name as two runs that never break inside (the stylesheet keeps each on one line), the place with
   its comma and the country, so a name too long for one line breaks after its comma and nowhere else */
export const setPlaceName = (heading, location) => {
  const comma = location.lastIndexOf(', ');
  if (comma < 0) {
    heading.textContent = location;
    return;
  }
  const run = (text) => Object.assign(document.createElement('span'), { textContent: text });
  heading.replaceChildren(run(location.slice(0, comma + 1)), ' ', run(location.slice(comma + 2)));
};

/* Sizes the card so the place name is always its largest text. The name takes the largest size, up to its
   stylesheet size, at which it fits one line, or breaks after its comma where two lines let it be larger, at a size
   that keeps the card no taller than a one-line name at full size would. The lines under it are then held to
   four-fifths of the name's size, and shrink further only to fit their line */
export const fitWeatherCard = (heading, lines) => {
  /* Every pass starts from the stylesheet's sizes, or one fitting a card again would start from the last pass's */
  [heading, ...lines].forEach((el) => { el.style.fontSize = ''; });
  heading.style.whiteSpace = 'nowrap';
  const full = parseFloat(getComputedStyle(heading).fontSize);
  const lineFull = parseFloat(getComputedStyle(lines[0]).fontSize);
  const smallest = full * 0.6;
  /* The largest whole size, from the one given down to 60% of the stylesheet's, at which no run of the name overflows */
  const largestFitting = (from) => {
    for (let size = Math.floor(from); size >= smallest; size -= 1) {
      heading.style.fontSize = `${size}px`;
      if (heading.scrollWidth <= heading.clientWidth) return size;
    }
    return null;
  };

  const oneLine = largestFitting(full);
  let twoLines = null;
  if (heading.children.length) {
    heading.style.whiteSpace = '';
    twoLines = largestFitting(Math.min(full, (full + lines.length * lineFull) / (2 + lines.length * LINES_TO_HEADING)));
  }

  let size;
  if (twoLines !== null && (oneLine === null || twoLines > oneLine)) {
    size = twoLines;
  } else if (oneLine !== null) {
    size = oneLine;
    heading.style.whiteSpace = 'nowrap';
  } else {
    /* Too long even for two lines at the smallest size, so it wraps wherever it can, as cutting it short would be worse */
    size = smallest;
    heading.textContent = heading.textContent;
    heading.style.whiteSpace = '';
  }
  heading.style.fontSize = size < full ? `${size}px` : '';
  /* The stylesheet sizes the room under the last line from the name's size, which sets the room above the name */
  heading.parentElement?.style.setProperty('--heading-size', `${size}px`);
  const linesLargest = Math.round(size * LINES_TO_HEADING * 100) / 100;
  lines.forEach((line) => fitOnOneLine(line, linesLargest));
};

/* Delays a call until the caller stops firing it for the given wait, so typing does not start a request per keystroke, and cancel drops a call still waiting */
export const debounce = (fn, wait = 250) => {
  let timer;
  const debounced = (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), wait);
  };
  debounced.cancel = () => clearTimeout(timer);
  return debounced;
};

export const initRainEffect = (container, dropCount = 50) => {
  for (let i = 0; i < dropCount; i++) {
    container.appendChild(createRaindrop());
  }
};

export class WeatherApp {
  constructor(elements) {
    Object.assign(this, elements);
    this.selIndex = -1;
    this.searchToken = 0;
  }

  clearList() {
    /* Closing the list also retires any search still on its way, so a late answer cannot open it again */
    this.searchToken++;
    this.list.innerHTML = '';
    this.selIndex = -1;
    this.input.classList.remove('show');
    this.input.setAttribute('aria-expanded', 'false');
    this.input.removeAttribute('aria-activedescendant');
  }

  /* Highlight the selected dropdown item and point the combobox at it so screen readers announce the change */
  highlight() {
    this.list.querySelectorAll('li').forEach((li, i) => {
      const selected = i === this.selIndex;
      li.classList.toggle('active', selected);
      li.setAttribute('aria-selected', String(selected));
    });

    const active = this.list.querySelectorAll('li')[this.selIndex];

    if (active) {
      this.input.setAttribute('aria-activedescendant', active.id);
    } else {
      this.input.removeAttribute('aria-activedescendant');
    }
  }

  showLoading() {
    this.loader.style.display = 'block';
    this.weatherBox.style.display = 'none';
  }

  hideLoading() {
    this.loader.style.display = 'none';
  }

  displayWeather(weatherDisplay) {
    setPlaceName(this.locName, weatherDisplay.location);
    this.cond.textContent = weatherDisplay.condition;
    this.temp.textContent = weatherDisplay.temperature;
    this.feel.textContent = weatherDisplay.feelsLike;
    this.humid.textContent = weatherDisplay.humidity;
    this.windSpd.textContent = weatherDisplay.windSpeed;
    this.weatherBox.style.display = 'block';

    /* The card is never taller than with a one-line name at full size, whatever the place is called: a long name
       or condition shrinks to its line, or the name breaks after its comma with the lines under it giving way,
       rather than wrapping onto more lines, which is what pushed the panel off the bottom of short screens */
    this.fitCard();
  }

  fitCard() {
    fitWeatherCard(this.locName, [this.cond, this.temp, this.feel, this.humid, this.windSpd]);
  }

  /* A card already on screen is fitted again when the window changes size, as the room its lines have changes with
     it: one shown on a wide screen and then seen on a narrow one would otherwise keep its sizes from the wide one,
     and its place name would run out past its edge */
  refitCard() {
    if (this.weatherBox.style.display !== 'block') return;
    /* The name is set out afresh, as a pass that found no room for its two runs joins them into one */
    setPlaceName(this.locName, this.locName.textContent);
    this.fitCard();
  }

  async searchCities(query) {
    if (!query) return [];

    try {
      const url = buildGeocodingUrl(query, 10);
      const res = await fetch(url);
      if (!res.ok) throw new Error(`Geocoding request failed with status ${res.status}`);
      const data = await res.json();
      const results = data.results || [];
      const q = query.toLowerCase();

      /* Prefer prefix matches over partial matches */
      results.sort((a, b) => {
        const aName = a.name.toLowerCase();
        const bName = b.name.toLowerCase();
        const aStarts = aName.startsWith(q) ? 0 : 1;
        const bStarts = bName.startsWith(q) ? 0 : 1;
        if (aStarts !== bStarts) return aStarts - bStarts;
        return aName.localeCompare(bName);
      });

      /* Remove visually duplicate city entries */
      const seen = new Set();
      const unique = results.filter((c) => {
        const key = formatLocation(c.name, c.country).toLowerCase();
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });

      return unique.slice(0, 3);
    } catch {
      return [];
    }
  }

  renderCityList(cities) {
    /* A refreshed list keeps the highlighted city while it is still offered, so an answer landing mid-selection does not undo the arrow keys */
    const highlighted = this.list.querySelectorAll('li')[this.selIndex]?.textContent;
    this.list.innerHTML = '';
    this.selIndex = -1;

    cities.forEach((c, i) => {
      const li = document.createElement('li');
      li.textContent = formatLocation(c.name, c.country);
      if (li.textContent === highlighted) this.selIndex = i;

      /* Each suggestion is an option of the listbox so assistive technology can read the dropdown */
      li.id = `city-option-${i}`;
      li.setAttribute('role', 'option');
      li.setAttribute('aria-selected', 'false');

      /* Store city data for click handling */
      li.dataset.lat = c.latitude;
      li.dataset.lon = c.longitude;
      li.dataset.name = c.name;
      li.dataset.country = c.country || '';

      this.list.appendChild(li);
    });

    if (this.list.children.length) {
      this.input.classList.add('show');
    }

    this.input.setAttribute('aria-expanded', String(Boolean(this.list.children.length)));
    this.highlight();
  }

  /* Runs a search and drops its result if a newer search has started meanwhile */
  async updateSuggestions(query) {
    const token = ++this.searchToken;
    const cities = await this.searchCities(query);

    if (token !== this.searchToken) return false;

    if (cities.length) {
      this.renderCityList(cities);
    } else {
      this.clearList();
    }

    return true;
  }

  async fetchWeatherData(lat, lon) {
    const res = await fetch(buildWeatherUrl(lat, lon));
    if (!res.ok) throw new Error(`Weather request failed with status ${res.status}`);
    return res.json();
  }

  async showWeather(lat, lon, name, country) {
    try {
      const data = await this.fetchWeatherData(lat, lon);
      const display = createWeatherDisplay(data, name, country);

      if (!display) {
        window.alert('Weather unavailable');
        return false;
      }

      this.displayWeather(display);
      return true;
    } catch {
      window.alert('Failed to retrieve data');
      return false;
    }
  }

  async fetchWeatherByCity() {
    const city = this.input.value.trim();
    if (!city) return;

    this.showLoading();
    this.clearList();

    try {
      const res = await fetch(buildGeocodingUrl(city, 1));
      if (!res.ok) throw new Error(`Geocoding request failed with status ${res.status}`);
      const data = await res.json();

      if (!data.results?.length) {
        window.alert('City not found');
        this.hideLoading();
        return false;
      }

      const { latitude, longitude, name, country } = data.results[0];
      const success = await this.showWeather(latitude, longitude, name, country);
      this.hideLoading();
      return success;
    } catch {
      window.alert('Failed to load weather');
      this.hideLoading();
      return false;
    }
  }

  async fetchWeatherByLocation() {
    if (!navigator.geolocation) {
      window.alert('Geolocation not supported');
      return false;
    }

    this.showLoading();
    this.clearList();

    /* Wrap callback-based geolocation in a Promise */
    return new Promise((resolve) => {
      navigator.geolocation.getCurrentPosition(
        async (pos) => {
          const { latitude: lat, longitude: lon } = pos.coords;

          try {
            const res = await fetch(buildReverseGeocodeUrl(lat, lon));
            const data = await res.json();
            const { name, country } = parseReverseGeocodeResponse(data);
            await this.showWeather(lat, lon, name, country);
          } catch {
            await this.showWeather(lat, lon, 'Current Location', '');
          }

          this.hideLoading();
          resolve(true);
        },
        (err) => {
          this.hideLoading();
          window.alert('Location access denied: ' + err.message);
          resolve(false);
        }
      );
    });
  }

  handleKeydown(e) {
    const items = this.list.querySelectorAll('li');

    if (e.key === 'Enter') {
      e.preventDefault();
      if (this.selIndex > -1 && items[this.selIndex]) {
        items[this.selIndex].click();
      } else {
        this.fetchWeatherByCity();
      }
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (items.length > 0) {
        this.selIndex = (this.selIndex + 1) % items.length;
        this.highlight();
      }
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (items.length > 0) {
        /* Wrapping upward from the first option, or from no selection at all, lands on the last option */
        this.selIndex = this.selIndex <= 0 ? items.length - 1 : this.selIndex - 1;
        this.highlight();
      }
    } else if (e.key === 'Escape') {
      this.clearList();
    }
  }
}

/* --- Browser UI --- */
if (typeof document !== 'undefined' && document.getElementById('cityField')) {
  const input = document.getElementById('cityField');
  const list = document.getElementById('cityList');
  const loader = document.getElementById('spinner');

  if (input && list && loader) {
    const app = new WeatherApp({
      input,
      list,
      loader,
      weatherBox: document.getElementById('weatherBox'),
      locName: document.getElementById('locName'),
      cond: document.getElementById('cond'),
      temp: document.getElementById('temp'),
      feel: document.getElementById('feel'),
      humid: document.getElementById('humid'),
      windSpd: document.getElementById('windSpd')
    });

    const geoButton = document.getElementById('geoBtn');

    if (geoButton) {
      geoButton.addEventListener('click', () => app.fetchWeatherByLocation());
    }

    /* Waiting for a pause in typing keeps one request per search rather than one per keystroke. The
       window is 500ms so a whole burst still coalesces into one request even when the browser delivers
       the keystrokes in slow clumps (as mobile WebKit does under automation), while staying responsive
       for a real user, who rarely pauses half a second mid-word */
    const suggest = debounce(() => {
      const val = input.value.trim();

      if (!val) {
        app.clearList();
        return;
      }

      app.updateSuggestions(val);
    }, 500);

    input.addEventListener('input', suggest);

    document.addEventListener('click', (e) => {
      if (!input.contains(e.target) && !list.contains(e.target)) {
        suggest.cancel();
        app.clearList();
      }
    });

    list.addEventListener('click', (e) => {
      const li = e.target.closest('li');
      if (!li) return;

      const { lat, lon, name, country } = li.dataset;
      suggest.cancel();
      input.value = formatLocation(name, country);
      app.clearList();
      app.showWeather(lat, lon, name, country);
    });

    /* Escape and Enter settle the search, so suggestions still waiting for a pause in typing are dropped rather than reopening the list */
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' || e.key === 'Enter') suggest.cancel();
      app.handleKeydown(e);
    });

    /* Once a frame, however many resize events arrive in it */
    let refit = 0;
    window.addEventListener('resize', () => {
      cancelAnimationFrame(refit);
      refit = requestAnimationFrame(() => app.refitCard());
    });

    /* Background rain effect */
    const rain = document.createElement('div');
    rain.className = 'rain-bg';
    document.body.prepend(rain);
    initRainEffect(rain, 50);
  }
}