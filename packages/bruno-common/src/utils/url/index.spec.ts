import { encodeUrl, parseQueryParams, buildQueryString, safeDecodeURIComponent } from './index';

describe('encodeUrl', () => {
  describe('basic functionality', () => {
    it('should return the original URL when query string is empty', () => {
      const url = 'https://example.com/path?';
      expect(encodeUrl(url)).toBe(url);
    });

    it('should preserve URLs without query parameters', () => {
      const url = 'https://api.example.com/v1/users';
      expect(encodeUrl(url)).toBe(url);
    });
  });

  describe('query parameter encoding', () => {
    it('should handle a single query parameter', () => {
      const url = 'https://example.com/api?name=john';
      const expected = 'https://example.com/api?name=john';
      expect(encodeUrl(url)).toBe(expected);
    });

    it('should handle simple query parameters', () => {
      const url = 'https://example.com/api?name=john&age=25';
      const expected = 'https://example.com/api?name=john&age=25';
      expect(encodeUrl(url)).toBe(expected);
    });

    it('should encode query parameters with special characters', () => {
      const url = 'https://example.com/api?name=john doe&email=john@example.com';
      const expected = 'https://example.com/api?name=john%20doe&email=john%40example.com';
      expect(encodeUrl(url)).toBe(expected);
    });

    it('should encode query parameters with special URL characters', () => {
      const url = 'https://example.com/api?path=/users/123&redirect=https://other.com';
      const expected = 'https://example.com/api?path=%2Fusers%2F123&redirect=https%3A%2F%2Fother.com';
      expect(encodeUrl(url)).toBe(expected);
    });

    it('should encode query parameters with unicode characters', () => {
      const url = 'https://example.com/api?name=José&city=München';
      const expected = 'https://example.com/api?name=Jos%C3%A9&city=M%C3%BCnchen';
      expect(encodeUrl(url)).toBe(expected);
    });

    it('should handle query parameters with empty values', () => {
      const url = 'https://example.com/api?name=&age=25&active=';
      const expected = 'https://example.com/api?name=&age=25&active=';
      expect(encodeUrl(url)).toBe(expected);
    });

    it('should handle query parameters without values (no = sign)', () => {
      const url = 'https://example.com/api?flag&age=25&verbose';
      const expected = 'https://example.com/api?flag&age=25&verbose';
      expect(encodeUrl(url)).toBe(expected);
    });

    it('should handle mixed empty-value and no-value parameters', () => {
      const url = 'https://example.com/api?seat=&table=2&flag';
      const expected = 'https://example.com/api?seat=&table=2&flag';
      expect(encodeUrl(url)).toBe(expected);
    });

    it('should encode query parameters with pipe operator', () => {
      const url = 'https://example.com/api?filter=status|active&sort=name|asc&tags=frontend|backend|api';
      const expected = 'https://example.com/api?filter=status%7Cactive&sort=name%7Casc&tags=frontend%7Cbackend%7Capi';
      expect(encodeUrl(url)).toBe(expected);
    });

    it('should encode query parameters with pipe operator and spaces', () => {
      const url = 'https://example.com/api?categories=web development|mobile apps|data science&status=in progress|completed';
      const expected = 'https://example.com/api?categories=web%20development%7Cmobile%20apps%7Cdata%20science&status=in%20progress%7Ccompleted';
      expect(encodeUrl(url)).toBe(expected);
    });
  });

  describe('path segment encoding', () => {
    it('should encode reserved chars in path segments', () => {
      const url = 'https://example.com/api/list[123]';
      const expected = 'https://example.com/api/list%5B123%5D';
      expect(encodeUrl(url)).toBe(expected);
    });

    it('should encode spaces in path segments', () => {
      const url = 'https://example.com/my path/users';
      const expected = 'https://example.com/my%20path/users';
      expect(encodeUrl(url)).toBe(expected);
    });

    it('should preserve already-encoded path segments (idempotent)', () => {
      const url = 'https://example.com/users/aaa%2Fbbb';
      const expected = 'https://example.com/users/aaa%2Fbbb';
      expect(encodeUrl(url)).toBe(expected);
    });

    it('should preserve OData-style parenthesized path segments', () => {
      const url = 'https://example.com/odata/Products(123)/Categories(456)';
      const expected = 'https://example.com/odata/Products(123)/Categories(456)';
      expect(encodeUrl(url)).toBe(expected);
    });

    it('should encode bare % in path', () => {
      const url = 'https://example.com/path/50%';
      const expected = 'https://example.com/path/50%25';
      expect(encodeUrl(url)).toBe(expected);
    });
  });

  describe('fragment handling (RFC 3986 §3.5)', () => {
    it('should drop fragment from URL', () => {
      const url = 'https://example.com/api?name=john doe#section1';
      const expected = 'https://example.com/api?name=john%20doe';
      expect(encodeUrl(url)).toBe(expected);
    });

    it('should drop fragment when there is no query string', () => {
      const url = 'https://example.com/api/users#section';
      const expected = 'https://example.com/api/users';
      expect(encodeUrl(url)).toBe(expected);
    });

    it('should drop fragment containing reserved chars', () => {
      const url = 'https://example.com/api?filter=status|active#results';
      const expected = 'https://example.com/api?filter=status%7Cactive';
      expect(encodeUrl(url)).toBe(expected);
    });
  });

  describe('edge cases', () => {
    it('should handle invalid input gracefully', () => {
      expect(encodeUrl('')).toBe('');
      expect(encodeUrl(null as any)).toBe(null);
      expect(encodeUrl(undefined as any)).toBe(undefined);
      expect(encodeUrl(123 as any)).toBe(123);
    });

    it('should handle URLs with multiple question marks', () => {
      const url = 'https://example.com/api?name=john?age=25';
      const expected = 'https://example.com/api?name=john%3Fage%3D25';
      expect(encodeUrl(url)).toBe(expected);
    });
  });

  describe('idempotency', () => {
    const cases: Array<[string, string]> = [
      ['https://x/api?q=hello world', 'https://x/api?q=hello%20world'],
      ['https://x/api?q=hello%20world', 'https://x/api?q=hello%20world'],
      ['https://x/api?q=50%', 'https://x/api?q=50%25'],
      ['https://x/api?q=50%25', 'https://x/api?q=50%25'],
      ['https://x/api/aaa[bbb]', 'https://x/api/aaa%5Bbbb%5D'],
      ['https://x/api/aaa%5Bbbb%5D', 'https://x/api/aaa%5Bbbb%5D'],
      ['https://x/api?token=abc==', 'https://x/api?token=abc%3D%3D'],
      ['https://x/api?token=abc%3D%3D', 'https://x/api?token=abc%3D%3D'],
      ['https://x/api?email=a@b.com', 'https://x/api?email=a%40b.com'],
      ['https://x/api?email=a%40b.com', 'https://x/api?email=a%40b.com'],
      ['https://x/api?name=john%20doe&email=john%40example.com', 'https://x/api?name=john%20doe&email=john%40example.com'],
      ['https://x/api?filter=status%7Cactive&sort=name%7Casc', 'https://x/api?filter=status%7Cactive&sort=name%7Casc']
    ];

    it.each(cases)('encodes %s correctly and stays idempotent', (input, expected) => {
      const once = encodeUrl(input);
      expect(once).toBe(expected);
      // Applying the encoder a second time must produce the same result.
      expect(encodeUrl(once)).toBe(expected);
    });
  });

  describe('real-world scenarios', () => {
    it('should handle API URLs with complex query parameters', () => {
      const url = 'https://api.github.com/search/repositories?q=language:javascript&sort=stars&order=desc&per_page=10';
      const expected = 'https://api.github.com/search/repositories?q=language%3Ajavascript&sort=stars&order=desc&per_page=10';
      expect(encodeUrl(url)).toBe(expected);
    });

    it('should handle OAuth callback URLs', () => {
      const url = 'https://myapp.com/callback?code=abc123&state=xyz789&redirect_uri=https://myapp.com/dashboard';
      const expected = 'https://myapp.com/callback?code=abc123&state=xyz789&redirect_uri=https%3A%2F%2Fmyapp.com%2Fdashboard';
      expect(encodeUrl(url)).toBe(expected);
    });

    it('should handle GraphQL queries with pipe operator', () => {
      const url = 'https://api.example.com/graphql?query=query{users(status:active|pending){id,name}}&variables={"filter":"status|active"}';
      const expected = 'https://api.example.com/graphql?query=query%7Busers(status%3Aactive%7Cpending)%7Bid%2Cname%7D%7D&variables=%7B%22filter%22%3A%22status%7Cactive%22%7D';
      expect(encodeUrl(url)).toBe(expected);
    });

    it('should handle search APIs with complex queries', () => {
      const url = 'https://api.example.com/search?q=react typescript tutorial&type=article,code&language=en&date_range=2023-01-01:2023-12-31&sort=relevance:desc';
      const expected = 'https://api.example.com/search?q=react%20typescript%20tutorial&type=article%2Ccode&language=en&date_range=2023-01-01%3A2023-12-31&sort=relevance%3Adesc';
      expect(encodeUrl(url)).toBe(expected);
    });

    it('should handle e-commerce API filters', () => {
      const url = 'https://api.shop.com/products?category=electronics&brand=apple|samsung|google&price_range=100:1000&rating=4.5:5.0&availability=in_stock&sort=price:asc&limit=50';
      const expected = 'https://api.shop.com/products?category=electronics&brand=apple%7Csamsung%7Cgoogle&price_range=100%3A1000&rating=4.5%3A5.0&availability=in_stock&sort=price%3Aasc&limit=50';
      expect(encodeUrl(url)).toBe(expected);
    });
  });
});

