import normalizeOpenApiVersionForSwagger from './normalize-openapi-version';

describe('normalizeOpenApiVersionForSwagger', () => {
  it('normalizes only the root OpenAPI 3.2 version in object specs', () => {
    const spec = {
      openapi: '3.2.1',
      info: { title: 'Example', version: '3.2.1' },
      example: { openapi: '3.2.0' }
    };

    expect(normalizeOpenApiVersionForSwagger(spec)).toEqual({
      ...spec,
      openapi: '3.1.0'
    });
    expect(spec.openapi).toBe('3.2.1');
  });

  it('parses and normalizes JSON and YAML strings for preview', () => {
    expect(normalizeOpenApiVersionForSwagger('{"openapi":"3.2.0","info":{"title":"Example"}}')).toEqual({
      openapi: '3.1.0',
      info: { title: 'Example' }
    });
    expect(normalizeOpenApiVersionForSwagger('openapi: 3.2.1\ninfo:\n  title: Example\n')).toEqual({
      openapi: '3.1.0',
      info: { title: 'Example' }
    });
  });

  it('preserves the original string when parsing fails or no normalization is needed', () => {
    const invalid = 'openapi: 3.2.0\ninfo: [';
    const supported = 'openapi: 3.1.0\ninfo:\n  title: Example\n';

    expect(normalizeOpenApiVersionForSwagger(invalid)).toBe(invalid);
    expect(normalizeOpenApiVersionForSwagger(supported)).toBe(supported);
  });
});
