import { version } from '../../../package.json';

const TEXTUAL_MIME_TYPE_REGEX = /json|xml|html|text|javascript|yaml|csv|x-www-form-urlencoded|graphql/i;

const findHeaderValue = (headers = {}, headerName) => {
  const key = Object.keys(headers || {}).find((name) => name.toLowerCase() === headerName.toLowerCase());
  if (!key) {
    return '';
  }
  const value = headers[key];
  return Array.isArray(value) ? String(value[0] ?? '') : String(value ?? '');
};

const headersToHarArray = (headers = {}) =>
  Object.entries(headers || {}).flatMap(([name, value]) =>
    Array.isArray(value)
      ? value.map((v) => ({ name, value: String(v ?? '') }))
      : [{ name, value: String(value ?? '') }]
  );

const parseQueryString = (url) => {
  try {
    return [...new URL(url).searchParams.entries()].map(([name, value]) => ({ name, value }));
  } catch (err) {
    return [];
  }
};

const splitNameValue = (pair, separator = '=') => {
  const index = pair.indexOf(separator);
  if (index === -1) {
    return { name: pair.trim(), value: '' };
  }
  return { name: pair.slice(0, index).trim(), value: pair.slice(index + 1).trim() };
};

const parseRequestCookies = (headers = {}) => {
  const cookieHeader = findHeaderValue(headers, 'cookie');
  if (!cookieHeader) {
    return [];
  }
  return cookieHeader
    .split(';')
    .map((pair) => pair.trim())
    .filter(Boolean)
    .map((pair) => splitNameValue(pair));
};

const parseResponseCookies = (headers = {}) => {
  const key = Object.keys(headers || {}).find((name) => name.toLowerCase() === 'set-cookie');
  if (!key) {
    return [];
  }
  const values = Array.isArray(headers[key]) ? headers[key] : [headers[key]];
  return values.filter(Boolean).map((setCookie) => splitNameValue(String(setCookie).split(';')[0]));
};

const buildHarRequest = (requestSent = {}) => {
  const headers = requestSent.headers || {};
  const harRequest = {
    method: requestSent.method || 'GET',
    url: requestSent.url || '',
    httpVersion: 'HTTP/1.1',
    cookies: parseRequestCookies(headers),
    headers: headersToHarArray(headers),
    queryString: parseQueryString(requestSent.url),
    headersSize: -1,
    bodySize: 0
  };

  const body = requestSent.data;
  if (body !== undefined && body !== null && body !== '') {
    const text = typeof body === 'string' ? body : JSON.stringify(body);
    harRequest.postData = {
      mimeType: findHeaderValue(headers, 'content-type') || 'text/plain',
      text
    };
    harRequest.bodySize = Buffer.byteLength(text, 'utf8');
  }

  return harRequest;
};

const buildHarResponse = (response = {}) => {
  const headers = response.headers || {};
  const mimeType = findHeaderValue(headers, 'content-type');
  const bodyBuffer = response.dataBuffer ? Buffer.from(response.dataBuffer, 'base64') : Buffer.alloc(0);

  const content = {
    size: bodyBuffer.length,
    mimeType
  };
  if (!bodyBuffer.length || TEXTUAL_MIME_TYPE_REGEX.test(mimeType)) {
    content.text = bodyBuffer.toString('utf8');
  } else {
    content.text = response.dataBuffer;
    content.encoding = 'base64';
  }

  return {
    status: Number(response.status) || 0,
    statusText: response.statusText || '',
    httpVersion: 'HTTP/1.1',
    cookies: parseResponseCookies(headers),
    headers: headersToHarArray(headers),
    content,
    redirectURL: findHeaderValue(headers, 'location'),
    headersSize: -1,
    bodySize: bodyBuffer.length
  };
};

/**
 * Builds a HAR 1.2 log (http://www.softwareishard.com/blog/har-12-spec/) from the
 * request that was actually sent (item.requestSent) and the response received (item.response).
 */
export const buildHarLog = ({ requestSent = {}, response = {} }) => {
  const duration = Number(response.duration) || 0;

  return {
    log: {
      version: '1.2',
      creator: {
        name: 'Bruno',
        version
      },
      entries: [
        {
          startedDateTime: new Date(requestSent.timestamp || Date.now()).toISOString(),
          time: duration,
          request: buildHarRequest(requestSent),
          response: buildHarResponse(response),
          cache: {},
          timings: {
            blocked: -1,
            dns: -1,
            connect: -1,
            ssl: -1,
            send: 0,
            wait: duration,
            receive: 0
          }
        }
      ]
    }
  };
};