describe('safeDecodeURIComponent', () => {
  it('decodes well-formed escapes', () => {
    expect(safeDecodeURIComponent('hello%20world')).toBe('hello world');
    expect(safeDecodeURIComponent('a%40b.com')).toBe('a@b.com');
  });

  it('returns input unchanged when no escapes are present', () => {
    expect(safeDecodeURIComponent('hello world')).toBe('hello world');
  });

  it('decodes valid escapes and leaves bare % intact when malformed', () => {
    // '50%' is malformed; decoder must not throw and must leave '%' alone
    expect(safeDecodeURIComponent('50%')).toBe('50%');
    // Mixed: '%20' is a valid ASCII escape, the trailing '%' is bare
    expect(safeDecodeURIComponent('hello%20world%')).toBe('hello world%');
  });

  it('handles strings with only malformed escapes', () => {
    expect(safeDecodeURIComponent('%')).toBe('%');
    expect(safeDecodeURIComponent('%G0')).toBe('%G0');
  });
});

describe('parseQueryParams', () => {
  it('should extract query parameters correctly', () => {
    const queryString = 'name=john&age=25&active=true';
    const result = parseQueryParams(queryString);
    expect(result).toEqual([
      { name: 'name', value: 'john' },
      { name: 'age', value: '25' },
      { name: 'active', value: 'true' }
    ]);
  });

  it('should handle empty query string', () => {
    const result = parseQueryParams('');
    expect(result).toEqual([]);
  });

  it('should handle query parameters with empty values (has = sign)', () => {
    const queryString = 'name=&age=25&active=';
    const result = parseQueryParams(queryString);
    expect(result).toEqual([
      { name: 'name', value: '' },
      { name: 'age', value: '25' },
      { name: 'active', value: '' }
    ]);
  });

  it('should handle query parameters without values (no = sign)', () => {
    const queryString = 'flag&age=25&verbose';
    const result = parseQueryParams(queryString);
    expect(result).toEqual([
      { name: 'flag', value: undefined },
      { name: 'age', value: '25' },
      { name: 'verbose', value: undefined }
    ]);
  });

  it('should extract query parameters with pipe operator', () => {
    const queryString = 'filter=status|active&sort=name|asc&tags=frontend|backend';
    const result = parseQueryParams(queryString);
    expect(result).toEqual([
      { name: 'filter', value: 'status|active' },
      { name: 'sort', value: 'name|asc' },
      { name: 'tags', value: 'frontend|backend' }
    ]);
  });
});

