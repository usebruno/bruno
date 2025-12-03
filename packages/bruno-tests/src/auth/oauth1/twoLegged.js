const express = require('express');
const router = express.Router();
const { validateSignature } = require('./utils');

/**
 * 2-Legged OAuth 1.0 (Consumer Credentials Only)
 * No request/access tokens needed - just consumer key/secret
 */

// Test credentials
const CONSUMER_KEY = 'oauth1_consumer_key';
const CONSUMER_SECRET = 'oauth1_consumer_secret';

// RSA public key for RSA signature verification
// This corresponds to the private key in private_key.pem
const RSA_PUBLIC_KEY = `-----BEGIN PUBLIC KEY-----
MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEA0OybIh+f8cCceguzB2jz
n63IfCbv90QxbM3dZETtsUqHmdW4ATLTzl3VOW/zzuUnT5oGbllJFOE+O3tUfrix
Z7AK8DkwwF+hK5LsBhVF49J4yc+qaD3fHKe+d294MdWZkLRM1t/O9q1qaNXG8zYw
deRwR7UJz6UDgAqeQFx7qWWgM2ztaASrspIf0+IMuYGU+Ad8L+xdh5kJ9yqWT6JI
QMopMcS1wT8BrSOHP4VvnSAS5/wXizkDuHFPsGYz1en3dUS6z/iPCRE8mt+b7QSd
acl8wwmGpym+fteImKNBmuxMV9ehnlQn4FysQZMcmbZZ87Y9MtzUFlT6wCLENhwT
gQIDAQAB
-----END PUBLIC KEY-----`;

/**
 * POST /api/auth/oauth1/two_legged/resource
 * Protected resource that requires OAuth 1.0 signature
 * Supports all signature methods and parameter transmission modes
 */
router.post('/resource', (req, res) => {
  console.log('2-Legged OAuth 1.0 request received');
  console.log('Method:', req.method);
  console.log('URL:', req.originalUrl);
  console.log('Headers:', req.headers);
  console.log('Body:', req.body);

  // Validate signature
  const validation = validateSignature(req, {
    consumerSecret: CONSUMER_SECRET,
    tokenSecret: '', // No token secret in 2-legged OAuth
    rsaPublicKey: RSA_PUBLIC_KEY,
    checkTimestamp: true
  });

  if (!validation.valid) {
    console.log('Signature validation failed:', validation.error);
    if (validation.debug) {
      console.log('Debug info:', validation.debug);
    }
    return res.status(401).json({
      error: 'Invalid OAuth signature',
      details: validation.error
    });
  }

  // Validate consumer key
  if (validation.oauthParams.oauth_consumer_key !== CONSUMER_KEY) {
    return res.status(401).json({
      error: 'Invalid consumer key'
    });
  }

  console.log('2-Legged OAuth 1.0 validation successful');

  // Return protected resource
  return res.json({
    message: 'OAuth 1.0 2-legged authorization successful',
    resource: {
      user: 'test_user',
      email: 'test@example.com',
      data: 'This is protected data'
    },
    oauth_params: {
      consumer_key: validation.oauthParams.oauth_consumer_key,
      signature_method: validation.oauthParams.oauth_signature_method,
      timestamp: validation.oauthParams.oauth_timestamp,
      nonce: validation.oauthParams.oauth_nonce
    }
  });
});

/**
 * GET /api/auth/oauth1/two_legged/resource
 * Same as POST but for GET requests
 */
router.get('/resource', (req, res) => {
  console.log('2-Legged OAuth 1.0 GET request received');

  // Validate signature
  const validation = validateSignature(req, {
    consumerSecret: CONSUMER_SECRET,
    tokenSecret: '',
    rsaPublicKey: RSA_PUBLIC_KEY,
    checkTimestamp: true
  });

  if (!validation.valid) {
    console.log('Signature validation failed:', validation.error);
    return res.status(401).json({
      error: 'Invalid OAuth signature',
      details: validation.error
    });
  }

  // Validate consumer key
  if (validation.oauthParams.oauth_consumer_key !== CONSUMER_KEY) {
    return res.status(401).json({
      error: 'Invalid consumer key'
    });
  }

  console.log('2-Legged OAuth 1.0 GET validation successful');

  // Return protected resource
  return res.json({
    message: 'OAuth 1.0 2-legged GET authorization successful',
    resource: {
      user: 'test_user',
      email: 'test@example.com',
      data: 'This is protected GET data'
    }
  });
});

module.exports = router;
