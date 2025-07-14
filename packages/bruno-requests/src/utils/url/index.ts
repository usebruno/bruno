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

function buildQueryString(paramsArray: QueryParam[], { encode = true }: BuildQueryStringOptions = {}): string {
  return paramsArray
    .filter(({ name }) => typeof name === 'string' && name.trim().length > 0)
    .map(({ name, value }) => {
      const finalName = encode ? encodeURIComponent(name) : name;
      const finalValue = encode ? encodeURIComponent(value ?? '') : (value ?? '');

      return `${finalName}=${finalValue}`;
    })
    .join('&');
}

function parseQueryParams(queryString: string, { decode = false }: ExtractQueryParamsOptions = {}): QueryParam[] {
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