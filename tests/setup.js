import '@testing-library/jest-dom';
import { jest } from '@jest/globals';

/* jsdom has no working alert, geolocation or network, so every test starts with fresh stubs it can assert against */
beforeEach(() => {
  window.alert = jest.fn();
  Object.defineProperty(navigator, 'geolocation', { configurable: true, value: { getCurrentPosition: jest.fn() } });
  /* A request which a test has not mocked fails loudly instead of reaching the network */
  global.fetch = jest.fn((url) => Promise.reject(new Error(`Unmocked request to ${url}`)));
});

afterEach(() => {
  jest.restoreAllMocks();
});