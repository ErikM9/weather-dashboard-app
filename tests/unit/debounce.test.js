import { jest } from '@jest/globals';
import { debounce } from '../../src/scripts.js';

describe('debounce', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('runs once with the last arguments after the calls stop', () => {
    const fn = jest.fn();
    const debounced = debounce(fn, 250);

    debounced('L');
    debounced('Lo');
    debounced('London');

    expect(fn).not.toHaveBeenCalled();

    jest.advanceTimersByTime(249);
    expect(fn).not.toHaveBeenCalled();

    jest.advanceTimersByTime(1);
    expect(fn).toHaveBeenCalledTimes(1);
    expect(fn).toHaveBeenCalledWith('London');
  });

  it('runs again for a later burst of calls', () => {
    const fn = jest.fn();
    const debounced = debounce(fn, 250);

    debounced('Paris');
    jest.advanceTimersByTime(250);
    debounced('Rome');
    jest.advanceTimersByTime(250);

    expect(fn).toHaveBeenCalledTimes(2);
  });

  it('drops a call that is still waiting when cancelled', () => {
    const fn = jest.fn();
    const debounced = debounce(fn, 250);

    debounced('London');
    debounced.cancel();
    jest.advanceTimersByTime(250);

    expect(fn).not.toHaveBeenCalled();
  });

  it('waits 250ms by default', () => {
    const fn = jest.fn();

    debounce(fn)();
    jest.advanceTimersByTime(249);
    expect(fn).not.toHaveBeenCalled();

    jest.advanceTimersByTime(1);
    expect(fn).toHaveBeenCalledTimes(1);
  });
});