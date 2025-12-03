const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const { validateSignature, generateNonce } = require('./utils');

/**
 * 3-Legged OAuth 1.0 (Full Authorization Flow)
 * Request Token -> User Authorization -> Access Token -> Resource Access
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

// In-memory token storage
const requestTokens = new Map(); // Map<token, { secret, callback_confirmed, authorized, verifier }>
const accessTokens = new Map(); // Map<token, { secret, user_id }>

/**
 * Step 1: POST /api/auth/oauth1/three_legged/request_token
 * Client requests a request token
 * OAuth signature required with consumer credentials
 */
router.post('/request_token', (req, res) => {
  console.log('3-Legged OAuth 1.0: Request Token');
  console.log('Headers:', req.headers);
  console.log('Body:', req.body);

  // Validate signature
  const validation = validateSignature(req, {
    consumerSecret: CONSUMER_SECRET,
    tokenSecret: '', // No token secret yet
    rsaPublicKey: RSA_PUBLIC_KEY,
    checkTimestamp: true
  });

  if (!validation.valid) {
    console.log('Signature validation failed:', validation.error);
    return res.status(401).send(`oauth_problem=signature_invalid&oauth_problem_advice=${encodeURIComponent(validation.error)}`);
  }

  // Validate consumer key
  if (validation.oauthParams.oauth_consumer_key !== CONSUMER_KEY) {
    return res.status(401).send('oauth_problem=consumer_key_unknown');
  }

  // Get callback URL
  const callbackUrl = validation.oauthParams.oauth_callback || 'oob'; // 'oob' = out-of-band

  // Generate request token and secret
  const requestToken = `request_token_${generateNonce()}`;
  const requestTokenSecret = `request_secret_${generateNonce()}`;

  // Store request token
  requestTokens.set(requestToken, {
    secret: requestTokenSecret,
    callback_confirmed: callbackUrl !== 'oob',
    callback_url: callbackUrl,
    authorized: false,
    verifier: null,
    consumer_key: CONSUMER_KEY
  });

  console.log('Request token issued:', requestToken);

  // Return request token
  const response = [
    `oauth_token=${encodeURIComponent(requestToken)}`,
    `oauth_token_secret=${encodeURIComponent(requestTokenSecret)}`,
    `oauth_callback_confirmed=${callbackUrl !== 'oob'}`
  ].join('&');

  res.set('Content-Type', 'application/x-www-form-urlencoded');
  res.send(response);
});

/**
 * Step 2: GET /api/auth/oauth1/three_legged/authorize
 * User authorizes the request token
 * Returns HTML page with authorize button or auto-approves
 */
router.get('/authorize', (req, res) => {
  const { oauth_token, auto_approve } = req.query;

  console.log('3-Legged OAuth 1.0: Authorize');
  console.log('Token:', oauth_token);
  console.log('Auto approve:', auto_approve);

  if (!oauth_token) {
    return res.status(400).send('Missing oauth_token parameter');
  }

  const tokenData = requestTokens.get(oauth_token);
  if (!tokenData) {
    return res.status(404).send('Invalid request token');
  }

  if (tokenData.authorized) {
    return res.status(400).send('Token already authorized');
  }

  // Auto-approve for automated testing
  if (auto_approve === 'true') {
    const verifier = `verifier_${generateNonce()}`;
    tokenData.authorized = true;
    tokenData.verifier = verifier;
    requestTokens.set(oauth_token, tokenData);

    console.log('Token auto-approved with verifier:', verifier);

    // Redirect to callback with token and verifier
    if (tokenData.callback_url && tokenData.callback_url !== 'oob') {
      const separator = tokenData.callback_url.includes('?') ? '&' : '?';
      const redirectUrl = `${tokenData.callback_url}${separator}oauth_token=${encodeURIComponent(oauth_token)}&oauth_verifier=${encodeURIComponent(verifier)}`;
      return res.redirect(redirectUrl);
    }

    // If no callback, show verifier
    return res.send(`
      <html>
        <body>
          <h1>Authorization Successful</h1>
          <p>Token: ${oauth_token}</p>
          <p>Verifier: ${verifier}</p>
          <p>Use this verifier to exchange for an access token.</p>
        </body>
      </html>
    `);
  }

  // Show authorization page
  res.send(`
    <html>
      <head>
        <title>Authorize Application</title>
        <style>
          body { font-family: Arial, sans-serif; max-width: 600px; margin: 50px auto; padding: 20px; }
          button { background-color: #4CAF50; color: white; padding: 15px 32px; font-size: 16px; border: none; cursor: pointer; border-radius: 4px; }
          button:hover { background-color: #45a049; }
        </style>
      </head>
      <body>
        <h1>Authorize Application</h1>
        <p>An application is requesting access to your account.</p>
        <p><strong>Token:</strong> ${oauth_token}</p>
        <form action="/api/auth/oauth1/three_legged/approve" method="post">
          <input type="hidden" name="oauth_token" value="${oauth_token}"/>
          <button type="submit">Authorize</button>
        </form>
      </body>
    </html>
  `);
});

