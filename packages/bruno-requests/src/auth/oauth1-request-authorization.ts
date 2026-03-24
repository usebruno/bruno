// OAuth 1.0 request authorization (RFC 5849)
// Logic referred from https://github.com/ddo/oauth-1.0a

import crypto from 'node:crypto';
import fs from 'node:fs';
import nodePath from 'node:path';

// Private key file cache: avoids re-reading the same file on every request.
// Keyed by absolute path; invalidated when the file's mtime changes.
// Capped at 50 entries to prevent unbounded growth in long-running processes.
const PRIVATE_KEY_CACHE_MAX = 50;
const privateKeyCache = new Map<string, { mtimeMs: number; content: string }>();

function readPrivateKeyFile(filePath: string): string {
  const stat = fs.statSync(filePath);
  const cached = privateKeyCache.get(filePath);
  if (cached && cached.mtimeMs === stat.mtimeMs) {
    return cached.content;
  }
  const content = fs.readFileSync(filePath, 'utf-8');
  if (privateKeyCache.size >= PRIVATE_KEY_CACHE_MAX) {
    // Evict the oldest entry (first inserted)
    const oldestKey = privateKeyCache.keys().next().value;
    if (oldestKey !== undefined) {
      privateKeyCache.delete(oldestKey);
    }
  }
  privateKeyCache.set(filePath, { mtimeMs: stat.mtimeMs, content });
  return content;
}

export type SignatureMethod = 'HMAC-SHA1' | 'HMAC-SHA256' | 'HMAC-SHA512' | 'RSA-SHA1' | 'RSA-SHA256' | 'RSA-SHA512' | 'PLAINTEXT';

export interface OAuth1Config {
  consumer: { key: string; secret: string };
  signature_method: SignatureMethod;
  version?: string;
  realm?: string;
  private_key?: string;
  hash_function?: (baseString: string, key: string) => string;
}

export interface OAuth1RequestData {
  url: string;
  method: string;
  data?: Array<[string, string]>;
}

export interface OAuth1Token {
  key: string;
  secret: string;
}

export interface OAuth1AuthData {
  oauth_consumer_key: string;
  oauth_nonce: string;
  oauth_signature_method: string;
  oauth_timestamp: string;
  oauth_version: string;
  oauth_token?: string;
  oauth_signature: string;
  oauth_body_hash?: string;
  [key: string]: string | undefined;
}

