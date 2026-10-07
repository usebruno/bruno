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

  it('handles OpenAPI 3.2 versions with pre-release or build metadata', () => {
    const prerelease = { openapi: '3.2.0-alpha.1', info: { title: 'Pre-release' } };
    expect(normalizeOpenApiVersionForSwagger(prerelease)).toEqual({
      openapi: '3.1.0',
      info: { title: 'Pre-release' }
    });

    const build = { openapi: '3.2.0+build.123', info: { title: 'Build' } };
    expect(normalizeOpenApiVersionForSwagger(build)).toEqual({
      openapi: '3.1.0',
      info: { title: 'Build' }
    });

    const yamlPrerelease = 'openapi: 3.2.0-rc.1\ninfo:\n  title: RC\n';
    expect(normalizeOpenApiVersionForSwagger(yamlPrerelease)).toEqual({
      openapi: '3.1.0',
      info: { title: 'RC' }
    });
  });

  it('does not modify non-object parsed results (scalars, arrays, null)', () => {
    const jsonString = '"just a string"';
    expect(normalizeOpenApiVersionForSwagger(jsonString)).toBe(jsonString);

    const jsonArray = '[1, 2, 3]';
    expect(normalizeOpenApiVersionForSwagger(jsonArray)).toBe(jsonArray);

    const yamlScalar = 'hello: world';
    expect(normalizeOpenApiVersionForSwagger(yamlScalar)).toBe(yamlScalar);
  });

  it('does not normalize Swagger 2.0 or OpenAPI 3.0.x/3.1.x versions', () => {
    const swagger2 = { swagger: '2.0', info: { title: 'Swagger 2' } };
    expect(normalizeOpenApiVersionForSwagger(swagger2)).toBe(swagger2);

    const oas30 = { openapi: '3.0.3', info: { title: 'OAS 3.0' } };
    expect(normalizeOpenApiVersionForSwagger(oas30)).toBe(oas30);

    const oas31 = { openapi: '3.1.0', info: { title: 'OAS 3.1' } };
    expect(normalizeOpenApiVersionForSwagger(oas31)).toBe(oas31);
  });

  it('trims whitespace from version string before matching', () => {
    const spec = { openapi: '  3.2.0  ', info: { title: 'Whitespace' } };
    expect(normalizeOpenApiVersionForSwagger(spec).openapi).toBe('3.1.0');
  });

  it('returns input as-is for null, undefined, arrays, and non-object inputs', () => {
    expect(normalizeOpenApiVersionForSwagger(null)).toBeNull();
    expect(normalizeOpenApiVersionForSwagger(undefined)).toBeUndefined();
    const arr = [1, 2, 3];
    expect(normalizeOpenApiVersionForSwagger(arr)).toBe(arr);
    expect(normalizeOpenApiVersionForSwagger(42)).toBe(42);
  });
});
