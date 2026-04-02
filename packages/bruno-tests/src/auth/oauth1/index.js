const express = require('express');
const crypto = require('crypto');
const router = express.Router();

// ─── Known Test Credentials ────────────────────────────────────────────────────

const consumers = [
  {
    key: 'consumer_key_1',
    secret: 'consumer_secret_1'
  }
];

// Pre-provisioned access token for simple one-legged testing
const accessTokens = [
  {
    token: 'access_token_1',
    secret: 'token_secret_1',
    consumerKey: 'consumer_key_1'
  }
];

// In-memory stores for the three-legged flow
const requestTokens = [];
const usedNonces = new Map(); // key: `${consumerKey}:${nonce}:${timestamp}`

// RSA key pair for RSA-SHA* signing/verification
const TEST_RSA_PRIVATE_KEY = `-----BEGIN PRIVATE KEY-----
MIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQCf/ioOwb6uGm01
WjL89sBOKmvMuwyGW33w+ud3eV5dWbHZbJTgCHMtjUVqGE4sVPnX8wfKgb00hVGZ
ZhbRsqquUMJL+7RHZA1G3ZcC2WPmrUvIpi13W7F/+wizRjDrutgK0oc4L7zUPhgE
+d+Qe6JHvFL376hqkD9Z6vd9jVNRDv7D2uJcG+Uc7ePM6yLzQeJILnfvSwxna89G
6YxfbYNjf/VKAcRM6UAR8aRGm/A9Qmdwsy08iRzlM0K5lid7Ath7ADJ+D6ezUIhl
qiI6sVrZdpsFXzuvcxjgAts54XoQsLCDZudTmzMs4BftswULCQFdj6c2oye9QKsu
EoZ0CvwNAgMBAAECggEAA1kIJu2QQIhhB0rEjQfaF5309NW9JK/pag91+claW3hd
q6papc1yIN6MjfRwPlE7i8npZygL03uEAkJhRoYHOEU3AOwFZluw7hiuPkBaQiDC
Ld1RpOZlnRidoqgHV1y+LzZ0ieJwgGhu4ZEbnSRZIvMihqRHJo5aJQGGUuQ60r6w
Z5N6j7GGCV14oGck6+0k/NhYrkhpbyl+AHPZeQ20L9ZaSpl+GD3RUgvx4nOhN1Fx
agovDCKwmRPSpuuBw6Wun1hKC9MuuL89CCy2yZ+MrjQmQJ/onKZKR2fc1I5g2JRu
z7xObQq/tAXIHKM27YYY5J3NcGtsy9tLpdtFDle/wQKBgQDfBaBURNs/ccVMMXSZ
T5lOo337Rv3bGFnoLwURUZrjJNGrHqLzeZvTNt0sXQX6Jbdeb5qnC/icng+QDEod
9hRVDz1rN+2YqG6AMvrX5dQSK1PmkwVHLles4sX7DsZaiKNYFFbXc9rt7kXBwDoE
LXYidqUIqZiOjMqCyNlfyHHnRQKBgQC3ppq7TCEWIfqLzsfOoqaKD/fDOrQLLmor
7RvAdGa+EyVeB1G+NQO00KN6U9W+SNPz0cEUYUZQiAaAghUGkNurrS1shr5k7aTX
pXpXtaA+xSEAd6w8lTl9mAfwZMBCcsfjyjPf1RPjZ6Tj2fdHqnsllSU5843LOqZK
CBXiitdKKQKBgQCVNEloN0zLLE1HxUpxiwxQzRZqtrr9ClST/mkQhhzuW+Kd7fgs
la5HZ0we8vkdun/sARRhL6Qa+7ADugUX+Frv8SsxARDG8eBDilfBevQfV7dg6fk8
/ucPNgQoC2Fujj1hnvHeYJcWWTN4BSeLRfLj6aZNnlD/BXgyeTbcWtjBVQKBgBhG
npd5hboePbczWzgWSftgBvk4jkoYFZK+4fc7q8UeVMcsIoMJEPdayPFHma5whAvr
wyEFhrzobiuYhlz60v7LgoChAxPmUe7rgdOMP6Vse2NLbmoHs7TFXu9I8h0WfRPA
S8EfsmRR8/rmeghwIZ0jLOuPJUQi+Y45qWLrxW+ZAoGAMXYhio9y93M0nRqjiiCR
YibnhpZxvrNiLPxNiUi/WxcWEvulpmbKxLUhiWJB1ZmRTiGYlnclQXUuRyaOQNTo
5TVAaNzDXayWVbxhx3Lb8NUV+QNUJEJOgjq4+NYw8fUZCr7T64pGGM4DJHPuHCBo
dJv7UByPuMKBIOYpy3Z+iWs=
-----END PRIVATE KEY-----
`;

