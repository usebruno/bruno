const crypto = require('crypto');
const { URL } = require('node:url');

/**
 * Akamai EdgeGrid Authentication Helper
 * Implements the EG1-HMAC-SHA256 scheme exactly as Akamai's official client library
 * (https://github.com/akamai/AkamaiOPEN-edgegrid-node) so signatures validate against
 * the real Akamai gateway.
 * Spec: https://techdocs.akamai.com/developer/docs/authenticate-with-edgegrid
 */

const MAX_BODY_SIZE_DEFAULT = 131072; // 128 KB

function isStrPresent(str) {
  return str && str.trim() !== '' && str.trim() !== 'undefined';
}

/**
 * Generate a UTC timestamp in EdgeGrid format: YYYYMMDDTHH:MM:SS+0000
 * (date part has no separators, time part keeps colons, fixed +0000 offset).
 * @returns {string}
 */
function makeEdgeGridTimestamp() {
  const [datePart, timePart] = new Date().toISOString().split('T');
  const date = datePart.replace(/-/g, '');
  const time = timePart.replace(/\.\d+Z$/, '');
  return `${date}T${time}+0000`;
}

/**
 * Generate a random nonce (UUID v4)
 * @returns {string}
 */
function makeEdgeGridNonce() {
  return crypto.randomUUID();
}

/**
 * Base64-encoded HMAC-SHA256. Note the result is a base64 STRING; when used as the
 * signing key it is passed (as a string) as the key of the next HMAC — matching Akamai.
 * @param {string|Buffer} data
 * @param {string} key
 * @returns {string}
 */
function base64HmacSha256(data, key) {
  return crypto.createHmac('sha256', key).update(data).digest('base64');
}

/**
 * Base64-encoded SHA256 hash.
 * @param {string|Buffer} data
 * @returns {string}
 */
function base64Sha256(data) {
  return crypto.createHash('sha256').update(data).digest('base64');
}

/**
 * Build the canonicalized headers segment from the comma-separated list of header NAMES
 * the user asked to sign, pulling the actual values off the outgoing request.
 * Format per header: `name(lowercase):value(trimmed, internal whitespace collapsed)`,
 * joined by a tab — matching Akamai's canonicalizeHeaders().
 * @param {string} headersToSign - comma-separated header names
 * @param {Object} requestHeaders - outgoing request headers ({ name: value })
 * @returns {string}
 */
function canonicalizeHeaders(headersToSign, requestHeaders = {}) {
  if (!isStrPresent(headersToSign)) {
    return '';
  }

  // case-insensitive lookup of the actual request header values
  const lookup = {};
  Object.keys(requestHeaders || {}).forEach((name) => {
    lookup[name.toLowerCase()] = requestHeaders[name];
  });

  return headersToSign
    .split(',')
    .map((name) => name.trim().toLowerCase())
    .filter((name) => name.length > 0)
    // Akamai only signs headers that are actually present on the request (config order preserved);
    // names not present are skipped, not emitted as empty values.
    .filter((name) => Object.prototype.hasOwnProperty.call(lookup, name))
    .map((name) => `${name}:${String(lookup[name]).trim().replace(/\s+/g, ' ')}`)
    .join('\t');
}

/**
 * Compute the request body content hash. Akamai hashes the body for POST requests only,
 * over the exact bytes that are sent on the wire (no re-serialization), truncated to
 * maxBodySize before hashing.
 * @param {Object} request - axios request config ({ method, data })
 * @param {number} maxBodySize
 * @returns {string} base64 SHA256 of the (possibly truncated) body, or '' when not applicable
 */
function makeContentHash(request, maxBodySize) {
  if (!request.method || request.method.toUpperCase() !== 'POST') {
    return '';
  }

  let body = request.data;
  if (!body) {
    return '';
  }
  // Hash the bytes as sent — do NOT parse/re-stringify (that would change the payload).
  body = typeof body === 'string' ? body : JSON.stringify(body);
  if (body.length === 0) {
    return '';
  }
  if (body.length > maxBodySize) {
    body = body.substring(0, maxBodySize);
  }
  return base64Sha256(body);
}