/**
 * Step 2b: POST /api/auth/oauth1/three_legged/approve
 * User approves the authorization (from the form submission)
 */
router.post('/approve', express.urlencoded({ extended: true }), (req, res) => {
  const { oauth_token } = req.body;

  console.log('3-Legged OAuth 1.0: Approve');
  console.log('Token:', oauth_token);

  if (!oauth_token) {
    return res.status(400).send('Missing oauth_token parameter');
  }

  const tokenData = requestTokens.get(oauth_token);
  if (!tokenData) {
    return res.status(404).send('Invalid request token');
  }

  if (tokenData.authorized) {
    return res.status(400).send('Token already authorized');
  }

  // Generate verifier
  const verifier = `verifier_${generateNonce()}`;
  tokenData.authorized = true;
  tokenData.verifier = verifier;
  requestTokens.set(oauth_token, tokenData);

  console.log('Token approved with verifier:', verifier);

  // Redirect to callback with token and verifier
  if (tokenData.callback_url && tokenData.callback_url !== 'oob') {
    const separator = tokenData.callback_url.includes('?') ? '&' : '?';
    const redirectUrl = `${tokenData.callback_url}${separator}oauth_token=${encodeURIComponent(oauth_token)}&oauth_verifier=${encodeURIComponent(verifier)}`;
    return res.redirect(redirectUrl);
  }

  // If no callback, show verifier
  res.send(`
    <html>
      <body>
        <h1>Authorization Successful</h1>
        <p>Token: ${oauth_token}</p>
        <p>Verifier: ${verifier}</p>
        <p>Use this verifier to exchange for an access token.</p>
      </body>
    </html>
  `);
});

/**
 * Step 3: POST /api/auth/oauth1/three_legged/access_token
 * Exchange authorized request token for access token
 * OAuth signature required with consumer credentials + request token
 */