describe('buildQueryString', () => {
  it('should build query string correctly', () => {
    const params = [
      { name: 'name', value: 'john' },
      { name: 'age', value: '25' },
      { name: 'active', value: 'true' }
    ];
    const result = buildQueryString(params);
    expect(result).toBe('name=john&age=25&active=true');
  });

  it('should encode parameters by default', () => {
    const params = [
      { name: 'name', value: 'john doe' },
      { name: 'email', value: 'john@example.com' }
    ];
    const result = buildQueryString(params, { encode: true });
    expect(result).toBe('name=john%20doe&email=john%40example.com');
  });

  it('should encode pipe operator in parameters', () => {
    const params = [
      { name: 'filter', value: 'status|active' },
      { name: 'sort', value: 'name|asc' },
      { name: 'tags', value: 'frontend|backend|api' }
    ];
    const result = buildQueryString(params, { encode: true });
    expect(result).toBe('filter=status%7Cactive&sort=name%7Casc&tags=frontend%7Cbackend%7Capi');
  });

  it('should not encode parameters when encode is false', () => {
    const params = [
      { name: 'filter', value: 'status|active' },
      { name: 'sort', value: 'name|asc' }
    ];
    const result = buildQueryString(params, { encode: false });
    expect(result).toBe('filter=status|active&sort=name|asc');
  });

  it('should omit = for params with undefined value', () => {
    const params = [
      { name: 'flag', value: undefined },
      { name: 'age', value: '25' },
      { name: 'verbose' }
    ];
    const result = buildQueryString(params);
    expect(result).toBe('flag&age=25&verbose');
  });

  it('should include = for params with empty string value', () => {
    const params = [
      { name: 'seat', value: '' },
      { name: 'table', value: '2' }
    ];
    const result = buildQueryString(params);
    expect(result).toBe('seat=&table=2');
  });
});
