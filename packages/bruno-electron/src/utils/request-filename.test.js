const { getHttpRequestFilenameBase, getUniqueRequestFilename, normalizeRequestFilename } = require('./request-filename');

describe('request filename helpers', () => {
  it('generates method-aware HTTP request filenames from display names', () => {
    expect(getHttpRequestFilenameBase('/projects', 'GET')).toBe('GET projects');
    expect(getHttpRequestFilenameBase('/projects', 'POST')).toBe('POST projects');
    expect(getHttpRequestFilenameBase('/projects/{id}', 'PUT')).toBe('PUT projects-{id}');
  });

  it('normalizes request filename extensions for collection format', () => {
    expect(normalizeRequestFilename('GET projects.bru', 'yml')).toBe('GET projects.yml');
    expect(normalizeRequestFilename('POST projects', 'bru')).toBe('POST projects.bru');
  });

  it('adds counters to filenames only when paths collide', () => {
    const existing = new Set(['GET projects.bru']);
    const item = {
      type: 'http-request',
      name: '/projects',
      request: { method: 'GET' }
    };

    expect(getUniqueRequestFilename(item, 'bru', (filename) => existing.has(filename))).toBe('GET projects 1.bru');
  });
});