router.post('/access_token', (req, res) => {
  console.log('3-Legged OAuth 1.0: Access Token');
  console.log('Headers:', req.headers);
  console.log('Body:', req.body);

  // Extract OAuth parameters first to get the request token
  const { extractOAuthParams } = require('./utils');
  const oauthParams = extractOAuthParams(req);

  const requestToken = oauthParams.oauth_token;
  const verifier = oauthParams.oauth_verifier;

  if (!requestToken) {
    return res.status(400).send('oauth_problem=parameter_absent&oauth_parameters_absent=oauth_token');
  }

  if (!verifier) {
    return res.status(400).send('oauth_problem=parameter_absent&oauth_parameters_absent=oauth_verifier');
  }

  // Get request token data
  const tokenData = requestTokens.get(requestToken);
  if (!tokenData) {
    return res.status(401).send('oauth_problem=token_rejected&oauth_problem_advice=Invalid+request+token');
  }

  if (!tokenData.authorized) {
    return res.status(401).send('oauth_problem=permission_denied&oauth_problem_advice=Token+not+authorized');
  }

  if (tokenData.verifier !== verifier) {
    return res.status(401).send('oauth_problem=verifier_invalid');
  }

  // Validate signature with request token secret
  const validation = validateSignature(req, {
    consumerSecret: CONSUMER_SECRET,
    tokenSecret: tokenData.secret, // Use request token secret
    rsaPublicKey: RSA_PUBLIC_KEY,
    checkTimestamp: true
  });

  if (!validation.valid) {
    console.log('Signature validation failed:', validation.error);
    return res.status(401).send(`oauth_problem=signature_invalid&oauth_problem_advice=${encodeURIComponent(validation.error)}`);
  }

  // Validate consumer key
  if (validation.oauthParams.oauth_consumer_key !== CONSUMER_KEY) {
    return res.status(401).send('oauth_problem=consumer_key_unknown');
  }

  // Generate access token and secret
  const accessToken = `access_token_${generateNonce()}`;
  const accessTokenSecret = `access_secret_${generateNonce()}`;

  // Store access token
  accessTokens.set(accessToken, {
    secret: accessTokenSecret,
    consumer_key: CONSUMER_KEY,
    user_id: 'test_user'
  });

  // Clean up request token
  requestTokens.delete(requestToken);

  console.log('Access token issued:', accessToken);

  // Return access token
  const response = [
    `oauth_token=${encodeURIComponent(accessToken)}`,
    `oauth_token_secret=${encodeURIComponent(accessTokenSecret)}`
  ].join('&');

  res.set('Content-Type', 'application/x-www-form-urlencoded');
  res.send(response);
});

/**
 * Step 4: POST /api/auth/oauth1/three_legged/resource
 * Access protected resource with access token
 * OAuth signature required with consumer credentials + access token
 */
router.post('/resource', (req, res) => {
  console.log('3-Legged OAuth 1.0: Resource Access');
  console.log('Headers:', req.headers);
  console.log('Body:', req.body);

  // Extract OAuth parameters to get the access token
  const { extractOAuthParams } = require('./utils');
  const oauthParams = extractOAuthParams(req);

  const accessToken = oauthParams.oauth_token;

  if (!accessToken) {
    return res.status(401).json({
      error: 'Missing access token'
    });
  }

  // Get access token data
  const tokenData = accessTokens.get(accessToken);
  if (!tokenData) {
    return res.status(401).json({
      error: 'Invalid access token'
    });
  }

  // Validate signature with access token secret
  const validation = validateSignature(req, {
    consumerSecret: CONSUMER_SECRET,
    tokenSecret: tokenData.secret, // Use access token secret
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

  console.log('3-Legged OAuth 1.0 resource access successful');

  // Return protected resource
  return res.json({
    message: 'OAuth 1.0 3-legged authorization successful',
    resource: {
      user_id: tokenData.user_id,
      email: 'test@example.com',
      data: 'This is protected data',
      access_token: accessToken
    }
  });
});

/**
 * GET /api/auth/oauth1/three_legged/resource
 * Same as POST but for GET requests
 */
router.get('/resource', (req, res) => {
  console.log('3-Legged OAuth 1.0: GET Resource Access');

  // Extract OAuth parameters to get the access token
  const { extractOAuthParams } = require('./utils');
  const oauthParams = extractOAuthParams(req);

  const accessToken = oauthParams.oauth_token;

  if (!accessToken) {
    return res.status(401).json({
      error: 'Missing access token'
    });
  }

  // Get access token data
  const tokenData = accessTokens.get(accessToken);
  if (!tokenData) {
    return res.status(401).json({
      error: 'Invalid access token'
    });
  }

  // Validate signature with access token secret
  const validation = validateSignature(req, {
    consumerSecret: CONSUMER_SECRET,
    tokenSecret: tokenData.secret,
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

  console.log('3-Legged OAuth 1.0 GET resource access successful');

  // Return protected resource
  return res.json({
    message: 'OAuth 1.0 3-legged GET authorization successful',
    resource: {
      user_id: tokenData.user_id,
      email: 'test@example.com',
      data: 'This is protected GET data'
    }
  });
});

module.exports = router;
