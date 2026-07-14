global.ResizeObserver = class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
};

Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: jest.fn().mockImplementation((query) => ({
    matches: false,
    media: query,
    addEventListener: jest.fn(),
    removeEventListener: jest.fn()
  }))
});

jest.mock('nanoid', () => {
  return {
    nanoid: () => {}
  };
});

jest.mock('strip-json-comments', () => {
  return {
    stripJsonComments: (str) => str
  };
});
