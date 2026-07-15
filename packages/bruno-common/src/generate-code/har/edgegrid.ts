import * as CryptoJS from 'crypto-js';

/**
 * Browser-safe EG1-HMAC-SHA256 signer for Generate Code snippets.
 *
 * Ported from the runtime signer (packages/bruno-requests/src/auth/edgegrid-helper.js) so the
 * generated `Authorization` header validates against the real Akamai gateway - the difference is
 * this variant uses crypto-js (works in the browser) instead of Node's `crypto`, since codegen
 * runs in the renderer. Kept byte-for-byte compatible with Akamai's reference implementation.
 */

const MAX_BODY_SIZE_DEFAULT = 131072; // 128 KB

const isStrPresent = (str?: string | null): boolean =>
  !!str && String(str).trim() !== '' && String(str).trim() !== 'undefined';

// base64(HMAC-SHA256(data, key)) - key is a UTF-8 string, matching the runtime signer.
const base64HmacSha256 = (data: string, key: string): string =>
  CryptoJS.HmacSHA256(data, key).toString(CryptoJS.enc.Base64);

// base64(SHA256(data))
const base64Sha256 = (data: string): string => CryptoJS.SHA256(data).toString(CryptoJS.enc.Base64);

// UTC timestamp in EdgeGrid format: YYYYMMDDTHH:MM:SS+0000
const makeEdgeGridTimestamp = (): string => {
  const [datePart, timePart] = new Date().toISOString().split('T');
  return `${datePart.replace(/-/g, '')}T${timePart.replace(/\.\d+Z$/, '')}+0000`;
};

// UUID v4 for the nonce. A snippet nonce need not be cryptographically strong.
const makeNonce = (): string =>
  'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16);
  });

// `name:value` per signed header (lowercased name, trimmed + whitespace-collapsed value),
// tab-joined. Only headers present on the request are emitted, preserving config order.
const canonicalizeHeaders = (headersToSign?: string, requestHeaders: Record<string, string> = {}): string => {
  if (!isStrPresent(headersToSign)) return '';
  const lookup: Record<string, string> = {};
  Object.keys(requestHeaders || {}).forEach((name) => {
    lookup[name.toLowerCase()] = requestHeaders[name];
  });
  return (headersToSign as string)
    .split(',')
    .map((name) => name.trim().toLowerCase())
    .filter((name) => name.length > 0)
    .filter((name) => Object.prototype.hasOwnProperty.call(lookup, name))
    .map((name) => `${name}:${String(lookup[name]).trim().replace(/\s+/g, ' ')}`)
    .join('\t');
};

// Akamai hashes the body for POST only, over the bytes as sent, truncated to maxBodySize.
const makeContentHash = (method: string, bodyText: string | undefined, maxBodySize: number): string => {
  if (!method || method.toUpperCase() !== 'POST' || !bodyText) return '';
  let body = bodyText;
  if (body.length === 0) return '';
  if (body.length > maxBodySize) body = body.substring(0, maxBodySize);
  return base64Sha256(body);
};

export interface EdgeGridSignConfig {
  accessToken?: string | null;
  clientToken?: string | null;
  clientSecret?: string | null;
  baseURL?: string | null;
  nonce?: string | null;
  timestamp?: string | null;
  headersToSign?: string | null;
  maxBodySize?: number | string | null;
}

export interface EdgeGridSignRequest {
  method: string;
  url: string;
  headers?: Record<string, string>;
  bodyText?: string;
}

/**
 * Compute the EG1-HMAC-SHA256 `Authorization` header value, or `null` when the
 * required credentials / a valid URL are missing (so the caller can omit the header).
 */
export const signEdgeGridRequest = (
  config: EdgeGridSignConfig,
  request: EdgeGridSignRequest
): string | null => {
  const { accessToken, clientToken, clientSecret, baseURL, headersToSign } = config;
  if (!isStrPresent(accessToken) || !isStrPresent(clientToken) || !isStrPresent(clientSecret)) return null;
  if (!request?.url || !request?.method) return null;

  const maxBodySize = config.maxBodySize ? parseInt(String(config.maxBodySize), 10) : MAX_BODY_SIZE_DEFAULT;
  const nonce = isStrPresent(config.nonce) ? (config.nonce as string) : makeNonce();
  const timestamp = isStrPresent(config.timestamp) ? (config.timestamp as string) : makeEdgeGridTimestamp();

  let parsedUrl: URL;
  try {
    let urlToSign = request.url;
    if (isStrPresent(baseURL)) {
      const requestUrl = new URL(request.url);
      const trimmed = (baseURL as string).trim();
      // A scheme-less baseURL ("localhost:6000") mis-parses; borrow the request scheme.
      const normalized = /^[a-z][a-z0-9+.-]*:\/\//i.test(trimmed) ? trimmed : `${requestUrl.protocol}//${trimmed}`;
      const baseParsed = new URL(normalized);
      urlToSign = `${baseParsed.protocol}//${baseParsed.host}${requestUrl.pathname}${requestUrl.search}`;
    }
    parsedUrl = new URL(urlToSign);
  } catch {
    return null;
  }

  // The auth header (sans signature) is also the last field of the data-to-sign, per spec.
  const authHeader = `EG1-HMAC-SHA256 client_token=${clientToken};access_token=${accessToken};timestamp=${timestamp};nonce=${nonce};`;

  // With variables unresolved (Generate Code, interpolation off) a real signature can't be
  // produced - it would sign literal `{{var}}` tokens. Emit a placeholder the user replaces
  // once the request is signed at send time.
  if (/\{\{.+?\}\}/.test(authHeader) || /\{\{.+?\}\}/.test(clientSecret as string)) {
    return `${authHeader}signature=<computed-at-request-time>`;
  }

  const dataToSign = [
    request.method.toUpperCase(),
    parsedUrl.protocol.replace(':', ''),
    parsedUrl.host,
    parsedUrl.pathname + parsedUrl.search,
    canonicalizeHeaders(headersToSign as string, request.headers),
    makeContentHash(request.method, request.bodyText, maxBodySize),
    authHeader
  ].join('\t');

  const signingKey = base64HmacSha256(timestamp, clientSecret as string);
  const signature = base64HmacSha256(dataToSign, signingKey);

  return `${authHeader}signature=${signature}`;
};
