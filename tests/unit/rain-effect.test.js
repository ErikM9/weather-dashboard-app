import { jest } from '@jest/globals';
import { createRaindrop, initRainEffect } from '../../src/scripts.js';

describe('createRaindrop', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('builds a drop at the bottom of every random range', () => {
    jest.spyOn(Math, 'random').mockReturnValue(0);

    const drop = createRaindrop();

    expect(drop.tagName).toBe('DIV');
    expect(drop.className).toBe('drop');
    expect(drop.style.left).toBe('0vw');
    expect(drop.style.animationDuration).toBe('0.3s');
    expect(drop.style.animationDelay).toBe('0s');
    expect(drop.style.opacity).toBe('0.3');
  });

  it('builds a drop from the middle of every random range', () => {
    jest.spyOn(Math, 'random').mockReturnValue(0.5);

    const drop = createRaindrop();

    expect(drop.style.left).toBe('50vw');
    expect(drop.style.animationDuration).toBe('0.8s');
    expect(drop.style.animationDelay).toBe('1s');
    expect(drop.style.opacity).toBe('0.55');
  });
});

describe('initRainEffect', () => {
  it('fills the container with the requested number of drops', () => {
    const container = document.createElement('div');

    initRainEffect(container, 10);

    expect(container.children).toHaveLength(10);
    Array.from(container.children).forEach((child) => expect(child.className).toBe('drop'));
  });

  it('adds 50 drops when no count is given', () => {
    const container = document.createElement('div');

    initRainEffect(container);

    expect(container.children).toHaveLength(50);
  });

  it('adds nothing when asked for no drops', () => {
    const container = document.createElement('div');

    initRainEffect(container, 0);

    expect(container.children).toHaveLength(0);
  });
});