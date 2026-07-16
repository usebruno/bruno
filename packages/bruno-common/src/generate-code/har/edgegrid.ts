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

  // The auth header (sans signature) is also the last field of the data-to-sign, per spec.
  const authHeader = `EG1-HMAC-SHA256 client_token=${clientToken};access_token=${accessToken};timestamp=${timestamp};nonce=${nonce};`;

  // With variables unresolved (Generate Code, interpolation off) a real signature can't be
  // produced — it would sign literal `{{var}}` tokens. Emit a placeholder the user replaces
  // once the request is signed at send time.
  if (/\{\{.+?\}\}/.test(authHeader) || /\{\{.+?\}\}/.test(clientSecret)) {
    return `${authHeader}signature=<computed-at-request-time>`;
  }

  const dataToSign = [
    request.method.toUpperCase(),
    parsedUrl.protocol.replace(':', ''),
    parsedUrl.host,
    parsedUrl.pathname + parsedUrl.search,
    canonicalizeHeaders(headersToSign, request.headers),
    await makeContentHash(request.method, request.bodyText, maxBodySize),
    authHeader
  ].join('\t');

  const signingKey = await base64HmacSha256(timestamp, clientSecret);
  const signature = await base64HmacSha256(dataToSign, signingKey);

  return `${authHeader}signature=${signature}`;
};
