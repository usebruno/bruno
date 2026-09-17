'use strict';

/**
 * Local Akamai EdgeGrid (EG1-HMAC-SHA256) verification server — a stand-in for the real
 * Akamai gateway so EdgeGrid auth can be tested end-to-end without a paid Akamai control API.
 *
 * It re-derives the signature from the received request + the known client secret (per the
 * official EdgeGrid algorithm) and compares. Valid requests → 200, anything else → 401.
 *
 * Three things the Authorization header does NOT carry are supplied via test-control headers
 * (these are never part of headers_to_sign, so they don't affect the client's signature):
 *   - x-eg-headers-to-sign : comma-separated header names the client signed (default: none)
 *   - x-eg-max-body-size   : max body size the client used                  (default: 131072)
 * For base_url overrides, point the collection's base_url at this server's host so the signed
 * host matches the received host.
 *
 * This is an INDEPENDENT implementation of the spec (it does not import @usebruno/requests),
 * so it also guards against regressions in the shared signing helper.
 */

const express = require('express');
const crypto = require('crypto');
const { URL } = require('node:url');

const router = express.Router();

// Known test credentials. Fixtures import TEST_EDGEGRID so both sides share the secret.
const TEST_EDGEGRID = {
  clientToken: 'akab-client-token-bruno-test',
  accessToken: 'akab-access-token-bruno-test',
  clientSecret: 'dGVzdC1jbGllbnQtc2VjcmV0LWZvci1icnVuby1lZGdlZ3JpZA=='
};

const MAX_BODY_SIZE_DEFAULT = 131072;

const base64HmacSha256 = (data, key) => crypto.createHmac('sha256', key).update(data).digest('base64');
const base64Sha256 = (data) => crypto.createHash('sha256').update(data).digest('base64');

function parseAuthHeader(header) {
  if (!header || !header.startsWith('EG1-HMAC-SHA256 ')) return null;
  const out = {};
  header
    .slice('EG1-HMAC-SHA256 '.length)
    .split(';')
    .filter(Boolean)
    .forEach((pair) => {
      const i = pair.indexOf('=');
      if (i > -1) out[pair.slice(0, i).trim()] = pair.slice(i + 1);
    });
  return out;
}

function canonicalizeHeaders(headersToSign, requestHeaders) {
  if (!headersToSign || !headersToSign.trim()) return '';
  const lookup = {};
  Object.keys(requestHeaders || {}).forEach((name) => {
    lookup[name.toLowerCase()] = requestHeaders[name];
  });
  return headersToSign
    .split(',')
    .map((name) => name.trim().toLowerCase())
    .filter(Boolean)
    .filter((name) => Object.prototype.hasOwnProperty.call(lookup, name))
    .map((name) => `${name}:${String(lookup[name]).trim().replace(/\s+/g, ' ')}`)
    .join('\t');
}

function makeContentHash(method, rawBody, maxBodySize) {
  if (!method || method.toUpperCase() !== 'POST') return '';
  if (!rawBody || rawBody.length === 0) return '';
  let body = rawBody;
  if (body.length > maxBodySize) body = body.substring(0, maxBodySize);
  return base64Sha256(body);
}

/**
 * Verify an incoming EdgeGrid-signed request.
 * @returns {{ ok: true } | { ok: false, status: number, error: string }}
 */
function verifyEdgeGridRequest(req, opts = {}) {
  const clients = opts.clients || { [TEST_EDGEGRID.clientToken]: TEST_EDGEGRID };

  const parsed = parseAuthHeader(req.headers['authorization']);
  if (!parsed) {
    return { ok: false, status: 401, error: 'Missing or malformed EG1-HMAC-SHA256 Authorization header' };
  }
  for (const field of ['client_token', 'access_token', 'timestamp', 'nonce', 'signature']) {
    if (!parsed[field]) return { ok: false, status: 401, error: `Authorization missing ${field}` };
  }

  const client = clients[parsed.client_token];
  if (!client || client.accessToken !== parsed.access_token) {
    return { ok: false, status: 401, error: 'Unknown client_token / access_token' };
  }

  const headersToSign = req.headers['x-eg-headers-to-sign'] || '';
  const maxBodySize = req.headers['x-eg-max-body-size']
    ? parseInt(req.headers['x-eg-max-body-size'], 10)
    : MAX_BODY_SIZE_DEFAULT;

  // Reconstruct the URL the client signed (this server sits directly in front of the request).
  const scheme = req.protocol;
  const host = req.headers['host'];
  const u = new URL(`${scheme}://${host}${req.originalUrl}`);

  const authHeader
    = `EG1-HMAC-SHA256 client_token=${parsed.client_token};access_token=${parsed.access_token};`
      + `timestamp=${parsed.timestamp};nonce=${parsed.nonce};`;

  const dataToSign = [
    req.method.toUpperCase(),
    u.protocol.replace(':', ''),
    u.host,
    u.pathname + u.search,
    canonicalizeHeaders(headersToSign, req.headers),
    makeContentHash(req.method, req.rawBody, maxBodySize),
    authHeader
  ].join('\t');

  const signingKey = base64HmacSha256(parsed.timestamp, client.clientSecret);
  const expected = base64HmacSha256(dataToSign, signingKey);

  // constant-time compare
  const a = Buffer.from(expected);
  const b = Buffer.from(parsed.signature);
  const matches = a.length === b.length && crypto.timingSafeEqual(a, b);
  if (!matches) {
    return { ok: false, status: 401, error: 'Signature mismatch' };
  }
  // Echo back the effective values the request was signed with, so tests can assert that
  // empty Advanced Settings fields were filled in with Bruno's auto-generated defaults
  // (nonce → UUID v4, timestamp → now, base_url → request host, max_body_size → 131072).
  return {
    ok: true,
    effective: {
      method: req.method.toUpperCase(),
      path: u.pathname + u.search,
      host: u.host,
      nonce: parsed.nonce,
      timestamp: parsed.timestamp,
      headersToSign: headersToSign,
      maxBodySize
    }
  };
}

router.all('*', (req, res) => {
  const result = verifyEdgeGridRequest(req);
  if (!result.ok) {
    return res.status(result.status).json({ authenticated: false, error: result.error });
  }
  return res.status(200).json({ authenticated: true, ...result.effective });
});

module.exports = router;
module.exports.verifyEdgeGridRequest = verifyEdgeGridRequest;
module.exports.TEST_EDGEGRID = TEST_EDGEGRID;
