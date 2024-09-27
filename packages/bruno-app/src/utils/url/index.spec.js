import { parseQueryParams, splitOnFirst, parsePathParams, interpolateUrl, interpolateUrlPathParams } from './index';

describe('Url Utils - parseQueryParams', () => {
  it('should parse query - case 1', () => {
    const params = parseQueryParams('');
    expect(params).toEqual([]);
  });

  it('should parse query - case 2', () => {
    const params = parseQueryParams('a');
    expect(params).toEqual([{ name: 'a', value: '' }]);
  });

  it('should parse query - case 3', () => {
    const params = parseQueryParams('a=');
    expect(params).toEqual([{ name: 'a', value: '' }]);
  });

  it('should parse query - case 4', () => {
    const params = parseQueryParams('a=1');
    expect(params).toEqual([{ name: 'a', value: '1' }]);
  });

  it('should parse query - case 5', () => {
    const params = parseQueryParams('a=1&');
    expect(params).toEqual([{ name: 'a', value: '1' }]);
  });

  it('should parse query - case 6', () => {
    const params = parseQueryParams('a=1&b');
    expect(params).toEqual([
      { name: 'a', value: '1' },
      { name: 'b', value: '' }
    ]);
  });

  it('should parse query - case 7', () => {
    const params = parseQueryParams('a=1&b=');
    expect(params).toEqual([
      { name: 'a', value: '1' },
      { name: 'b', value: '' }
    ]);
  });

  it('should parse query - case 8', () => {
    const params = parseQueryParams('a=1&b=2');
    expect(params).toEqual([
      { name: 'a', value: '1' },
      { name: 'b', value: '2' }
    ]);
  });

  it('should parse query with "=" character - case 9', () => {
    const params = parseQueryParams('a=1&b={color=red,size=large}&c=3');
    expect(params).toEqual([
      { name: 'a', value: '1' },
      { name: 'b', value: '{color=red,size=large}' },
      { name: 'c', value: '3' }
    ]);
  });

  it('should parse query with fragment - case 10', () => {
    const params = parseQueryParams('a=1&b=2#I-AM-FRAGMENT');
    expect(params).toEqual([
      { name: 'a', value: '1' },
      { name: 'b', value: '2' }
    ]);
  });
});

describe('Url Utils - parsePathParams', () => {
  it('should parse path - case 1', () => {
    const params = parsePathParams('www.example.com');
    expect(params).toEqual([]);
  });

  it('should parse path - case 2', () => {
    const params = parsePathParams('http://www.example.com');
    expect(params).toEqual([]);
  });

  it('should parse path - case 3', () => {
    const params = parsePathParams('https://www.example.com');
    expect(params).toEqual([]);
  });

  it('should parse path - case 4', () => {
    const params = parsePathParams('https://www.example.com/users/:id');
    expect(params).toEqual([{ name: 'id', value: '' }]);
  });

  it('should parse path - case 5', () => {
    const params = parsePathParams('https://www.example.com/users/:id/');
    expect(params).toEqual([{ name: 'id', value: '' }]);
  });

  it('should parse path - case 6', () => {
    const params = parsePathParams('https://www.example.com/users/:id/:');
    expect(params).toEqual([{ name: 'id', value: '' }]);
  });

  it('should parse path - case 7', () => {
    const params = parsePathParams('https://www.example.com/users/:id/posts/:id');
    expect(params).toEqual([{ name: 'id', value: '' }]);
  });

  it('should parse path - case 8', () => {
    const params = parsePathParams('https://www.example.com/users/:id/posts/:postId');
    expect(params).toEqual([
      { name: 'id', value: '' },
      { name: 'postId', value: '' }
    ]);
  });
});

describe('Url Utils - splitOnFirst', () => {
  it('should split on first - case 1', () => {
    const params = splitOnFirst('a', '=');
    expect(params).toEqual(['a']);
  });

  it('should split on first - case 2', () => {
    const params = splitOnFirst('a=', '=');
    expect(params).toEqual(['a', '']);
  });

  it('should split on first - case 3', () => {
    const params = splitOnFirst('a=1', '=');
    expect(params).toEqual(['a', '1']);
  });

  it('should split on first - case 4', () => {
    const params = splitOnFirst('a=1&b=2', '=');
    expect(params).toEqual(['a', '1&b=2']);
  });

  it('should split on first - case 5', () => {
    const params = splitOnFirst('a=1&b=2', '&');
    expect(params).toEqual(['a=1', 'b=2']);
  });
});

describe('Url Utils - interpolateUrl, interpolateUrlPathParams', () => {
  it('should interpolate url correctly', () => {
    const url = '{{host}}/api/:id/path?foo={{foo}}&bar={{bar}}&baz={{process.env.baz}}';
    const expectedUrl = 'https://example.com/api/:id/path?foo=foo_value&bar=bar_value&baz=baz_value';

    const envVars = { host: 'https://example.com', foo: 'foo_value' };
    const runtimeVariables = { bar: 'bar_value' };
    const processEnvVars = { baz: 'baz_value' };

    const result = interpolateUrl({ url, envVars, runtimeVariables, processEnvVars });

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

    const envVars = { host: 'https://example.com', foo: 'foo_value' };
    const runtimeVariables = { bar: 'bar_value' };
    const processEnvVars = { baz: 'baz_value' };

    const intermediateResult = interpolateUrl({ url, envVars, runtimeVariables, processEnvVars });
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
