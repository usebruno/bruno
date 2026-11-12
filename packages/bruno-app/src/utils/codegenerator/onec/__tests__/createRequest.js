export const createRequest = (overrides = {}) => ({
  method: 'GET',
  url: 'https://example.com/',
  fullUrl: 'https://example.com/',
  ...overrides
});