const TEST_RSA_PUBLIC_KEY = `-----BEGIN PUBLIC KEY-----
MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAn/4qDsG+rhptNVoy/PbA
TiprzLsMhlt98Prnd3leXVmx2WyU4AhzLY1FahhOLFT51/MHyoG9NIVRmWYW0bKq
rlDCS/u0R2QNRt2XAtlj5q1LyKYtd1uxf/sIs0Yw67rYCtKHOC+81D4YBPnfkHui
R7xS9++oapA/Wer3fY1TUQ7+w9riXBvlHO3jzOsi80HiSC5370sMZ2vPRumMX22D
Y3/1SgHETOlAEfGkRpvwPUJncLMtPIkc5TNCuZYnewLYewAyfg+ns1CIZaoiOrFa
2XabBV87r3MY4ALbOeF6ELCwg2bnU5szLOAX7bMFCwkBXY+nNqMnvUCrLhKGdAr8
DQIDAQAB
-----END PUBLIC KEY-----`;

// ─── RFC 5849 Helpers ───────────────────────────────────────────────────────────

function percentEncode(str) {
  return encodeURIComponent(str)
    .replace(/!/g, '%21')
    .replace(/\*/g, '%2A')
    .replace(/'/g, '%27')
    .replace(/\(/g, '%28')
    .replace(/\)/g, '%29');
}

function percentDecode(str) {
  return decodeURIComponent(str);
}

function generateUniqueString() {
  return crypto.randomBytes(16).toString('hex');
}

// RFC 5849 §3.4.1.2 - Base URL normalization
function getBaseUrl(req) {
  const protocol = req.protocol;
  const host = req.hostname;
  const port = req.socket.localPort;
  const path = req.baseUrl + req.path;

  const includePort = port && !(
    (protocol === 'http' && port === 80)
    || (protocol === 'https' && port === 443)
  );

  return `${protocol}://${host}${includePort ? ':' + port : ''}${path}`;
}

// Parse OAuth Authorization header
function parseOAuthHeader(header) {
  if (!header || !header.startsWith('OAuth ')) return null;

  const params = {};
  const paramStr = header.slice(6); // Remove 'OAuth '

  // Match key="value" pairs, handling commas within values
  const regex = /(\w+)="([^"]*)"/g;
  let match;
  while ((match = regex.exec(paramStr)) !== null) {
    const key = percentDecode(match[1]);
    const value = percentDecode(match[2]);
    if (key !== 'realm') {
      params[key] = value;
    }
  }
  return params;
}

// Collect OAuth params from all sources (header, query, body)
function collectOAuthParams(req) {
  // 1. Try Authorization header first
  const authHeader = req.headers['authorization'];
  const headerParams = parseOAuthHeader(authHeader);

  if (headerParams && headerParams.oauth_consumer_key) {
    return { params: headerParams, source: 'header' };
  }

  // 2. Try query params
  const queryParams = {};
  let foundInQuery = false;
  for (const [key, value] of Object.entries(req.query || {})) {
    if (key.startsWith('oauth_')) {
      queryParams[key] = value;
      foundInQuery = true;
    }
  }
  if (foundInQuery && queryParams.oauth_consumer_key) {
    return { params: queryParams, source: 'queryparams' };
  }

  // 3. Try body params (only for application/x-www-form-urlencoded)
  const contentType = req.headers['content-type'] || '';
  if (contentType.includes('application/x-www-form-urlencoded') && req.body) {
    const bodyParams = {};
    let foundInBody = false;
    for (const [key, value] of Object.entries(req.body)) {
      if (key.startsWith('oauth_')) {
        bodyParams[key] = value;
        foundInBody = true;
      }
    }
    if (foundInBody && bodyParams.oauth_consumer_key) {
      return { params: bodyParams, source: 'body' };
    }
  }

  return { params: null, source: null };
}

