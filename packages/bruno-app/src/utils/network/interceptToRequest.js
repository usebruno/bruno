/**
 * Convert an intercepted network request to Bruno request format
 * @param {Object} interceptedRequest - The intercepted request from the proxy
 * @returns {Object} - Bruno request parameters
 */
export const convertInterceptedToBrunoRequest = (interceptedRequest) => {
  const { method, url, headers, requestBody } = interceptedRequest;

  // Parse headers into Bruno format
  const brunoHeaders = headers
    ? Object.entries(headers)
        .filter(([name]) => !isHopByHopHeader(name))
        .map(([name, value]) => ({
          name,
          value: Array.isArray(value) ? value.join(', ') : value,
          enabled: true
        }))
    : [];

  // Determine body mode and content
  const body = parseRequestBody(requestBody, headers);

  return {
    requestName: generateRequestName(url, method),
    requestUrl: url,
    requestMethod: method,
    requestType: 'http-request',
    headers: brunoHeaders,
    body
  };
};

/**
 * Check if a header is a hop-by-hop header that shouldn't be copied
 */
const isHopByHopHeader = (headerName) => {
  const hopByHopHeaders = [
    'connection',
    'keep-alive',
    'proxy-authenticate',
    'proxy-authorization',
    'te',
    'trailers',
    'transfer-encoding',
    'upgrade',
    'proxy-connection'
  ];
  return hopByHopHeaders.includes(headerName.toLowerCase());
};

/**
 * Parse request body and determine the appropriate mode
 */
const parseRequestBody = (body, headers) => {
  if (!body) {
    return {
      mode: 'none',
      json: null,
      text: null,
      xml: null,
      sparql: null,
      multipartForm: [],
      formUrlEncoded: [],
      file: []
    };
  }

  const contentType = getContentType(headers);

  // JSON body
  if (contentType?.includes('application/json')) {
    let jsonContent = body;
    try {
      // Pretty print if valid JSON
      const parsed = JSON.parse(body);
      jsonContent = JSON.stringify(parsed, null, 2);
    } catch {
      // Keep as-is if not valid JSON
    }
    return {
      mode: 'json',
      json: jsonContent,
      text: null,
      xml: null,
      sparql: null,
      multipartForm: [],
      formUrlEncoded: [],
      file: []
    };
  }

  // Form URL encoded
  if (contentType?.includes('application/x-www-form-urlencoded')) {
    const formParams = parseFormUrlEncoded(body);
    return {
      mode: 'formUrlEncoded',
      json: null,
      text: null,
      xml: null,
      sparql: null,
      multipartForm: [],
      formUrlEncoded: formParams,
      file: []
    };
  }

  // XML body
  if (contentType?.includes('application/xml') || contentType?.includes('text/xml')) {
    return {
      mode: 'xml',
      json: null,
      text: null,
      xml: body,
      sparql: null,
      multipartForm: [],
      formUrlEncoded: [],
      file: []
    };
  }

  // Plain text or other
  return {
    mode: 'text',
    json: null,
    text: body,
    xml: null,
    sparql: null,
    multipartForm: [],
    formUrlEncoded: [],
    file: []
  };
};

/**
 * Get content type from headers
 */
const getContentType = (headers) => {
  if (!headers) return null;
  const contentTypeKey = Object.keys(headers).find(
    (key) => key.toLowerCase() === 'content-type'
  );
  return contentTypeKey ? headers[contentTypeKey] : null;
};

/**
 * Parse form URL encoded body
 */
const parseFormUrlEncoded = (body) => {
  try {
    const params = new URLSearchParams(body);
    return Array.from(params.entries()).map(([name, value]) => ({
      name,
      value,
      enabled: true
    }));
  } catch {
    return [];
  }
};

/**
 * Generate a request name from URL and method
 */
const generateRequestName = (url, method) => {
  try {
    const parsed = new URL(url);
    const pathParts = parsed.pathname.split('/').filter(Boolean);

    if (pathParts.length > 0) {
      // Use the last meaningful path segment
      const lastPart = pathParts[pathParts.length - 1];
      // Clean up the name (remove extensions, limit length)
      const cleanName = lastPart
        .replace(/\.[^/.]+$/, '') // Remove extension
        .replace(/[^a-zA-Z0-9-_]/g, '-') // Replace special chars
        .substring(0, 50);

      return `${method} ${cleanName}`;
    }

    return `${method} ${parsed.hostname}`;
  } catch {
    return `${method} Request`;
  }
};

export default convertInterceptedToBrunoRequest;
