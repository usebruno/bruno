import { encodeUrl, parseQueryParams, buildQueryString, isPotentiallyTrustworthyOrigin } from './index';

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
      const expected = 'https://example.com/api?name&age=25&active';
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

  describe('hash fragment handling', () => {
    it('should preserve hash fragments with encoded query parameters', () => {
      const url = 'https://example.com/api?name=john doe#section1';
      const expected = 'https://example.com/api?name=john%20doe#section1';
      expect(encodeUrl(url)).toBe(expected);
    });

    it('should preserve hash fragments with pipe operator in query', () => {
      const url = 'https://example.com/api?filter=status|active#results';
      const expected = 'https://example.com/api?filter=status%7Cactive#results';
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
      const url = 'https://example.com/api?search=hello world!@#$%^&*()&filter=active&sort=name asc';
      const expected = 'https://example.com/api?search=hello%20world!%40#$%^&*()&filter=active&sort=name asc';
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

  it('should handle query parameters with empty values', () => {
    const queryString = 'name=&age=25&active=';
    const result = parseQueryParams(queryString);
    expect(result).toEqual([
      { name: 'name', value: '' },
      { name: 'age', value: '25' },
      { name: 'active', value: '' }
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
});

describe('isPotentiallyTrustworthyOrigin', () => {
  describe('secure schemes', () => {
    it('should return true for HTTPS URLs', () => {
      expect(isPotentiallyTrustworthyOrigin('https://example.com')).toBe(true);
      expect(isPotentiallyTrustworthyOrigin('https://api.github.com/v1/users')).toBe(true);
      expect(isPotentiallyTrustworthyOrigin('https://localhost:3000')).toBe(true);
    });

    it('should return true for WSS URLs', () => {
      expect(isPotentiallyTrustworthyOrigin('wss://example.com')).toBe(true);
      expect(isPotentiallyTrustworthyOrigin('wss://localhost:8080/ws')).toBe(true);
    });

    it('should return true for file URLs', () => {
      expect(isPotentiallyTrustworthyOrigin('file:///path/to/file.html')).toBe(true);
      expect(isPotentiallyTrustworthyOrigin('file://localhost/path/to/file.html')).toBe(true);
    });
  });

  describe('insecure schemes', () => {
    it('should return false for HTTP URLs with non-localhost domains', () => {
      expect(isPotentiallyTrustworthyOrigin('http://example.com')).toBe(false);
      expect(isPotentiallyTrustworthyOrigin('http://api.github.com')).toBe(false);
    });

    it('should return false for WS URLs with non-localhost domains', () => {
      expect(isPotentiallyTrustworthyOrigin('ws://example.com')).toBe(false);
      expect(isPotentiallyTrustworthyOrigin('ws://api.github.com')).toBe(false);
    });

    it('should return false for other schemes', () => {
      expect(isPotentiallyTrustworthyOrigin('ftp://example.com')).toBe(false);
      expect(isPotentiallyTrustworthyOrigin('ssh://example.com')).toBe(false);
    });

    it('should return true for HTTP/WS URLs with localhost (localhost is always trustworthy)', () => {
      expect(isPotentiallyTrustworthyOrigin('http://localhost')).toBe(true);
      expect(isPotentiallyTrustworthyOrigin('ws://localhost')).toBe(true);
    });
  });

  describe('loopback addresses', () => {
    describe('IPv4 loopback', () => {
      it('should return true for 127.0.0.1', () => {
        expect(isPotentiallyTrustworthyOrigin('http://127.0.0.1')).toBe(true);
        expect(isPotentiallyTrustworthyOrigin('http://127.0.0.1:3000')).toBe(true);
      });

      it('should return true for other 127.x.x.x addresses', () => {
        expect(isPotentiallyTrustworthyOrigin('http://127.0.0.0')).toBe(true);
        expect(isPotentiallyTrustworthyOrigin('http://127.255.255.255')).toBe(true);
        expect(isPotentiallyTrustworthyOrigin('http://127.1.2.3')).toBe(true);
      });

      it('should return false for non-loopback IPv4 addresses', () => {
        expect(isPotentiallyTrustworthyOrigin('http://192.168.1.1')).toBe(false);
        expect(isPotentiallyTrustworthyOrigin('http://10.0.0.1')).toBe(false);
        expect(isPotentiallyTrustworthyOrigin('http://172.16.0.1')).toBe(false);
        expect(isPotentiallyTrustworthyOrigin('http://8.8.8.8')).toBe(false);
      });
    });

    describe('IPv6 loopback', () => {
      it('should return true for ::1', () => {
        expect(isPotentiallyTrustworthyOrigin('http://[::1]')).toBe(true);
        expect(isPotentiallyTrustworthyOrigin('http://[::1]:3000')).toBe(true);
      });

      it('should return false for non-loopback IPv6 addresses', () => {
        expect(isPotentiallyTrustworthyOrigin('http://[2001:db8::1]')).toBe(false);
        expect(isPotentiallyTrustworthyOrigin('http://[fe80::1]')).toBe(false);
      });
    });
  });

  describe('localhost hostnames', () => {
    it('should return true for localhost and *.localhost domains', () => {
      expect(isPotentiallyTrustworthyOrigin('http://localhost')).toBe(true);
      expect(isPotentiallyTrustworthyOrigin('http://localhost:3000')).toBe(true);
      expect(isPotentiallyTrustworthyOrigin('http://app.localhost')).toBe(true);
      expect(isPotentiallyTrustworthyOrigin('http://api.localhost')).toBe(true);
      expect(isPotentiallyTrustworthyOrigin('http://sub.domain.localhost')).toBe(true);
    });

    it('should handle case insensitive localhost', () => {
      expect(isPotentiallyTrustworthyOrigin('http://LOCALHOST')).toBe(true);
      expect(isPotentiallyTrustworthyOrigin('http://LocalHost')).toBe(true);
      expect(isPotentiallyTrustworthyOrigin('http://APP.LOCALHOST')).toBe(true);
    });

    it('should return false for non-localhost domains', () => {
      expect(isPotentiallyTrustworthyOrigin('http://api.example.com')).toBe(false);
      expect(isPotentiallyTrustworthyOrigin('http://localhost.example.com')).toBe(false);
    });
  });

  describe('edge cases', () => {
    it('should handle trailing dots in hostnames', () => {
      expect(isPotentiallyTrustworthyOrigin('http://localhost.')).toBe(true);
      expect(isPotentiallyTrustworthyOrigin('http://app.localhost.')).toBe(true);
      expect(isPotentiallyTrustworthyOrigin('http://example.com.')).toBe(false);
    });

    it('should handle URLs with query parameters and fragments', () => {
      expect(isPotentiallyTrustworthyOrigin('https://example.com/path?query=value#fragment')).toBe(true);
      expect(isPotentiallyTrustworthyOrigin('http://localhost/path?query=value#fragment')).toBe(true);
      expect(isPotentiallyTrustworthyOrigin('http://api.example.com/path?query=value#fragment')).toBe(false);
    });

    it('should handle URLs with authentication', () => {
      expect(isPotentiallyTrustworthyOrigin('https://user:pass@example.com')).toBe(true);
      expect(isPotentiallyTrustworthyOrigin('http://user:pass@localhost')).toBe(true);
      expect(isPotentiallyTrustworthyOrigin('http://user:pass@api.example.com')).toBe(false);
    });
  });

  describe('mixed scenarios', () => {
    it('should prioritize secure schemes over hostname checks', () => {
      // Even though example.com is not localhost, HTTPS makes it trustworthy
      expect(isPotentiallyTrustworthyOrigin('https://example.com')).toBe(true);

      // Even though 192.168.1.1 is not loopback, HTTPS makes it trustworthy
      expect(isPotentiallyTrustworthyOrigin('https://192.168.1.1')).toBe(true);
    });

    it('should handle localhost with different schemes', () => {
      expect(isPotentiallyTrustworthyOrigin('https://localhost')).toBe(true);
      expect(isPotentiallyTrustworthyOrigin('wss://localhost')).toBe(true);
    });
  });
});