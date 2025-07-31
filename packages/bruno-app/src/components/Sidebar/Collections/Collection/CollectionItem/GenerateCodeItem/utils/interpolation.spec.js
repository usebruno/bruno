import { interpolateHeaders, interpolateBody, interpolateUrl, interpolateUrlPathParams, createVariablesObject } from './interpolation';

describe('interpolation utils', () => {
  describe('interpolateHeaders', () => {
    it('should interpolate variables in header name and value while preserving other props', () => {
      const headers = [
        { uid: '1', name: 'X-{{var}}', value: 'value-{{var}}', enabled: true }
      ];
      const variables = createVariablesObject({
        globalEnvironmentVariables: { var: 'test' }
      });

      const result = interpolateHeaders(headers, variables);
      expect(result).toEqual([
        {
          uid: '1',
          name: 'X-test',
          value: 'value-test',
          enabled: true
        }
      ]);
    });
  });

  describe('interpolateBody', () => {
    it('should interpolate JSON body strings and keep formatting', () => {
      const body = {
        mode: 'json',
        json: '{"name": "{{username}}"}'
      };
      const variables = createVariablesObject({
        globalEnvironmentVariables: { username: 'bruno' }
      });

      const result = interpolateBody(body, variables);
      expect(result.json).toBe('{\n  "name": "bruno"\n}');
    });

    it('should interpolate text body', () => {
      const body = {
        mode: 'text',
        text: 'Hello {{name}}'
      };
      const variables = createVariablesObject({
        globalEnvironmentVariables: { name: 'World' }
      });
      const result = interpolateBody(body, variables);
      expect(result.text).toBe('Hello World');
    });

    it('should return null when body is null', () => {
      const variables = createVariablesObject({ globalEnvironmentVariables: { a: 1 } });
      expect(interpolateBody(null, variables)).toBeNull();
    });
  });
});

describe('Url Utils - interpolateUrl, interpolateUrlPathParams', () => {
  it('should interpolate url correctly', () => {
    const url = '{{host}}/api/:id/path?foo={{foo}}&bar={{bar}}&baz={{process.env.baz}}';
    const expectedUrl = 'https://example.com/api/:id/path?foo=foo_value&bar=bar_value&baz=baz_value';

    const variables = createVariablesObject({
      globalEnvironmentVariables: {
        host: 'https://example.com',
        foo: 'foo_value',
        bar: 'bar_value'
      },
      collectionVars: {},
      runtimeVariables: {},
      processEnvVars: { baz: 'baz_value' }
    });

    const result = interpolateUrl({ url, variables });

    expect(result).toEqual(expectedUrl);
  });

  it('should interpolate path params correctly', () => {
    const url = 'https://example.com/api/:id/path';
    const params = [{ name: 'id', type: 'path', enabled: true, value: '123' }];
    const expectedUrl = 'https://example.com/api/123/path';

    const result = interpolateUrlPathParams(url, params);

    expect(result).toEqual(expectedUrl);
  });

  it('should interpolate url and path params correctly', () => {
    const url = '{{host}}/api/:id/path?foo={{foo}}&bar={{bar}}&baz={{process.env.baz}}';
    const params = [{ name: 'id', type: 'path', enabled: true, value: '123' }];
    const expectedUrl = 'https://example.com/api/123/path?foo=foo_value&bar=bar_value&baz=baz_value';

    const variables = createVariablesObject({
      globalEnvironmentVariables: {
        host: 'https://example.com',
        foo: 'foo_value',
        bar: 'bar_value'
      },
      collectionVars: {},
      runtimeVariables: {},
      processEnvVars: { baz: 'baz_value' }
    });

    const intermediateResult = interpolateUrl({ url, variables });
    const result = interpolateUrlPathParams(intermediateResult, params);

    expect(result).toEqual(expectedUrl);
  });

  it('should handle empty params', () => {
    const url = 'https://example.com/api';
    const params = [];
    const expectedUrl = 'https://example.com/api';

    const result = interpolateUrlPathParams(url, params);

    expect(result).toEqual(expectedUrl);
  });

  it('should handle invalid URL, case 1', () => {
    const url = 'example.com/api/:id';
    const params = [{ name: 'id', type: 'path', enabled: true, value: '123' }];
    const expectedUrl = 'http://example.com/api/123';

    const result = interpolateUrlPathParams(url, params);

    expect(result).toEqual(expectedUrl);
  });

  it('should handle invalid URL, case 2', () => {
    const url = 'http://1.1.1.1:3000:id';
    const params = [{ name: 'id', type: 'path', enabled: true, value: '123' }];
    const expectedUrl = 'http://1.1.1.1:3000:id';

    const result = interpolateUrlPathParams(url, params);

    expect(result).toEqual(expectedUrl);
  });
});