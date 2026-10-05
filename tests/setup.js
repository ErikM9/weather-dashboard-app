import '@testing-library/jest-dom';
import { jest } from '@jest/globals';

/* Neither of these exists in jsdom, so tests get spies they can assert against */
Object.defineProperty(window, 'alert', {
  writable: true,
  value: jest.fn()
});

Object.defineProperty(navigator, 'geolocation', {
  writable: true,
  value: { getCurrentPosition: jest.fn() }
});

/* Any request a test has not mocked fails loudly instead of reaching the network */
beforeEach(() => {
  jest.clearAllMocks();
  global.fetch = jest.fn((url) => Promise.reject(new Error(`Unmocked request to ${url}`)));
});