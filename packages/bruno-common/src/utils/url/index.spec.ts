import { encodeUrl, parseQueryParams, buildQueryString, hasExplicitScheme, safeDecodeURIComponent } from './index';

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

  describe('path encoding (added in URL encoding fix)', () => {
    it('should encode spaces in path segments', () => {
      const url = 'https://example.com/api/v1/path with spaces/users';
      const expected = 'https://example.com/api/v1/path%20with%20spaces/users';
      expect(encodeUrl(url)).toBe(expected);
    });

    it('should encode unicode in path segments', () => {
      const url = 'https://example.com/api/José/profile';
      const expected = 'https://example.com/api/Jos%C3%A9/profile';
      expect(encodeUrl(url)).toBe(expected);
    });

    it('should encode square brackets in path segments', () => {
      const url = 'https://example.com/list[123]';
      const expected = 'https://example.com/list%5B123%5D';
      expect(encodeUrl(url)).toBe(expected);
    });

    it('should leave separators between segments alone (slashes are structural)', () => {
      const url = 'https://example.com/api/v1/users';
      expect(encodeUrl(url)).toBe(url);
    });

    it('should encode angle brackets, quotes, pipes in the path', () => {
      const url = 'https://example.com/api/a<b>c/"hi"/a|b/{x}';
      const expected = 'https://example.com/api/a%3Cb%3Ec/%22hi%22/a%7Cb/%7Bx%7D';
      expect(encodeUrl(url)).toBe(expected);
    });

    it('should encode the path even when there is no query string', () => {
      const url = 'https://example.com/path with spaces';
      const expected = 'https://example.com/path%20with%20spaces';
      expect(encodeUrl(url)).toBe(expected);
    });

    it('should preserve the origin (scheme + authority) verbatim', () => {
      const url = 'https://user:pass@example.com:8080/path with space';
      const expected = 'https://user:pass@example.com:8080/path%20with%20space';
      expect(encodeUrl(url)).toBe(expected);
    });
  });

  describe('hash (#) treated as data, not RFC 3986 §3.5 fragment delimiter', () => {
    // ON-mode design choice: `#` is encoded to %23 as a regular byte. The
    // previous strip-or-preserve behavior caused surprising silent data loss
    // in the snippet. To send a URL with a literal `#section` fragment, the
    // toggle must be OFF — OFF preserves the user's URL byte-for-byte.

    it('encodes # in a query value to %23 alongside other special chars', () => {
      const url = 'https://example.com/api?name=john doe#section1';
      const expected = 'https://example.com/api?name=john%20doe%23section1';
      expect(encodeUrl(url)).toBe(expected);
    });

    it('encodes # alongside pipe operator in query value', () => {
      const url = 'https://example.com/api?filter=status|active#results';
      const expected = 'https://example.com/api?filter=status%7Cactive%23results';
      expect(encodeUrl(url)).toBe(expected);
    });

    it('encodes a bare # following a single-char value', () => {
      const url = 'https://jsonplaceholder.typicode.com/todos/1?name=a#b';
      const expected = 'https://jsonplaceholder.typicode.com/todos/1?name=a%23b';
      expect(encodeUrl(url)).toBe(expected);
    });

    it('encodes # in a path segment (no query) to %23', () => {
      const url = 'https://example.com/foo#bar';
      const expected = 'https://example.com/foo%23bar';
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

    it('should handle complex query parameters with multiple special characters', () => {
      // `#`, `$`, `%`, `^` are all encoded as data when they appear in a query
      // value (Option C — # is data, not a fragment delimiter). The bare-name
      // `*()` survives encodeURIComponent unchanged (RFC 3986 unreserved set).
      const url = 'https://example.com/api?search=hello world!@#$%^&*()&filter=active&sort=name asc';
      const expected = 'https://example.com/api?search=hello%20world!%40%23%24%25%5E&*()&filter=active&sort=name%20asc';
      expect(encodeUrl(url)).toBe(expected);
    });

    it('should handle already encoded URLs', () => {
      const url = 'https://example.com/api?name=john%20doe&email=john%40example.com';
      const expected = 'https://example.com/api?name=john%2520doe&email=john%2540example.com';
      expect(encodeUrl(url)).toBe(expected);
    });

    it('should handle pipe operator in already encoded URLs', () => {
      const url = 'https://example.com/api?filter=status%7Cactive&sort=name%7Casc';
      const expected = 'https://example.com/api?filter=status%257Cactive&sort=name%257Casc';
      expect(encodeUrl(url)).toBe(expected);
    });
  });

  describe('PR #5507 contract — content-blind double-encoding (intentional)', () => {
    // These assertions are the canary that proves no decode-encode wrap was slipped
    // into the encoder. If any of them start failing, the contract has been broken.

    it('should double-encode pre-encoded space in query value (%20 → %2520)', () => {
      const url = 'https://example.com/api?name=John%20Doe';
      const expected = 'https://example.com/api?name=John%2520Doe';
      expect(encodeUrl(url)).toBe(expected);
    });

    it('should double-encode pre-encoded @ in query value (%40 → %2540)', () => {
      const url = 'https://example.com/api?email=john%40example.com';
      const expected = 'https://example.com/api?email=john%2540example.com';
      expect(encodeUrl(url)).toBe(expected);
    });

    it('should double-encode pre-encoded pipe in query value (%7C → %257C)', () => {
      const url = 'https://example.com/api?filter=status%7Cactive&sort=name%7Casc';
      const expected = 'https://example.com/api?filter=status%257Cactive&sort=name%257Casc';
      expect(encodeUrl(url)).toBe(expected);
    });

    it('should double-encode redirect URL with pre-encoded chars (the canonical #5507 case)', () => {
      const url = 'https://auth.example.com/login?redirect=https%3A%2F%2Fother.com%2Fcb';
      const expected = 'https://auth.example.com/login?redirect=https%253A%252F%252Fother.com%252Fcb';
      expect(encodeUrl(url)).toBe(expected);
    });

    it('should double-encode pre-encoded %25 → %2525 (single % → %25 same source bytes)', () => {
      const url = 'https://example.com/api?coupon=50%25';
      const expected = 'https://example.com/api?coupon=50%2525';
      expect(encodeUrl(url)).toBe(expected);
    });

    it('should encode bare % once to %25 in query value', () => {
      const url = 'https://example.com/api?discount=50%';
      const expected = 'https://example.com/api?discount=50%25';
      expect(encodeUrl(url)).toBe(expected);
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

    it('should handle a JSON-shaped array value (canonical #7913 reproducer)', () => {
      const url = 'https://example.com/api?testArray=[[1, 2, 3], ["string", "string"]]';
      const expected = 'https://example.com/api?testArray=%5B%5B1%2C%202%2C%203%5D%2C%20%5B%22string%22%2C%20%22string%22%5D%5D';
      expect(encodeUrl(url)).toBe(expected);
    });
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

  it('should encode structural chars in values when encode is true (issue #5788 path)', () => {
    // # & = ? + in values — structural in URL grammar, must be encoded so the params
    // round-trip correctly. This is the contract the collections reducers rely on.
    const params = [
      { name: 'tag', value: 'test#abc' },
      { name: 'a', value: 'x&y' },
      { name: 'b', value: 'x=y' },
      { name: 'c', value: 'x?y' },
      { name: 'd', value: 'x+y' },
      { name: 'e', value: 'hello world' }
    ];
    const result = buildQueryString(params, { encode: true });
    expect(result).toBe('tag=test%23abc&a=x%26y&b=x%3Dy&c=x%3Fy&d=x%2By&e=hello%20world');
  });
});

describe('safeDecodeURIComponent', () => {
  it('should decode a well-formed escape sequence', () => {
    expect(safeDecodeURIComponent('hello%20world')).toBe('hello world');
  });

  it('should leave a bare % alone (would otherwise throw)', () => {
    expect(safeDecodeURIComponent('50%')).toBe('50%');
  });

  it('should decode well-formed escapes but leave bare % intact in mixed input', () => {
    expect(safeDecodeURIComponent('50% off %20 sale')).toBe('50% off   sale');
  });

  it('should return empty string unchanged', () => {
    expect(safeDecodeURIComponent('')).toBe('');
  });

  it('should be a no-op when there is nothing to decode', () => {
    expect(safeDecodeURIComponent('hello')).toBe('hello');
  });
});

describe('hasExplicitScheme', () => {
  // should return false
  const noScheme: [string, string][] = [
    ['bare hostname', 'test-domain'],
    ['localhost', 'localhost'],
    ['localhost:port (key regression)', 'localhost:8080'],
    ['localhost:port/path', 'localhost:8080/path'],
    ['127.0.0.1:port', '127.0.0.1:3000'],
    ['bare IP', '192.168.1.1'],
    ['IP:port', '192.168.1.1:8080'],
    ['hostname with path', 'example.com/api/v1']
  ];

  for (const [label, url] of noScheme) {
    it(`false (no explicit scheme) — ${label}`, () => {
      expect(hasExplicitScheme(url)).toBe(false);
    });
  }

  // should return true
  const withScheme: [string, string][] = [
    ['http://', 'http://example.com'],
    ['https://', 'https://example.com'],
    ['ftp://', 'ftp://test-domain'],
    ['ws://', 'ws://example.com/socket'],
    ['wss://', 'wss://example.com/socket'],
    ['custom scheme', 'myapp://deep-link']
  ];

  for (const [label, url] of withScheme) {
    it(`true (has explicit scheme) — ${label}`, () => {
      expect(hasExplicitScheme(url)).toBe(true);
    });
  }

  it('{{baseUrl}}/api — no scheme injection for template variables', async () => {
    const url = '{{baseUrl}}/api/v1';
    expect(hasExplicitScheme(url)).toBe(false);
  });

  it('{{baseUrl}} alone — no scheme injection for template variables', async () => {
    const url = '{{baseUrl}}';
    expect(hasExplicitScheme(url)).toBe(false);
  });
});
