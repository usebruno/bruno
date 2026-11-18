export const normalizeMockTabType = (type) => (
  type === 'mock-server-dashboard' || type === 'mocker' ? 'mock-server' : type
);
