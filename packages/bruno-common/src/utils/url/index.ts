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

// decodeURIComponent throws on bare '%' or malformed %XX. We want a forgiving
// pass that decodes well-formed escapes and leaves anything else alone, so the
// subsequent encode step re-encodes the bare '%' to '%25' rather than crashing.
const safeDecodeURIComponent = (s: string): string => {
  try {
    return decodeURIComponent(s);
  } catch {
    return s.replace(/%[0-9A-Fa-f]{2}/g, (m) => {
      try {
        return decodeURIComponent(m);
      } catch {
        return m;
      }
    });
  }
};

const encodePathSegments = (path: string): string =>
  path
    .split('/')
    .map((segment) => encodeURIComponent(safeDecodeURIComponent(segment)))
    .join('/');

// Idempotent URL encoder: decode-then-encode each path segment and each query
// param. Already-encoded inputs (%20, %23, %25) round-trip unchanged; raw inputs
// (space, #, %) are encoded once. Fragments are dropped per RFC 3986 §3.5 — they
// are not part of the request target sent on the wire.
const encodeUrl = (url: string): string => {
  if (!url || typeof url !== 'string') {
    return url;
  }

  // Strip fragment first (anything after the first '#')
  const hashIdx = url.indexOf('#');
  const beforeHash = hashIdx >= 0 ? url.slice(0, hashIdx) : url;

  // Separate origin+path from the query string
  const queryIdx = beforeHash.indexOf('?');
  const originAndPath = queryIdx >= 0 ? beforeHash.slice(0, queryIdx) : beforeHash;
  const queryString = queryIdx >= 0 ? beforeHash.slice(queryIdx + 1) : '';

  // Preserve scheme + authority verbatim; only encode the path segments.
  // [^/?#]* matches everything in the authority including userinfo, host, port,
  // and bracketed IPv6 literals.
  const originMatch = originAndPath.match(/^([a-z][a-z0-9+.-]*:\/\/[^/?#]*)?(.*)$/i);
  const origin = originMatch?.[1] ?? '';
  const path = originMatch?.[2] ?? originAndPath;

  let result = origin + encodePathSegments(path);

  if (queryIdx >= 0) {
    const params = parseQueryParams(queryString, { decode: false });
    const rebuilt = params
      .map(({ name, value }) => {
        const encodedName = encodeURIComponent(safeDecodeURIComponent(name));
        if (value === undefined) {
          return encodedName;
        }
        const encodedValue = encodeURIComponent(safeDecodeURIComponent(value));
        return `${encodedName}=${encodedValue}`;
      })
      .filter((pair) => pair.length > 0 && !pair.startsWith('='))
      .join('&');
    result += `?${rebuilt}`;
  }

  return result;
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
  encodeUrl,
  parseQueryParams,
  buildQueryString,
  stripOrigin,
  safeDecodeURIComponent,
  type QueryParam,
  type BuildQueryStringOptions,
  type ExtractQueryParamsOptions
};