// RFC 5849 percent-encoding
export function percentEncode(str: string): string {
  return encodeURIComponent(str)
    .replace(/!/g, '%21')
    .replace(/\*/g, '%2A')
    .replace(/'/g, '%27')
    .replace(/\(/g, '%28')
    .replace(/\)/g, '%29');
}

// Nonce generation
const NONCE_CHARS = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
function generateNonce(length = 32): string {
  const bytes = crypto.randomBytes(length);
  let result = '';
  for (let i = 0; i < length; i++) {
    result += NONCE_CHARS[bytes[i] % NONCE_CHARS.length];
  }
  return result;
}

// Timestamp
function generateTimestamp(): string {
  return Math.floor(Date.now() / 1000).toString();
}

// Parse query string from URL
// Escapes bare '+' before delegating to URLSearchParams, because
// URLSearchParams decodes '+' as space (HTML form convention) but
// RFC 5849 treats '+' as a literal character.
export function parseQueryParams(url: string): Array<[string, string]> {
  try {
    const parsed = new URL(url);
    if (!parsed.search) return [];

    // Escape bare '+' so URLSearchParams preserves them as literal '+'
    const safeSearch = parsed.search.slice(1).replace(/\+/g, '%2B');
    const searchParams = new URLSearchParams(safeSearch);
    const pairs: Array<[string, string]> = [];

    searchParams.forEach((value, key) => {
      pairs.push([key, value]);
    });
    return pairs;
  } catch {
    return [];
  }
}

// Base URL normalized per RFC 5849 §3.4.1.2
// Lowercase scheme/host, strip default ports, remove query string and fragment
export function getBaseUrl(url: string): string {
  try {
    const parsed = new URL(url);
    const scheme = parsed.protocol.toLowerCase();
    const host = parsed.hostname.toLowerCase();
    const port = parsed.port;

    // Omit default ports (80 for http, 443 for https)
    const includePort
      = port && !((scheme === 'http:' && port === '80') || (scheme === 'https:' && port === '443'));

    return `${scheme}//${host}${includePort ? ':' + port : ''}${parsed.pathname}`;
  } catch {
    // Fallback for non-standard URLs: just strip query string and fragment
    return url.split('?')[0].split('#')[0];
  }
}

// Build the normalized parameter string (RFC 5849 §3.4.1.3.2)
export function buildParameterString(
  oauthParams: Record<string, string>,
  queryParams: Array<[string, string]>
): string {
  const collected: Array<[string, string]> = [];

  for (const [k, v] of Object.entries(oauthParams)) {
    collected.push([percentEncode(k), percentEncode(v)]);
  }

  for (const [k, v] of queryParams) {
    collected.push([percentEncode(k), percentEncode(v)]);
  }

  collected.sort((a, b) => {
    if (a[0] < b[0]) return -1;
    if (a[0] > b[0]) return 1;
    if (a[1] < b[1]) return -1;
    if (a[1] > b[1]) return 1;
    return 0;
  });

  return collected.map(([k, v]) => `${k}=${v}`).join('&');
}

// Signature Base String (RFC 5849 §3.4.1)
export function buildBaseString(method: string, baseUrl: string, parameterString: string): string {
  return `${method.toUpperCase()}&${percentEncode(baseUrl)}&${percentEncode(parameterString)}`;
}

// Signing Key (RFC 5849 §3.4.2)
export function buildSigningKey(consumerSecret: string, tokenSecret: string): string {
  return `${percentEncode(consumerSecret)}&${percentEncode(tokenSecret)}`;
}

// Default hash function
function defaultHashFunction(
  baseString: string,
  key: string,
  method: SignatureMethod,
  privateKey?: string
): string {
  switch (method) {
    case 'PLAINTEXT':
      return key;

    case 'RSA-SHA1':
    case 'RSA-SHA256':
    case 'RSA-SHA512': {
      if (!privateKey) {
        throw new Error(`Private key is required for ${method} signature method`);
      }
      const algoMap: Record<string, string> = {
        'RSA-SHA1': 'RSA-SHA1',
        'RSA-SHA256': 'RSA-SHA256',
        'RSA-SHA512': 'RSA-SHA512'
      };
      const signer = crypto.createSign(algoMap[method]);
      signer.update(baseString);
      return signer.sign(privateKey, 'base64');
    }

    case 'HMAC-SHA512':
      return crypto.createHmac('sha512', key).update(baseString).digest('base64');

    case 'HMAC-SHA256':
      return crypto.createHmac('sha256', key).update(baseString).digest('base64');

    case 'HMAC-SHA1':
      return crypto.createHmac('sha1', key).update(baseString).digest('base64');

    default:
      throw new Error(`Unsupported OAuth1 signature method: ${method}`);
  }
}

// Body Hash (draft-eaton-oauth-bodyhash-00)
// https://datatracker.ietf.org/doc/id/draft-eaton-oauth-bodyhash-00.html
export function computeBodyHash(body: string, signatureMethod: SignatureMethod): string {
  const algoMap: Record<string, string> = {
    'HMAC-SHA512': 'sha512',
    'HMAC-SHA256': 'sha256',
    'RSA-SHA512': 'sha512',
    'RSA-SHA256': 'sha256'
  };
  const algo = algoMap[signatureMethod] || 'sha1';
  return crypto.createHash(algo).update(body).digest('base64');
}

/**
 * OAuth 1.0 authorization library (RFC 5849).
 *
 * API mirrors the oauth-1.0a npm package:
 * - `authorize(requestData, token?)` - generates signed OAuth params
 * - `toHeader(oauthData)` - formats params as an Authorization header
 *
 * Implements signing from scratch using Node.js crypto.
 * Supports HMAC-SHA1, HMAC-SHA256, HMAC-SHA512, RSA-SHA1, RSA-SHA256, RSA-SHA512, and PLAINTEXT.
 */
export function createOAuth1Authorizer(config: OAuth1Config) {
  const {
    consumer,
    signature_method: signatureMethod = 'HMAC-SHA1',
    version = '1.0',
    realm,
    private_key: privateKey,
    hash_function: customHashFunction
  } = config;

  function authorize(
    requestData: OAuth1RequestData,
    token?: OAuth1Token,
    callbackUrl?: string,
    verifier?: string,
    overrides?: { timestamp?: string; nonce?: string }
  ): OAuth1AuthData {
    const oauthParams: Record<string, string> = {
      oauth_consumer_key: consumer.key,
      oauth_nonce: overrides?.nonce || generateNonce(),
      oauth_signature_method: signatureMethod,
      oauth_timestamp: overrides?.timestamp || generateTimestamp(),
      oauth_version: version || '1.0'
    };

    if (token?.key) {
      oauthParams.oauth_token = token.key;
    }

    // RFC 5849 §2.1: oauth_callback is REQUIRED in the Temporary Credentials Request
    if (callbackUrl) {
      oauthParams.oauth_callback = callbackUrl;
    }

    // RFC 5849 §2.3: oauth_verifier is REQUIRED in the Token Credentials Request
    if (verifier) {
      oauthParams.oauth_verifier = verifier;
    }

    // Separate oauth_* extension params (e.g. oauth_body_hash) from body params
    // oauth_* params go into oauthParams (included in Authorization header)
    // Body params are kept as pairs (preserving duplicates per RFC 5849 §3.4.1.3.2)
    const bodyParams: Array<[string, string]> = [];
    if (requestData.data) {
      for (const [k, v] of requestData.data) {
        if (k.startsWith('oauth_')) {
          oauthParams[k] = v;
        } else {
          bodyParams.push([k, v]);
        }
      }
    }

    const extraParams: Array<[string, string]> = [
      ...parseQueryParams(requestData.url),
      ...bodyParams
    ];

    const parameterString = buildParameterString(oauthParams, extraParams);
    const baseString = buildBaseString(requestData.method, getBaseUrl(requestData.url), parameterString);

    // Build signing key & sign
    const tokenSecret = token?.secret || '';
    const signingKey = buildSigningKey(consumer.secret, tokenSecret);

    if (customHashFunction) {
      oauthParams.oauth_signature = customHashFunction(baseString, signingKey);
    } else {
      oauthParams.oauth_signature = defaultHashFunction(baseString, signingKey, signatureMethod, privateKey);
    }

    return oauthParams as OAuth1AuthData;
  }

  function toHeader(oauthData: OAuth1AuthData): { Authorization: string } {
    let header = 'OAuth ';

    if (realm) {
      header += `realm="${realm.replace(/\\/g, '\\\\').replace(/"/g, '\\"')}", `;
    }

    const parts: string[] = [];
    const sortedKeys = Object.keys(oauthData).sort();
    for (const key of sortedKeys) {
      if (!key.startsWith('oauth_')) continue;
      parts.push(`${percentEncode(key)}="${percentEncode(oauthData[key]!)}"`);
    }

    header += parts.join(', ');
    return { Authorization: header };
  }

  return { authorize, toHeader };
}

/**
 * Applies OAuth1 signing to a request object in-place.
 *
 * Handles the full flow: authorizer creation, body hash, signing with
 * optional timestamp/nonce overrides, and placing params in header,
 * query string, or body per RFC 5849.
 *
 * Shared by bruno-electron and bruno-cli to avoid duplication.
 */
export function applyOAuth1ToRequest(request: {
  url: string;
  method: string;
  headers: Record<string, string>;
  data?: any;
  oauth1config: {
    consumerKey: string;
    consumerSecret: string;
    accessToken?: string;
    accessTokenSecret?: string;
    callbackUrl?: string;
    verifier?: string;
    signatureEncoding?: string;
    privateKey?: string;
    privateKeyType?: string;
    timestamp?: string;
    nonce?: string;
    version?: string;
    realm?: string;
    addParamsTo?: string;
    includeBodyHash?: boolean;
  };
}, collectionPath?: string): void {
  const {
    consumerKey, consumerSecret, accessToken, accessTokenSecret,
    callbackUrl, verifier, signatureEncoding, privateKey, privateKeyType, timestamp, nonce,
    version, realm, addParamsTo, includeBodyHash
  } = request.oauth1config;

  // Clear credentials from the request object before any operation that could throw
  delete (request as any).oauth1config;

  // Resolve private key: read from file if privateKeyType is 'file', otherwise use as-is
  let resolvedPrivateKey: string | undefined;
  if (privateKey) {
    if (privateKeyType === 'file') {
      let filePath = privateKey;
      if (collectionPath && !nodePath.isAbsolute(filePath)) {
        filePath = nodePath.join(collectionPath, filePath);
      }
      resolvedPrivateKey = readPrivateKeyFile(filePath);
    } else {
      resolvedPrivateKey = privateKey.replace(/\\n/g, '\n');
    }
  }

  const authorizer = createOAuth1Authorizer({
    consumer: { key: consumerKey, secret: consumerSecret },
    signature_method: (signatureEncoding || 'HMAC-SHA1') as SignatureMethod,
    version: version || '1.0',
    realm: realm || undefined,
    private_key: resolvedPrivateKey
  });

  const requestData: OAuth1RequestData = {
    url: request.url,
    method: request.method
  };

  // Determine if body is form-encoded
  const ctKey = Object.keys(request.headers).find((name) => name.toLowerCase() === 'content-type');
  const ctValue = (ctKey ? request.headers[ctKey] : '') || '';
  const isFormUrlEncoded = ctValue.startsWith('application/x-www-form-urlencoded');
  const method = request.method.toUpperCase();
  const hasBody = method !== 'GET' && method !== 'HEAD';

  // RFC 5849 §3.4.1.3.1: form-encoded body params MUST be included in the signature base string.
  // When addParamsTo is 'body', include body params even for GET/HEAD since Bruno sends the body regardless.
  const dataPairs: Array<[string, string]> = [];
  const includeBodyInSignature = addParamsTo === 'body' || hasBody;

  if (includeBodyInSignature && isFormUrlEncoded && request.data) {
    const bodyStr = typeof request.data === 'string' ? request.data : '';
    if (bodyStr) {
      new URLSearchParams(bodyStr).forEach((v, k) => {
        dataPairs.push([k, v]);
      });
    }
  }

  // draft-eaton-oauth-bodyhash-00 §3.2: MUST NOT include oauth_body_hash for form-encoded bodies;
  // if no entity body, hash over the empty string
  if (includeBodyHash && !isFormUrlEncoded) {
    const bodyStr = request.data
      ? (typeof request.data === 'string' ? request.data : JSON.stringify(request.data))
      : '';
    const bodyHash = computeBodyHash(bodyStr, (signatureEncoding || 'HMAC-SHA1') as SignatureMethod);
    dataPairs.push(['oauth_body_hash', bodyHash]);
  }

  if (dataPairs.length > 0) {
    requestData.data = dataPairs;
  }

  const token = accessToken ? { key: accessToken, secret: accessTokenSecret || '' } : undefined;
  const overrides: { timestamp?: string; nonce?: string } = {};
  if (timestamp) overrides.timestamp = timestamp;
  if (nonce) overrides.nonce = nonce;
  const oauthData = authorizer.authorize(requestData, token, callbackUrl || undefined, verifier || undefined, overrides);

  switch (addParamsTo || 'header') {
    case 'header':
      request.headers['Authorization'] = authorizer.toHeader(oauthData).Authorization;
      break;
    case 'query': {
      const url = new URL(request.url);
      Object.entries(oauthData).forEach(([key, value]) => {
        if (value) url.searchParams.set(key, value);
      });
      request.url = url.toString();
      break;
    }
    case 'body': {
      const params = new URLSearchParams(isFormUrlEncoded ? request.data : '');
      Object.entries(oauthData).forEach(([key, value]) => {
        if (value !== undefined) params.set(key, value);
      });
      request.data = params.toString();

      if (!isFormUrlEncoded) {
        if (ctKey) {
          request.headers[ctKey] = 'application/x-www-form-urlencoded';
        } else {
          request.headers['Content-Type'] = 'application/x-www-form-urlencoded';
        }
      }
      break;
    }
  }
}
