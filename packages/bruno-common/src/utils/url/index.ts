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

/**
 * Check if a string is already URL-encoded by attempting to decode it.
 * If decoding changes the string, it was encoded. If not, it wasn't.
 */
function isEncoded(str: string): boolean {
  if (!str || typeof str !== 'string') {
    return false;
  }

  try {
    // Try to decode and see if it differs from the original
    const decoded = decodeURIComponent(str);
    // If re-encoding the decoded string gives us back the original, it was encoded
    const reencoded = encodeURIComponent(decoded);
    return reencoded === str;
  } catch (e) {
    // If decoding fails, it's not properly encoded
    return false;
  }
}

function buildQueryString(paramsArray: QueryParam[], { encode = false }: BuildQueryStringOptions = {}): string {
  return paramsArray
    .filter(({ name }) => typeof name === 'string' && name.trim().length > 0)
    .map(({ name, value }) => {
      let finalName = name;
      let finalValue = value ?? '';

      if (encode) {
        // Only encode if not already encoded to prevent double-encoding
        finalName = isEncoded(name) ? name : encodeURIComponent(name);
        finalValue = isEncoded(finalValue) ? finalValue : encodeURIComponent(finalValue);
      }

      return finalValue ? `${finalName}=${finalValue}` : finalName;
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

    const params = pairs.map(pair => {
      const [name, ...valueParts] = pair.split('=');

      if (!name) {
        return null;
      }

      return {
        name: decode ? decodeURIComponent(name) : name,
        value: decode ? decodeURIComponent(valueParts.join('=')) : valueParts.join('=')
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

export {
  encodeUrl,
  parseQueryParams,
  buildQueryString,
  type QueryParam,
  type BuildQueryStringOptions,
  type ExtractQueryParamsOptions
};