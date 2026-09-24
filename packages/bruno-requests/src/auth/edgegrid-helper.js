import {
  MAX_BODY_SIZE_DEFAULT,
  makeEdgeGridTimestamp,
  makeEdgeGridNonce,
  canonicalizeHeaders,
  base64HmacSha256,
  makeContentHash,
  isStrPresent
} from '@usebruno/common/utils';

const { URL } = require('node:url');

/**
 * Akamai EdgeGrid Authentication Helper
 * Implements the EG1-HMAC-SHA256 scheme exactly as Akamai's official client library
 * (https://github.com/akamai/AkamaiOPEN-edgegrid-node) so signatures validate against
 * the real Akamai gateway. The signing/crypto primitives are shared with the Generate Code
 * signer via @usebruno/common/utils; they use Web Crypto and are async.
 * Spec: https://techdocs.akamai.com/developer/docs/authenticate-with-edgegrid
 */

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
 * @returns {Promise<string>} Authorization header value
 */
export async function signEdgeGridRequest(config, request) {
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

  // Hash the body bytes exactly as sent — do NOT parse/re-stringify (that would change the payload).
  const bodyText = typeof request.data === 'string' ? request.data : request.data ? JSON.stringify(request.data) : '';

  // data-to-sign: tab-joined, in the exact order Akamai expects.
  const dataToSign = [
    request.method.toUpperCase(),
    parsedUrl.protocol.replace(':', ''),
    parsedUrl.host,
    parsedUrl.pathname + parsedUrl.search,
    canonicalizeHeaders(headersToSign, request.headers),
    await makeContentHash(request.method, bodyText, maxBodySize),
    authHeader
  ].join('\t');

  // Signing key is the base64 STRING of HMAC(timestamp, clientSecret); the signature is then
  // HMAC(dataToSign, signingKey) — both base64-encoded.
  const signingKey = await base64HmacSha256(timestamp, clientSecret);
  const signature = await base64HmacSha256(dataToSign, signingKey);

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

  // Sign requests as they go out. The signer is async (Web Crypto), and axios awaits a
  // Promise-returning request interceptor.
  axiosInstance.interceptors.request.use(
    async (config) => {
      try {
        config.headers['Authorization'] = await signEdgeGridRequest(edgeGridConfig, config);
        return config;
      } catch (error) {
        console.error('EdgeGrid signing error:', error);
        return Promise.reject(error);
      }
    },
    (error) => {
      return Promise.reject(error);
    }
  );
}