/**
 * Sign an EdgeGrid request.
 * @param {Object} config - EdgeGrid configuration
 * @param {string} config.accessToken
 * @param {string} config.clientToken
 * @param {string} config.clientSecret
 * @param {string} [config.baseURL] - override host the request is signed against
 * @param {string} [config.nonce] - optional nonce override
 * @param {string} [config.timestamp] - optional timestamp override
 * @param {string} [config.headersToSign] - comma-separated header names to sign
 * @param {string|number} [config.maxBodySize=131072]
 * @param {Object} request - axios request config ({ method, url, headers, data })
 * @returns {string} Authorization header value
 */
export function signEdgeGridRequest(config, request) {
  const { accessToken, clientToken, clientSecret, baseURL, headersToSign } = config;
  const maxBodySize = config.maxBodySize ? parseInt(config.maxBodySize, 10) : MAX_BODY_SIZE_DEFAULT;

  // Validate required fields
  if (!isStrPresent(accessToken)) {
    throw new Error('EdgeGrid: accessToken is required');
  }
  if (!isStrPresent(clientToken)) {
    throw new Error('EdgeGrid: clientToken is required');
  }
  if (!isStrPresent(clientSecret)) {
    throw new Error('EdgeGrid: clientSecret is required');
  }

  // Generate or use provided nonce and timestamp
  const nonce = isStrPresent(config.nonce) ? config.nonce : makeEdgeGridNonce();
  const timestamp = isStrPresent(config.timestamp) ? config.timestamp : makeEdgeGridTimestamp();

  // Determine the URL to sign — use baseURL's host/protocol if provided, otherwise the request URL.
  let urlToSign = request.url;
  if (isStrPresent(baseURL)) {
    const requestUrl = new URL(request.url);
    // A scheme-less baseURL like "localhost:6000" mis-parses ("localhost:" becomes the protocol
    // and the host is empty). If there's no "scheme://", borrow the request URL's scheme.
    const normalizedBaseURL = /^[a-z][a-z0-9+.-]*:\/\//i.test(baseURL.trim())
      ? baseURL.trim()
      : `${requestUrl.protocol}//${baseURL.trim()}`;
    const baseParsed = new URL(normalizedBaseURL);
    urlToSign = `${baseParsed.protocol}//${baseParsed.host}${requestUrl.pathname}${requestUrl.search}`;
  }
  const parsedUrl = new URL(urlToSign);

  // Auth header (without the signature) — this exact string is also the LAST field of the
  // data-to-sign, per the EdgeGrid spec / official library.
  const authHeader
    = `EG1-HMAC-SHA256 client_token=${clientToken};access_token=${accessToken};timestamp=${timestamp};nonce=${nonce};`;

  // data-to-sign: tab-joined, in the exact order Akamai expects.
  const dataToSign = [
    request.method.toUpperCase(),
    parsedUrl.protocol.replace(':', ''),
    parsedUrl.host,
    parsedUrl.pathname + parsedUrl.search,
    canonicalizeHeaders(headersToSign, request.headers),
    makeContentHash(request, maxBodySize),
    authHeader
  ].join('\t');

  // Signing key is the base64 STRING of HMAC(timestamp, clientSecret); the signature is then
  // HMAC(dataToSign, signingKey) — both base64-encoded.
  const signingKey = base64HmacSha256(timestamp, clientSecret);
  const signature = base64HmacSha256(dataToSign, signingKey);

  return `${authHeader}signature=${signature}`;
}

/**
 * Add EdgeGrid interceptor to axios instance
 * @param {Object} axiosInstance - Axios instance
 * @param {Object} request - Request object with edgeGridConfig
 */
export function addEdgeGridInterceptor(axiosInstance, request) {
  const { edgeGridConfig } = request;

  if (!edgeGridConfig) {
    return;
  }

  // Add request interceptor to sign requests
  axiosInstance.interceptors.request.use((config) => {
    try {
      const authHeader = signEdgeGridRequest(edgeGridConfig, config);
      config.headers['Authorization'] = authHeader;
      return config;
    } catch (error) {
      console.error('EdgeGrid signing error:', error);
      return Promise.reject(error);
    }
  },
  (error) => {
    return Promise.reject(error);
  });
}
