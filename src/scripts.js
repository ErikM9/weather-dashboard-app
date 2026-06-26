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
    condition: `${getWeatherIcon(code)} ${getWeatherDescription(code)}`,
    temperature: `Temperature: ${data.current.temperature_2m} °C`,
    feelsLike: `Feels Like: ${data.current.apparent_temperature} °C`,
    humidity: `Humidity: ${data.current.relative_humidity_2m}%`,
    windSpeed: `Wind Speed: ${data.current.wind_speed_10m} m/s`
  };
};

const buildGeocodingUrl = (cityName, count = 1) => {
  return `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(cityName)}&count=${count}`;
};

const buildWeatherUrl = (lat, lon) => {
  return `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=weather_code,temperature_2m,apparent_temperature,relative_humidity_2m,wind_speed_10m`;
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

export const initRainEffect = (container, dropCount = 50) => {
  for (let i = 0; i < dropCount; i++) {
    container.appendChild(createRaindrop());
  }
};

export class WeatherApp {
  constructor(elements) {
    Object.assign(this, elements);
    this.selIndex = -1;
  }

  clearList() {
    this.list.innerHTML = '';
    this.selIndex = -1;
    this.input.classList.remove('show');
  }

  /* Highlight the currently selected dropdown item */
  highlight() {
    this.list.querySelectorAll('li').forEach((li, i) => {
      li.classList.toggle('active', i === this.selIndex);
    });
  }

  showLoading() {
    this.loader.style.display = 'block';
    this.weatherBox.style.display = 'none';
  }

  hideLoading() {
    this.loader.style.display = 'none';
  }

  displayWeather(weatherDisplay) {
    this.locName.innerText = weatherDisplay.location;
    this.cond.innerHTML = weatherDisplay.condition;
    this.temp.innerText = weatherDisplay.temperature;
    this.feel.innerText = weatherDisplay.feelsLike;
    this.humid.innerText = weatherDisplay.humidity;
    this.windSpd.innerText = weatherDisplay.windSpeed;
    this.weatherBox.style.display = 'block';
  }

  async searchCities(query) {
    if (!query) return [];

    try {
      const url = buildGeocodingUrl(query, 10);
      const res = await fetch(url);
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
    this.list.innerHTML = '';
    this.selIndex = -1;

    cities.forEach((c) => {
      const li = document.createElement('li');
      li.textContent = formatLocation(c.name, c.country);

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

    this.highlight();
  }

  async fetchWeatherData(lat, lon) {
    const res = await fetch(buildWeatherUrl(lat, lon));
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
        /* Keep index positive when wrapping upward */
        this.selIndex = (this.selIndex - 1 + items.length) % items.length;
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

    /* Expose for inline HTML handlers */
    window.locWeather = () => app.fetchWeatherByLocation();

    document.addEventListener('click', (e) => {
      if (!input.contains(e.target) && !list.contains(e.target)) {
        app.clearList();
      }
    });

    input.addEventListener('input', async () => {
      const val = input.value.trim();

      if (!val) {
        app.clearList();
        return;
      }

      const cities = await app.searchCities(val);

      if (cities.length) {
        app.renderCityList(cities);
      } else {
        app.clearList();
      }
    });

    list.addEventListener('click', (e) => {
      const li = e.target.closest('li');
      if (!li) return;

      const { lat, lon, name, country } = li.dataset;
      input.value = formatLocation(name, country);
      app.clearList();
      app.showWeather(lat, lon, name, country);
    });

    input.addEventListener('keydown', (e) => app.handleKeydown(e));

    /* Background rain effect */
    const rain = document.createElement('div');
    rain.className = 'rain-bg';
    document.body.prepend(rain);
    initRainEffect(rain, 50);
  }
}