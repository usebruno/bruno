const crypto = require('crypto');
const { URL } = require('node:url');

/**
 * Akamai EdgeGrid Authentication Helper
 * Based on the Akamai EdgeGrid authentication specification
 * https://techdocs.akamai.com/developer/docs/authenticate-with-edgegrid
 */

function isStrPresent(str) {
  return str && str.trim() !== '' && str.trim() !== 'undefined';
}

/**
 * Generate a timestamp in ISO 8601 basic format
 * @returns {string} Timestamp in format: YYYYMMDDTHHmmss+0000
 */
function makeEdgeGridTimestamp() {
  return new Date().toISOString().replace(/[:\-]|\.\d{3}/g, '');
}

/**
 * Generate a random nonce (UUID v4)
 * @returns {string} UUID v4 string
 */
function makeEdgeGridNonce() {
  return crypto.randomUUID();
}

/**
 * Create HMAC-SHA256 signature
 * @param {string} data - Data to sign
 * @param {string} key - Secret key for signing
 * @returns {Buffer} HMAC signature
 */
function hmacSha256(data, key) {
  return crypto.createHmac('sha256', key).update(data).digest();
}

/**
 * Create base64-encoded SHA256 hash
 * @param {string} data - Data to hash
 * @returns {string} Base64-encoded hash
 */
function base64Sha256(data) {
  return crypto.createHash('sha256').update(data).digest('base64');
}

/**
 * Create signing key from client secret and timestamp
 * @param {string} clientSecret - Client secret
 * @param {string} timestamp - EdgeGrid timestamp
 * @returns {Buffer} Signing key
 */
function makeSigningKey(clientSecret, timestamp) {
  return hmacSha256(timestamp, clientSecret);
}

/**
 * Create the data to be signed
 * @param {Object} params
 * @param {string} params.method - HTTP method
 * @param {string} params.url - Request URL
 * @param {string} params.headers - Headers to sign
 * @param {string} params.body - Request body
 * @param {number} params.maxBodySize - Maximum body size to sign
 * @returns {string} Data string to be signed
 */
function makeDataToSign({ method, url, headers, body, maxBodySize = 131072 }) {
  const parsedUrl = new URL(url);

  // Get relative path with query string
  const relativePath = parsedUrl.pathname + parsedUrl.search;

  // Construct the canonical request (tab-separated)
  let dataToSign = [
    method.toUpperCase(),
    parsedUrl.protocol.replace(':', ''),
    parsedUrl.host,
    relativePath
  ].join('\t') + '\t';

  // Add canonicalized headers if specified
  if (headers && headers.trim().length > 0) {
    dataToSign += headers.trim() + '\t';
  } else {
    dataToSign += '\t';
  }

  // Add body hash if present and within size limit
  if (body && body.length > 0) {
    const bodyToSign = body.length > maxBodySize ? body.substring(0, maxBodySize) : body;
    dataToSign += base64Sha256(bodyToSign);
  }

  return dataToSign;
}

/**
 * Create the authorization header value
 * @param {Object} params
 * @param {string} params.clientToken - Client token
 * @param {string} params.accessToken - Access token
 * @param {string} params.timestamp - EdgeGrid timestamp
 * @param {string} params.nonce - Nonce value
 * @param {string} params.signature - Request signature
 * @returns {string} Authorization header value
 */
function makeAuthorizationHeader({ clientToken, accessToken, timestamp, nonce, signature }) {
  return `EG1-HMAC-SHA256 client_token=${clientToken};access_token=${accessToken};timestamp=${timestamp};nonce=${nonce};signature=${signature}`;
}

/**
 * Sign an EdgeGrid request
 * @param {Object} config - EdgeGrid configuration
 * @param {string} config.accessToken - Access token
 * @param {string} config.clientToken - Client token
 * @param {string} config.clientSecret - Client secret
 * @param {string} [config.baseURL] - Base URL for the API endpoint
 * @param {string} [config.nonce] - Optional nonce override
 * @param {string} [config.timestamp] - Optional timestamp override
 * @param {string} [config.headersToSign] - Headers to include in signature
 * @param {number} [config.maxBodySize=131072] - Maximum body size to sign (default 128KB)
 * @param {Object} request - Axios request config
 * @returns {string} Authorization header value
 */
export function signEdgeGridRequest(config, request) {
  const { accessToken, clientToken, clientSecret, baseURL, headersToSign } = config;
  // Ensure maxBodySize is a number, default to 128KB if not provided or invalid
  const maxBodySize = config.maxBodySize ? parseInt(config.maxBodySize, 10) : 131072;

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
  const nonce = config.nonce && isStrPresent(config.nonce) ? config.nonce : makeEdgeGridNonce();
  const timestamp = config.timestamp && isStrPresent(config.timestamp) ? config.timestamp : makeEdgeGridTimestamp();

  // Create signing key
  const signingKey = makeSigningKey(clientSecret, timestamp);

  // Prepare request body
  let bodyString = '';
  if (request.data) {
    if (typeof request.data === 'string') {
      // If it's a string, try to parse and re-stringify to ensure compact JSON
      try {
        const parsed = JSON.parse(request.data);
        bodyString = JSON.stringify(parsed); // Compact JSON, no spaces
      } catch (e) {
        // If not valid JSON, use as-is
        bodyString = request.data;
      }
    } else if (typeof request.data === 'object') {
      // Serialize to compact JSON (no spaces/newlines)
      bodyString = JSON.stringify(request.data);
    }
  }

  // Determine URL to sign - use baseURL if provided, otherwise use request URL
  let urlToSign = request.url;
  if (baseURL && isStrPresent(baseURL)) {
    // Parse the request URL to get the path and query
    const requestUrl = new URL(request.url);
    const baseParsed = new URL(baseURL);
    // Construct URL using baseURL's protocol and host with request's path
    urlToSign = `${baseParsed.protocol}//${baseParsed.host}${requestUrl.pathname}${requestUrl.search}`;
  }

  // Create data to sign
  const dataToSign = makeDataToSign({
    method: request.method,
    url: urlToSign,
    headers: headersToSign || '',
    body: bodyString,
    maxBodySize
  });

  // Create the auth data string (without the EG1-HMAC-SHA256 prefix)
  const authData = [
    `client_token=${clientToken}`,
    `access_token=${accessToken}`,
    `timestamp=${timestamp}`,
    `nonce=${nonce}`
  ].join(';') + ';';

  // Sign the auth data + data to sign
  const signatureData = authData + dataToSign;
  const signature = hmacSha256(signatureData, signingKey).toString('base64');

  // Return complete authorization header
  return makeAuthorizationHeader({
    clientToken,
    accessToken,
    timestamp,
    nonce,
    signature
  });
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
