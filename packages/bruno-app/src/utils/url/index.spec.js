import { splitOnFirst, parsePathParams, interpolateUrl, interpolateUrlPathParams } from './index';

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

  it('should parse path param inside parentheses and quotes', () => {
    const params = parsePathParams('https://example.com/ExchangeRates(\':ExchangeRateOID\')');
    expect(params).toEqual([{ name: 'ExchangeRateOID', value: '' }]);
  });

  it('should parse path param inside parentheses and no quotes', () => {
    const params = parsePathParams('https://example.com/ExchangeRates(:ExchangeRateOID)');
    expect(params).toEqual([{ name: 'ExchangeRateOID', value: '' }]);
  });

  it('should parse multiple path params inside parentheses', () => {
    const params = parsePathParams('https://example.com/Exchange(:ExchangeId)/ExchangeRates(:ExchangeRateOID)');
    expect(params).toEqual([{ name: 'ExchangeId', value: '' }, { name: 'ExchangeRateOID', value: '' }]);
  });

  it('should parse mix and match of normal and param inside parentheses', () => {
    const params = parsePathParams('https://example.com/Exchange(:ExchangeId)/:key');
    expect(params).toEqual([{ name: 'ExchangeId', value: '' }, { name: 'key', value: '' }]);
  });

  // OData-specific test cases for enhanced path parameter parsing
  it('should parse OData entity key with single quotes', () => {
    const params = parsePathParams('https://example.com/odata/Products(\':productId\')');
    expect(params).toEqual([{ name: 'productId', value: '' }]);
  });

  it('should parse OData entity key with double quotes', () => {
    const params = parsePathParams('https://example.com/odata/Products(":productId")');
    expect(params).toEqual([{ name: 'productId', value: '' }]);
  });

  it('should parse OData entity key with backticks', () => {
    const params = parsePathParams('https://example.com/odata/Products(`:productId`)');
    expect(params).toEqual([{ name: 'productId', value: '' }]);
  });

  it('should parse OData entity key with parentheses only', () => {
    const params = parsePathParams('https://example.com/odata/Products(:productId)');
    expect(params).toEqual([{ name: 'productId', value: '' }]);
  });

  it('should parse OData composite key with multiple parameters', () => {
    const params = parsePathParams('https://example.com/odata/Orders(:orderId,ProductId=\':productId\')');
    expect(params).toEqual([{ name: 'orderId', value: '' }, { name: 'productId', value: '' }]);
  });

  it('should parse OData navigation property with key', () => {
    const params = parsePathParams('https://example.com/odata/Orders(:orderId)/Items(\':itemId\')');
    expect(params).toEqual([{ name: 'orderId', value: '' }, { name: 'itemId', value: '' }]);
  });

  it('should parse OData function with parameters', () => {
    const params = parsePathParams('https://example.com/odata/GetProductsByCategory(categoryId=\':categoryId\')');
    expect(params).toEqual([{ name: 'categoryId', value: '' }]);
  });

  it('should parse OData action with complex parameters', () => {
    const params = parsePathParams('https://example.com/odata/Products(\':productId\')/Rate(rating=:rating,comment=\':comment\')');
    expect(params).toEqual([{ name: 'productId', value: '' }, { name: 'rating', value: '' }, { name: 'comment', value: '' }]);
  });

  it('should handle OData parameters with special characters in names', () => {
    const params = parsePathParams('https://example.com/odata/Products(\':product-id\')');
    expect(params).toEqual([{ name: 'product', value: '' }]);
  });

  it('should handle OData parameters with underscores in names', () => {
    const params = parsePathParams('https://example.com/odata/Products(\':product_id\')');
    expect(params).toEqual([{ name: 'product_id', value: '' }]);
  });

  it('should handle OData parameters with mixed quote types', () => {
    const params = parsePathParams('https://example.com/odata/Products(\':productId\')/Categories(":categoryId")');
    expect(params).toEqual([{ name: 'productId', value: '' }, { name: 'categoryId', value: '' }]);
  });

  it('should handle OData parameters with nested parentheses', () => {
    const params = parsePathParams('https://example.com/odata/Products((\':productId\'))');
    expect(params).toEqual([{ name: 'productId', value: '' }]);
  });

  it('should handle OData parameters with complex nested structures', () => {
    const params = parsePathParams('https://example.com/odata/Orders(:orderId)/Items(\':itemId\')/Properties(\':propName\')');
    expect(params).toEqual([{ name: 'orderId', value: '' }, { name: 'itemId', value: '' }, { name: 'propName', value: '' }]);
  });

  it('should handle OData parameters with query options in path', () => {
    const params = parsePathParams('https://example.com/odata/Products(\':productId\')?$expand=Category');
    expect(params).toEqual([{ name: 'productId', value: '' }]);
  });

  it('should handle OData parameters with multiple segments and mixed syntax', () => {
    const params = parsePathParams('https://example.com/odata/Orders(:orderId)/Items(\':itemId\')/Properties(:propName)');
    expect(params).toEqual([{ name: 'orderId', value: '' }, { name: 'itemId', value: '' }, { name: 'propName', value: '' }]);
  });

  it('should handle OData parameters with empty string values', () => {
    const params = parsePathParams('https://example.com/odata/Products(\'\')');
    expect(params).toEqual([]);
  });

  it('should handle OData parameters with function calls in parentheses', () => {
    const params = parsePathParams('https://example.com/odata/Products(GetId(\':productId\'))');
    expect(params).toEqual([{ name: 'productId', value: '' }]);
  });

  it('should handle OData parameters with escaped quotes', () => {
    const params = parsePathParams('https://example.com/odata/Products(\'ABC\'\'123\')');
    expect(params).toEqual([]);
  });

  it('should handle OData parameters with spaces in quotes', () => {
    const params = parsePathParams('https://example.com/odata/Products(\'Product Name With Spaces\')');
    expect(params).toEqual([]);
  });

  it('should handle OData parameters with numeric keys', () => {
    const params = parsePathParams('https://example.com/odata/Products(12345)');
    expect(params).toEqual([]);
  });

  it('should handle OData parameters with GUID keys', () => {
    const params = parsePathParams('https://example.com/odata/Products(\'123e4567-e89b-12d3-a456-426614174000\')');
    expect(params).toEqual([]);
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

    const result = interpolateUrl({ url, variables: { host: 'https://example.com', foo: 'foo_value', bar: 'bar_value', 'process.env.baz': 'baz_value' } });

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

    const intermediateResult = interpolateUrl({ url, variables: { host: 'https://example.com', foo: 'foo_value', bar: 'bar_value', 'process.env.baz': 'baz_value' } });
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