// Collect all non-oauth parameters from query and body for signature base string
function collectRequestParams(req, oauthParams, oauthSource) {
  const collected = [];

  // Include oauth params (except oauth_signature)
  for (const [key, value] of Object.entries(oauthParams)) {
    if (key !== 'oauth_signature') {
      collected.push([percentEncode(key), percentEncode(value)]);
    }
  }

  // Include query params (skip oauth_* — already collected from oauthParams above)
  // RFC 5849 §3.5: each protocol parameter MUST use one and only one transmission method
  for (const [key, value] of Object.entries(req.query || {})) {
    if (key.startsWith('oauth_')) continue;
    if (Array.isArray(value)) {
      for (const v of value) {
        collected.push([percentEncode(key), percentEncode(v)]);
      }
    } else {
      collected.push([percentEncode(key), percentEncode(value)]);
    }
  }

  // Include body params for form-urlencoded (skip oauth_* — already collected from oauthParams above)
  const contentType = req.headers['content-type'] || '';
  if (contentType.includes('application/x-www-form-urlencoded') && req.body) {
    for (const [key, value] of Object.entries(req.body)) {
      if (key.startsWith('oauth_')) continue;
      if (Array.isArray(value)) {
        for (const v of value) {
          collected.push([percentEncode(key), percentEncode(v)]);
        }
      } else {
        collected.push([percentEncode(key), percentEncode(value)]);
      }
    }
  }

  // Sort per RFC 5849 §3.4.1.3.2
  collected.sort((a, b) => {
    if (a[0] < b[0]) return -1;
    if (a[0] > b[0]) return 1;
    if (a[1] < b[1]) return -1;
    if (a[1] > b[1]) return 1;
    return 0;
  });

  return collected.map(([k, v]) => `${k}=${v}`).join('&');
}

// Build signature base string (RFC 5849 §3.4.1)
function buildBaseString(method, baseUrl, parameterString) {
  return `${method.toUpperCase()}&${percentEncode(baseUrl)}&${percentEncode(parameterString)}`;
}

// Verify signature
function timingSafeCompare(a, b) {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) return false;
  return crypto.timingSafeEqual(bufA, bufB);
}

function verifySignature(baseString, signature, signatureMethod, consumerSecret, tokenSecret) {
  const signingKey = `${percentEncode(consumerSecret)}&${percentEncode(tokenSecret || '')}`;

  switch (signatureMethod) {
    case 'HMAC-SHA1': {
      const expected = crypto.createHmac('sha1', signingKey).update(baseString).digest('base64');
      return timingSafeCompare(signature, expected);
    }
    case 'HMAC-SHA256': {
      const expected = crypto.createHmac('sha256', signingKey).update(baseString).digest('base64');
      return timingSafeCompare(signature, expected);
    }
    case 'HMAC-SHA512': {
      const expected = crypto.createHmac('sha512', signingKey).update(baseString).digest('base64');
      return timingSafeCompare(signature, expected);
    }
    case 'RSA-SHA1':
    case 'RSA-SHA256':
    case 'RSA-SHA512': {
      const algoMap = { 'RSA-SHA1': 'RSA-SHA1', 'RSA-SHA256': 'RSA-SHA256', 'RSA-SHA512': 'RSA-SHA512' };
      const verifier = crypto.createVerify(algoMap[signatureMethod]);
      verifier.update(baseString);
      return verifier.verify(TEST_RSA_PUBLIC_KEY, signature, 'base64');
    }
    case 'PLAINTEXT': {
      return timingSafeCompare(signature, signingKey);
    }
    default:
      return false;
  }
}

// Check nonce uniqueness (prevents replay attacks)
function checkNonce(consumerKey, nonce, timestamp) {
  const key = `${consumerKey}:${nonce}:${timestamp}`;
  if (usedNonces.has(key)) return false;
  usedNonces.set(key, Date.now());

  // Clean up old nonces (older than 10 minutes)
  const tenMinutesAgo = Date.now() - 10 * 60 * 1000;
  for (const [k, v] of usedNonces.entries()) {
    if (v < tenMinutesAgo) usedNonces.delete(k);
  }

  return true;
}

// ─── OAuth 1.0 Signature Verification Middleware ────────────────────────────────

