import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const indexHtml = readFileSync(fileURLToPath(new URL('../../src/index.html', import.meta.url)), 'utf8');

/* Renders the real page markup so tests use the same ids and ARIA attributes the browser gets */
export function renderPage() {
  document.body.innerHTML = indexHtml
    .replace(/[\s\S]*<body>/, '')
    .replace(/<\/body>[\s\S]*/, '')
    .replace(/<script[\s\S]*?<\/script>/g, '');
}

export const pageElements = () => ({
  input: document.getElementById('cityField'),
  list: document.getElementById('cityList'),
  loader: document.getElementById('spinner'),
  weatherBox: document.getElementById('weatherBox'),
  locName: document.getElementById('locName'),
  cond: document.getElementById('cond'),
  temp: document.getElementById('temp'),
  feel: document.getElementById('feel'),
  humid: document.getElementById('humid'),
  windSpd: document.getElementById('windSpd')
});

export const suggestionTexts = () =>
  Array.from(document.querySelectorAll('#cityList li')).map((li) => li.textContent);