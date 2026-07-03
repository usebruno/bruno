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
  /**
   * When `true` (default), anything after `#` is discarded before splitting
   * on `&` — matches the URL-bar reducer's view where `#` is the fragment
   * delimiter. Pass `false` from callers that want `#` to round-trip as data
   * (e.g., `encodeUrl`, which encodes `#` to `%23` rather than treating it
   * as a structural fragment marker).
   */
  stripFragment?: boolean;
}

// Per PR #5507's original design: when encode is true, run encodeURIComponent on the
// value. With the idempotent fix, pre-encoded inputs are decoded first so that
// double-encoding is avoided.
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

function parseQueryParams(query: string, { decode = false, stripFragment = true }: ExtractQueryParamsOptions = {}): QueryParam[] {
  if (!query || !query.length) {
    return [];
  }

  try {
    const queryString = stripFragment ? query.split('#')[0] : query;
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

// decodeURIComponent throws on bare '%' or malformed %XX. Forgiving variant that
// decodes well-formed escapes and leaves anything else alone. Exported so other
// modules can use it without each one inventing its own try/catch. Used by both
// encodePathSegments and the query-side encoding in encodeUrl to achieve
// idempotent encode behavior (decode-then-encode avoids double-encoding).
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

// Path-side encoding is idempotent: decode any already-encoded sequence first,
// then re-encode. The reason — `interpolateVars` in the runtime goes through
// `new URL(url).pathname`, which auto-encodes path chars (`"` → `%22`,
// ` ` → `%20`, etc.) before the request reaches `encodeUrl()` at the wire
// boundary. Without `safeDecodeURIComponent` here, the second pass would
// content-blind-encode again (`%22` → `%2522`) and the wire URL would be
// double-encoded. By decoding-then-encoding we collapse both cases (raw input
// + already-encoded input) to the same single-encoded form.
//
// NOTE: the query side now also uses the same decode-then-encode strategy
// to prevent double-encoding of pre-encoded query parameters.
const encodePathSegments = (path: string): string =>
  path
    .split('/')
    .map((segment) => encodeURIComponent(safeDecodeURIComponent(segment)))
    .join('/');

// Encodes path segments and query name/value pairs when the URL Encoding toggle is on.
// Idempotent: applying it to an already-encoded input produces the same result
// (e.g. `?q=%20` stays `?q=%20`, not `?q=%2520`). Both path and query sides
// decode-then-encode to collapse raw and pre-encoded inputs to the same form.
//
// `#` is treated as **data**, not as the RFC 3986 §3.5 fragment delimiter:
//   `?token=abc#def`  →  `?token=abc%23def`   (toggle ON)
// The previous strip-or-preserve behavior caused surprising UX (silent data
// loss in the snippet, or asymmetric ON/OFF behavior). Since Bruno is an
// HTTP API client where fragments are essentially never useful on the wire,
// encoding `#` as data is the predictable choice. To send a URL with a
// literal `#section` fragment, toggle OFF — OFF preserves the user's URL
// byte-for-byte.
const encodeUrl = (url: string): string => {
  if (!url || typeof url !== 'string') {
    return url;
  }

  // Separate origin+path from the query string. `#` is intentionally NOT
  // extracted as a fragment — it flows through as data and ends up encoded
  // as `%23` either in the path (`encodePathSegments`) or the query value
  // (`encodeURIComponent` via the parseQueryParams → rebuild loop below).
  const queryIdx = url.indexOf('?');
  const originAndPath = queryIdx >= 0 ? url.slice(0, queryIdx) : url;
  const queryString = queryIdx >= 0 ? url.slice(queryIdx + 1) : '';

  // Preserve scheme + authority verbatim; only encode the path segments.
  // [^/?#]* matches everything in the authority including userinfo, host, port,
  // and bracketed IPv6 literals. `#` is excluded so a misplaced `#` (e.g.
  // `https://example.com#bad/path`) is treated as part of path and encoded.
  const originMatch = originAndPath.match(/^([a-z][a-z0-9+.-]*:\/\/[^/?#]*)?(.*)$/i);
  const origin = originMatch?.[1] ?? '';
  const path = originMatch?.[2] ?? originAndPath;

  let result = origin + encodePathSegments(path);

  if (queryIdx >= 0) {
    // stripFragment: false so `#` in the query value is treated as a literal
    // byte and gets encoded to `%23` by the encodeURIComponent below.
    const params = parseQueryParams(queryString, { decode: false, stripFragment: false });
    const rebuilt = params
      .map(({ name, value }) => {
        // Idempotent encoding: decode first then re-encode, so already-encoded
        // values don't get double-encoded (e.g. %20 stays as %20, not %2520).
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
  hasExplicitScheme,
  encodeUrl,
  parseQueryParams,
  buildQueryString,
  stripOrigin,
  safeDecodeURIComponent,
  type QueryParam,
  type BuildQueryStringOptions,
  type ExtractQueryParamsOptions
};