function verifyOAuth1Signature(getTokenSecret) {
  return (req, res, next) => {
    const { params: oauthParams, source: oauthSource } = collectOAuthParams(req);

    if (!oauthParams) {
      return res.status(401).json({ error: 'Missing OAuth parameters' });
    }

    const {
      oauth_consumer_key,
      oauth_signature,
      oauth_signature_method,
      oauth_nonce,
      oauth_timestamp,
      oauth_version
    } = oauthParams;

    // Validate required params
    if (!oauth_consumer_key || !oauth_signature || !oauth_signature_method) {
      return res.status(401).json({ error: 'Missing required OAuth parameters' });
    }

    // Validate version if present
    if (oauth_version && oauth_version !== '1.0') {
      return res.status(401).json({ error: 'Unsupported OAuth version' });
    }

    // Look up consumer
    const consumer = consumers.find((c) => c.key === oauth_consumer_key);
    if (!consumer) {
      return res.status(401).json({ error: 'Unknown consumer' });
    }

    // Check nonce uniqueness (skip for PLAINTEXT which doesn't use nonce/timestamp)
    if (oauth_signature_method !== 'PLAINTEXT') {
      if (!oauth_nonce || !oauth_timestamp) {
        return res.status(401).json({ error: 'Missing nonce or timestamp' });
      }
      if (!checkNonce(oauth_consumer_key, oauth_nonce, oauth_timestamp)) {
        return res.status(401).json({ error: 'Nonce already used' });
      }
    }

    // Get token secret from callback
    const tokenSecret = getTokenSecret(oauthParams, req);

    // Build base string and verify signature
    const baseUrl = getBaseUrl(req);
    const parameterString = collectRequestParams(req, oauthParams, oauthSource);
    const baseString = buildBaseString(req.method, baseUrl, parameterString);

    const isValid = verifySignature(
      baseString,
      oauth_signature,
      oauth_signature_method,
      consumer.secret,
      tokenSecret
    );

    if (!isValid) {
      return res.status(401).json({
        error: 'Invalid signature',
        debug: {
          baseString,
          baseUrl,
          parameterString,
          method: req.method
        }
      });
    }

    req.oauthConsumer = consumer;
    req.oauthParams = oauthParams;
    next();
  };
}

// ─── Routes ─────────────────────────────────────────────────────────────────────

// 1. Request Token (Temporary Credentials) - RFC 5849 §2.1
router.post('/request_token',
  verifyOAuth1Signature((oauthParams) => {
    // No token secret for request token requests
    return '';
  }),
  (req, res) => {
    const callbackUrl = req.oauthParams.oauth_callback;

    // RFC 5849 §2.1: oauth_callback is REQUIRED
    if (!callbackUrl) {
      return res.status(400).json({ error: 'Missing required oauth_callback parameter' });
    }

    // RFC 5849 §2.1: must be an absolute URI or "oob" (case sensitive)
    if (callbackUrl !== 'oob') {
      try {
        const parsed = new URL(callbackUrl);
        if (!parsed.protocol.startsWith('http')) {
          return res.status(400).json({ error: 'oauth_callback must be an absolute HTTP(S) URI or "oob"' });
        }
      } catch {
        return res.status(400).json({ error: 'oauth_callback must be a valid absolute URI or "oob"' });
      }
    }

    const requestToken = {
      token: 'rt_' + generateUniqueString(),
      secret: 'rts_' + generateUniqueString(),
      consumerKey: req.oauthConsumer.key,
      callbackUrl,
      verifier: null,
      authorized: false
    };

    requestTokens.push(requestToken);

    // Return as form-encoded per spec
    res.type('application/x-www-form-urlencoded');
    res.send(
      `oauth_token=${percentEncode(requestToken.token)}`
      + `&oauth_token_secret=${percentEncode(requestToken.secret)}`
      + `&oauth_callback_confirmed=true`
    );
  }
);

// 2. Resource Owner Authorization - RFC 5849 §2.2
router.get('/authorize', (req, res) => {
  const { oauth_token } = req.query;

  if (!oauth_token) {
    return res.status(400).json({ error: 'Missing oauth_token parameter' });
  }

  const storedToken = requestTokens.find((t) => t.token === oauth_token);
  if (!storedToken) {
    return res.status(400).json({ error: 'Invalid request token' });
  }

  // Auto-authorize and redirect (simplified for testing)
  const verifier = generateUniqueString();
  storedToken.verifier = verifier;
  storedToken.authorized = true;

  if (storedToken.callbackUrl === 'oob') {
    // Out-of-band: display the verifier
    return res.send(`
      <html>
        <body>
          <h1>Authorization Successful</h1>
          <p>Your verification code is: <code>${verifier}</code></p>
        </body>
      </html>
    `);
  }

  // Redirect back to consumer with oauth_token and oauth_verifier
  const callbackUrl = new URL(storedToken.callbackUrl);
  callbackUrl.searchParams.set('oauth_token', storedToken.token);
  callbackUrl.searchParams.set('oauth_verifier', verifier);
  res.redirect(callbackUrl.toString());
});

