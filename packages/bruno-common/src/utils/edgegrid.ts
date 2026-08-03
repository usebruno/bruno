/**
 * Shared EG1-HMAC-SHA256 primitives, used by both the runtime signer
 * (packages/bruno-requests/src/auth/edgegrid-helper.js) and the Generate Code signer
 * (packages/bruno-common/src/generate-code/har/edgegrid.ts) so the signing logic lives in one
 * place. Uses the native Web Crypto API (`globalThis.crypto`) to stay browser-safe and
 * dependency-free; Web Crypto is async, so the hashing helpers return Promises. Kept byte-for-byte
 * compatible with Akamai's reference implementation (github.com/akamai/AkamaiOPEN-edgegrid-node).
 */

// Web Crypto ships natively in the renderer and Node 18+; typed loosely because bruno-common's
// tsconfig omits the DOM lib.
const subtle = (globalThis as any).crypto.subtle;

export const MAX_BODY_SIZE_DEFAULT = 131072; // 128 KB

export const isStrPresent = (str?: string | null): str is string =>
  !!str && String(str).trim() !== '' && String(str).trim() !== 'undefined';

const utf8 = (data: string): Uint8Array => new TextEncoder().encode(data);
const toBase64 = (buffer: ArrayBuffer): string => Buffer.from(new Uint8Array(buffer)).toString('base64');

// base64(HMAC-SHA256(data, key)) — key is a UTF-8 string. As the EdgeGrid signing key it is the
// base64 STRING of a prior HMAC, passed again as a UTF-8 key — matching Akamai.
export const base64HmacSha256 = async (data: string, key: string): Promise<string> => {
  const cryptoKey = await subtle.importKey('raw', utf8(key), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  return toBase64(await subtle.sign('HMAC', cryptoKey, utf8(data)));
};

// base64(SHA-256(data))
export const base64Sha256 = async (data: string): Promise<string> => toBase64(await subtle.digest('SHA-256', utf8(data)));

// EdgeGrid timestamp: YYYYMMDDTHH:MM:SS+0000. `toISOString()` is always UTC (trailing `Z`)
// irrespective of the system timezone, so dropping the `.sssZ` and appending `+0000` relabels the
// same instant as UTC — it does not zero out a real local offset.
export const makeEdgeGridTimestamp = (): string => {
  const [datePart, timePart] = new Date().toISOString().split('T');
  return `${datePart.replace(/-/g, '')}T${timePart.replace(/\.\d+Z$/, '')}+0000`;
};

// UUID v4 nonce.
export const makeEdgeGridNonce = (): string => (globalThis as any).crypto.randomUUID();

// `name:value` per signed header (lowercased name, trimmed + whitespace-collapsed value),
// tab-joined. Only headers present on the request are emitted, preserving config order.
export const canonicalizeHeaders = (headersToSign?: string | null, requestHeaders: Record<string, string> = {}): string => {
  if (!isStrPresent(headersToSign)) return '';
  const lookup: Record<string, string> = {};
  Object.keys(requestHeaders || {}).forEach((name) => {
    lookup[name.toLowerCase()] = requestHeaders[name];
  });
  return headersToSign
    .split(',')
    .map((name) => name.trim().toLowerCase())
    .filter((name) => name.length > 0)
    .filter((name) => Object.prototype.hasOwnProperty.call(lookup, name))
    .map((name) => `${name}:${String(lookup[name]).trim().replace(/\s+/g, ' ')}`)
    .join('\t');
};

// Akamai hashes the body for POST only, over the bytes as sent, truncated to maxBodySize.
export const makeContentHash = async (
  method: string,
  bodyText: string | undefined,
  maxBodySize: number
): Promise<string> => {
  if (!method || method.toUpperCase() !== 'POST' || !bodyText) return '';
  let body = bodyText;
  if (body.length > maxBodySize) body = body.substring(0, maxBodySize);
  return base64Sha256(body);
};
