import { getHttpRequestFilenameBase, normalizeRequestFilename } from './requestFilename';

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
});