// 3. Access Token (Token Credentials) - RFC 5849 §2.3
router.post('/access_token',
  verifyOAuth1Signature((oauthParams) => {
    // Token secret is the request token's secret
    const rt = requestTokens.find((t) => t.token === oauthParams.oauth_token);
    return rt ? rt.secret : '';
  }),
  (req, res) => {
    const { oauth_token, oauth_verifier } = req.oauthParams;

    // RFC 5849 §2.3: oauth_token and oauth_verifier are REQUIRED
    if (!oauth_token) {
      return res.status(400).json({ error: 'Missing required oauth_token parameter' });
    }
    if (!oauth_verifier) {
      return res.status(400).json({ error: 'Missing required oauth_verifier parameter' });
    }

    const storedToken = requestTokens.find((t) => t.token === oauth_token);
    if (!storedToken) {
      return res.status(401).json({ error: 'Invalid request token' });
    }

    if (!storedToken.authorized) {
      return res.status(401).json({ error: 'Request token not authorized' });
    }

    if (storedToken.verifier !== oauth_verifier) {
      return res.status(401).json({ error: 'Invalid verifier' });
    }

    // Issue access token
    const accessToken = {
      token: 'at_' + generateUniqueString(),
      secret: 'ats_' + generateUniqueString(),
      consumerKey: req.oauthConsumer.key
    };
    accessTokens.push(accessToken);

    // Invalidate request token
    const idx = requestTokens.indexOf(storedToken);
    if (idx !== -1) requestTokens.splice(idx, 1);

    // Return as form-encoded per spec
    res.type('application/x-www-form-urlencoded');
    res.send(
      `oauth_token=${percentEncode(accessToken.token)}`
      + `&oauth_token_secret=${percentEncode(accessToken.secret)}`
    );
  }
);

// 4. Protected Resource - verifies signed requests with access token
router.get('/resource',
  verifyOAuth1Signature((oauthParams) => {
    const at = accessTokens.find(
      (t) => t.token === oauthParams.oauth_token
    );
    return at ? at.secret : '';
  }),
  (req, res) => {
    res.json({
      resource: {
        name: 'oauth1-test-resource',
        email: 'oauth1@example.com'
      }
    });
  }
);

router.post('/resource',
  verifyOAuth1Signature((oauthParams) => {
    const at = accessTokens.find(
      (t) => t.token === oauthParams.oauth_token
    );
    return at ? at.secret : '';
  }),
  (req, res) => {
    res.json({
      resource: {
        name: 'oauth1-test-resource',
        email: 'oauth1@example.com'
      }
    });
  }
);

// 5. Callback (Consumer-side) - RFC 5849 §2.2
// Receives the redirect from /authorize with oauth_token and oauth_verifier.
// The consumer then exchanges these for token credentials via /access_token.
router.get('/callback', (req, res) => {
  const { oauth_token, oauth_verifier } = req.query;

  if (!oauth_token || !oauth_verifier) {
    return res.status(400).json({ error: 'Missing oauth_token or oauth_verifier' });
  }

  // Verify the request token exists and is authorized
  const storedToken = requestTokens.find((t) => t.token === oauth_token);
  if (!storedToken) {
    return res.status(400).json({ error: 'Unknown request token' });
  }

  if (!storedToken.authorized) {
    return res.status(400).json({ error: 'Request token not yet authorized' });
  }

  if (storedToken.verifier !== oauth_verifier) {
    return res.status(400).json({ error: 'Invalid verifier' });
  }

  res.json({
    oauth_token,
    oauth_verifier,
    message: 'Callback received. Exchange these for token credentials via POST /access_token.'
  });
});

module.exports = router;
module.exports.TEST_RSA_PRIVATE_KEY = TEST_RSA_PRIVATE_KEY;
