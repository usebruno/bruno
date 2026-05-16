/**
 * Returns true when `url` already carries an explicit network scheme.
 *
 * Per the WHATWG URL Standard, all network-fetch schemes (http, https, ftp,
 * ws, wss, file) require "://" — the authority component is mandatory.
 * This means "localhost:8080" is NOT a scheme: the colon separates host from
 * port, so callers should prepend "http://" to it.
 *
 * The scheme character set (ASCII alpha/digit/+/-/.) follows the WHATWG URL
 * scheme-state parser, which accepts the same characters as all major browsers.
 * @see https://url.spec.whatwg.org/#scheme-state
 *
 * @example
 * hasExplicitScheme('https://example.com') // true
 * hasExplicitScheme('ftp://files.example') // true
 * hasExplicitScheme('localhost:8080')       // false — port colon, not scheme
 * hasExplicitScheme('example.com/api')      // false — no scheme at all
 */
function hasExplicitScheme(url: string): boolean {
  // All WHATWG network schemes require authority ("://").
  const authorityStart = url.indexOf('://');
  if (authorityStart < 1) return false;

  const scheme = url.slice(0, authorityStart);

  // WHATWG URL scheme-state: first character must be ASCII alpha.
  const first = scheme[0];
  const isAlpha = (c: string) => {
    return (c >= 'a' && c <= 'z') || (c >= 'A' && c <= 'Z');
  };

  if (!isAlpha(first)) {
    return false;
  }

  // Remaining characters must be ASCII alphanumeric, "+", "-", or ".".
  const isSchemeChar = (c: string) => {
    return isAlpha(c) || (c >= '0' && c <= '9') || c === '+' || c === '-' || c === '.';
  };
  return scheme.slice(1).split('').every(isSchemeChar);
}

interface QueryParam {
  name: string;
  value?: string;
}

interface BuildQueryStringOptions {
  encode?: boolean;
}

interface ExtractQueryParamsOptions {
  decode?: boolean;
}

function buildQueryString(paramsArray: QueryParam[], { encode = false }: BuildQueryStringOptions = {}): string {
  return paramsArray
    .filter(({ name }) => typeof name === 'string' && name.trim().length > 0)
    .map(({ name, value }) => {
      const finalName = encode ? encodeURIComponent(name) : name;

      if (value === undefined) {
        return finalName;
      }

      const finalValue = encode ? encodeURIComponent(value) : value;
      return `${finalName}=${finalValue}`;
    })
    .join('&');
}

function parseQueryParams(query: string, { decode = false }: ExtractQueryParamsOptions = {}): QueryParam[] {
  if (!query || !query.length) {
    return [];
  }

  try {
    const [queryString, ...hashParts] = query.split('#');
    const pairs = queryString.split('&');

    const params = pairs.map((pair) => {
      const [name, ...valueParts] = pair.split('=');

      if (!name) {
        return null;
      }

      // Distinguish between ?param (no '=' at all) and ?param= (has '=' with empty value)
      const hasEqualsSign = pair.includes('=');
      const value = hasEqualsSign ? (decode ? decodeURIComponent(valueParts.join('=')) : valueParts.join('=')) : undefined;

      return {
        name: decode ? decodeURIComponent(name) : name,
        value
      };
    }).filter((param): param is NonNullable<typeof param> => param !== null);

    return params;
  } catch (error) {
    console.error('Error parsing query params:', error);
    return [];
  }
}

const encodeUrl = (url: string): string => {
  // Early return for invalid input
  if (!url || typeof url !== 'string') {
    return url;
  }

  const [urlWithoutHash, ...hashFragments] = url.split('#');
  const [basePath, ...queryString] = urlWithoutHash.split('?');

  // If no query parameters exist, return original URL
  if (!queryString || queryString.length === 0) {
    return url;
  }

  const queryParams = parseQueryParams(queryString.join('?'), { decode: false });
  // Parse and re-encode query parameters
  const encodedQueryString = buildQueryString(queryParams, { encode: true });

  // Reconstruct URL with encoded query parameters
  const encodedUrl = `${basePath}?${encodedQueryString}${hashFragments.length > 0 ? `#${hashFragments.join('#')}` : ''}`;

  return encodedUrl;
};

/**
 * Strip the origin (scheme + authority) from a URL, returning the path, query, and fragment.
 * Returns '/' if the URL has no path component.
 *
 * @example
 * stripOrigin('https://example.com/api/users?name=foo') // '/api/users?name=foo'
 * stripOrigin('http://localhost:3000')                   // '/'
 */
const stripOrigin = (url: string): string => {
  return url.replace(/^https?:\/\/[^/?#]*/, '') || '/';
};

export {
  hasExplicitScheme,
  encodeUrl,
  parseQueryParams,
  buildQueryString,
  stripOrigin,
  type QueryParam,
  type BuildQueryStringOptions,
  type ExtractQueryParamsOptions
};
