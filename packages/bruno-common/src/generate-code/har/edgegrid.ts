import {
  MAX_BODY_SIZE_DEFAULT,
  makeEdgeGridTimestamp,
  makeEdgeGridNonce,
  canonicalizeHeaders,
  base64HmacSha256,
  makeContentHash,
  isStrPresent
} from '../../utils/edgegrid';

/**
 * Browser-safe EG1-HMAC-SHA256 signer for Generate Code snippets.
 *
 * Mirrors the runtime signer (packages/bruno-requests/src/auth/edgegrid-helper.js) so the
 * generated `Authorization` header validates against the real Akamai gateway; both share the
 * signing/crypto primitives in ../../utils/edgegrid. Web Crypto is async, so the signer returns a
 * Promise. Kept byte-for-byte compatible with Akamai's reference implementation.
 */

// buildHar rewrites unresolved `{{var}}` URL tokens to a `bruno-var-hash-*` placeholder
// (packages/bruno-common/src/utils/template-hasher.ts); every other unresolved input stays `{{var}}`.
const UNRESOLVED_INPUT = /\{\{.+?\}\}|bruno-var-hash-/;

export interface AkamaiEdgeGridAuthValues {
  accessToken?: string;
  clientToken?: string;
  clientSecret?: string;
  baseURL?: string | null;
  nonce?: string | null;
  timestamp?: string | null;
  headersToSign?: string | null;
  maxBodySize?: number | null;
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
export const signEdgeGridRequest = async (
  config: AkamaiEdgeGridAuthValues,
  request: EdgeGridSignRequest
): Promise<string | null> => {
  const { accessToken, clientToken, clientSecret, baseURL, headersToSign } = config;
  if (!isStrPresent(accessToken) || !isStrPresent(clientToken) || !isStrPresent(clientSecret)) return null;
  if (!request?.url || !request?.method) return null;

  const maxBodySize = config.maxBodySize ? parseInt(String(config.maxBodySize), 10) : MAX_BODY_SIZE_DEFAULT;
  const nonce = isStrPresent(config.nonce) ? config.nonce : makeEdgeGridNonce();
  const timestamp = isStrPresent(config.timestamp) ? config.timestamp : makeEdgeGridTimestamp();

  // The auth header (sans signature) is also the last field of the data-to-sign, per spec.
  const authHeader = `EG1-HMAC-SHA256 client_token=${clientToken};access_token=${accessToken};timestamp=${timestamp};nonce=${nonce};`;
  const signedHeaders = canonicalizeHeaders(headersToSign, request.headers);

  // A real signature can only be produced when every signed input is fully resolved. Generate Code
  // may still carry `{{var}}` (interpolation off, or an undefined var), and buildHar rewrites
  // unresolved URL vars to `bruno-var-hash-*` — signing either would cover bytes that differ from
  // what's actually sent. Emit a placeholder the user replaces once the request is signed at send time.
  const hasUnresolvedInput = [authHeader, clientSecret, baseURL, headersToSign, request.method, request.url, request.bodyText, signedHeaders]
    .some((v) => typeof v === 'string' && UNRESOLVED_INPUT.test(v));
  if (hasUnresolvedInput) {
    return `${authHeader}signature=<computed-at-request-time>`;
  }

  let parsedUrl: URL;
  try {
    let urlToSign = request.url;
    if (isStrPresent(baseURL)) {
      const requestUrl = new URL(request.url);
      const trimmed = baseURL.trim();
      // A scheme-less baseURL ("localhost:6000") mis-parses; borrow the request scheme.
      const normalized = /^[a-z][a-z0-9+.-]*:\/\//i.test(trimmed) ? trimmed : `${requestUrl.protocol}//${trimmed}`;
      const baseParsed = new URL(normalized);
      urlToSign = `${baseParsed.protocol}//${baseParsed.host}${requestUrl.pathname}${requestUrl.search}`;
    }
    parsedUrl = new URL(urlToSign);
  } catch {
    return null;
  }

  const dataToSign = [
    request.method.toUpperCase(),
    parsedUrl.protocol.replace(':', ''),
    parsedUrl.host,
    parsedUrl.pathname + parsedUrl.search,
    signedHeaders,
    await makeContentHash(request.method, request.bodyText, maxBodySize),
    authHeader
  ].join('\t');

  const signingKey = await base64HmacSha256(timestamp, clientSecret);
  const signature = await base64HmacSha256(dataToSign, signingKey);

  return `${authHeader}signature=${signature}`;
};
