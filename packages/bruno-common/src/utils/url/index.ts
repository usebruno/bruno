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

// Strict IPv4 and IPv6 validation regexes
export const IPV4: RegExp = /^(?:(?:25[0-5]|2[0-4][0-9]|1[0-9][0-9]|[1-9][0-9]|[0-9])\.){3}(?:25[0-5]|2[0-4][0-9]|1[0-9][0-9]|[1-9][0-9]|[0-9])$/;
export const IPV6: RegExp = /^(([0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}|::|([0-9a-fA-F]{1,4})?::([0-9a-fA-F]{1,4}:?){0,6})$/;

function buildQueryString(paramsArray: QueryParam[], { encode = false }: BuildQueryStringOptions = {}): string {
  return paramsArray
    .filter(({ name }) => typeof name === 'string' && name.trim().length > 0)
    .map(({ name, value }) => {
      const finalName = encode ? encodeURIComponent(name) : name;
      const finalValue = encode ? encodeURIComponent(value ?? '') : (value ?? '');

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

const hostNoBrackets = (host: string): string => {
  if (host.length >= 2 && host.startsWith('[') && host.endsWith(']')) {
    return host.substring(1, host.length - 1);
  }
  return host;
};

const isLoopbackV4 = (address: string): boolean => {
  const octets = address.split('.');
  if (octets.length !== 4 || parseInt(octets[0], 10) !== 127) {
    return false;
  }
  return octets.every((octet) => {
    const n = parseInt(octet, 10);
    return !Number.isNaN(n) && n >= 0 && n <= 255;
  });
};

const isLoopbackV6 = (address: string): boolean => {
  // new URL(...) follows the WHATWG URL Standard
  // which compresses IPv6 addresses, therefore the IPv6
  // loopback address will always be compressed to '[::1]':
  // https://url.spec.whatwg.org/#concept-ipv6-serializer
  return (address === '::1');
}
const isIpLoopback = (address: string): boolean => {
  if (IPV4.test(address)) {
    return isLoopbackV4(address);
  }
  if (IPV6.test(address)) {
    return isLoopbackV6(address);
  }
  return false;
};

const isNormalizedLocalhostTLD = (host: string): boolean => {
  return host.toLowerCase().endsWith('.localhost');
};

const isLocalHostname = (host: string): boolean => {
  return host.toLowerCase() === 'localhost' || isNormalizedLocalhostTLD(host);
};


const isPotentiallyTrustworthyOrigin = (urlString: string): boolean => {
  let url: URL;
  try {
    url = new URL(urlString);
  } catch {
    return false; // invalid or opaque origin
  }

  const scheme = url.protocol.replace(':', '').toLowerCase();
  const hostname = hostNoBrackets(url.hostname).replace(/\.+$/, '');

  // Secure schemes are always trustworthy
  if (scheme === 'https' || scheme === 'wss' || scheme === 'file') {
    return true;
  }

  // If it's an IP literal, check loopback
  if (IPV4.test(hostname) || IPV6.test(hostname)) {
    return isIpLoopback(hostname);
  }

  // RFC 6761: localhost names map to loopback
  return isLocalHostname(hostname);
};

export {
  encodeUrl,
  parseQueryParams,
  buildQueryString,
  type QueryParam,
  type BuildQueryStringOptions,
  type ExtractQueryParamsOptions,
  isPotentiallyTrustworthyOrigin
};