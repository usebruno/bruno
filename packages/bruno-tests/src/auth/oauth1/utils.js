const crypto = require('crypto');

/**
 * OAuth 1.0 Signature Validation Utilities
 * Based on RFC 5849: https://tools.ietf.org/html/rfc5849
 */

/**
 * Extract OAuth parameters from request
 * @param {Object} req - Express request object
 * @returns {Object} OAuth parameters
 */
function extractOAuthParams(req) {
  let oauthParams = {};

  // Check Authorization header
  const authHeader = req.headers['authorization'];
  if (authHeader && authHeader.startsWith('OAuth ')) {
    const params = authHeader.substring(6).split(',');
    params.forEach((param) => {
      const [key, value] = param.trim().split('=');
      oauthParams[key] = decodeURIComponent(value.replace(/"/g, ''));
    });
  }

  // Check query parameters
  Object.keys(req.query).forEach((key) => {
    if (key.startsWith('oauth_')) {
      oauthParams[key] = req.query[key];
    }
  });

  // Check body parameters (for POST with form-urlencoded)
  if (req.body && typeof req.body === 'object') {
    Object.keys(req.body).forEach((key) => {
      if (key.startsWith('oauth_')) {
        oauthParams[key] = req.body[key];
      }
    });
  }

  return oauthParams;
}

/**
 * Percent encode a string according to RFC 3986
 * @param {string} str - String to encode
 * @returns {string} Encoded string
 */
function percentEncode(str) {
  return encodeURIComponent(str)
    .replace(/!/g, '%21')
    .replace(/'/g, '%27')
    .replace(/\(/g, '%28')
    .replace(/\)/g, '%29')
    .replace(/\*/g, '%2A');
}

/**
 * Build signature base string
 * @param {string} method - HTTP method
 * @param {string} url - Request URL
 * @param {Object} params - All parameters (OAuth + request)
 * @returns {string} Signature base string
 */
function buildSignatureBaseString(method, url, params) {
  // 1. HTTP method in uppercase
  const httpMethod = method.toUpperCase();

  // 2. Base URL (without query parameters)
  const baseUrl = url.split('?')[0];

  // 3. Collect and sort all parameters
  const sortedParams = Object.keys(params)
    .filter((key) => key !== 'oauth_signature') // Exclude signature itself
    .sort()
    .map((key) => `${percentEncode(key)}=${percentEncode(params[key])}`)
    .join('&');

  // 4. Build base string
  return `${httpMethod}&${percentEncode(baseUrl)}&${percentEncode(sortedParams)}`;
}

/**
 * Generate HMAC signature
 * @param {string} baseString - Signature base string
 * @param {string} consumerSecret - Consumer secret
 * @param {string} tokenSecret - Token secret (empty for 2-legged)
 * @param {string} algorithm - HMAC algorithm (sha1, sha256, sha512)
 * @returns {string} Base64-encoded signature
 */
function generateHmacSignature(baseString, consumerSecret, tokenSecret = '', algorithm = 'sha1') {
  const key = `${percentEncode(consumerSecret)}&${percentEncode(tokenSecret)}`;
  const hmac = crypto.createHmac(algorithm, key);
  hmac.update(baseString);
  return hmac.digest('base64');
}

/**
 * Generate RSA signature
 * @param {string} baseString - Signature base string
 * @param {string} privateKey - RSA private key in PEM format
 * @param {string} algorithm - RSA algorithm (sha1, sha256)
 * @returns {string} Base64-encoded signature
 */
function generateRsaSignature(baseString, privateKey, algorithm = 'sha256') {
  const hashAlgorithm = algorithm === 'sha1' ? 'RSA-SHA1' : 'RSA-SHA256';
  const sign = crypto.createSign(hashAlgorithm);
  sign.update(baseString);
  return sign.sign(privateKey, 'base64');
}

/**
 * Generate PLAINTEXT signature
 * @param {string} consumerSecret - Consumer secret
 * @param {string} tokenSecret - Token secret (empty for 2-legged)
 * @returns {string} PLAINTEXT signature
 */
function generatePlaintextSignature(consumerSecret, tokenSecret = '') {
  return `${percentEncode(consumerSecret)}&${percentEncode(tokenSecret)}`;
}

/**
 * Validate OAuth 1.0 signature
 * @param {Object} req - Express request object
 * @param {Object} options - Validation options
 * @returns {Object} Validation result { valid: boolean, error: string, oauthParams: Object }
 */
function validateSignature(req, options = {}) {
  const {
    consumerSecret,
    tokenSecret = '',
    rsaPublicKey = null,
    checkTimestamp = true,
    timestampWindow = 300 // 5 minutes
  } = options;

  try {
    // Extract OAuth parameters
    const oauthParams = extractOAuthParams(req);

    // Validate required parameters
    if (!oauthParams.oauth_consumer_key) {
      return { valid: false, error: 'Missing oauth_consumer_key', oauthParams };
    }
    if (!oauthParams.oauth_signature_method) {
      return { valid: false, error: 'Missing oauth_signature_method', oauthParams };
    }
    if (!oauthParams.oauth_signature) {
      return { valid: false, error: 'Missing oauth_signature', oauthParams };
    }
    if (!oauthParams.oauth_timestamp) {
      return { valid: false, error: 'Missing oauth_timestamp', oauthParams };
    }
    if (!oauthParams.oauth_nonce) {
      return { valid: false, error: 'Missing oauth_nonce', oauthParams };
    }

    // Validate timestamp
    if (checkTimestamp) {
      const timestamp = parseInt(oauthParams.oauth_timestamp);
      const now = Math.floor(Date.now() / 1000);
      if (Math.abs(now - timestamp) > timestampWindow) {
        return { valid: false, error: 'Timestamp out of acceptable range', oauthParams };
      }
    }

    // Get full URL
    const protocol = req.protocol;
    const host = req.get('host');
    const path = req.originalUrl || req.url;
    const fullUrl = `${protocol}://${host}${path}`;

    // Collect all parameters (OAuth + query + body)
    const allParams = {
      ...oauthParams,
      ...req.query,
      ...(req.body && typeof req.body === 'object' && req.headers['content-type']?.includes('application/x-www-form-urlencoded') ? req.body : {})
    };

    // Remove oauth_signature from parameters for base string
    delete allParams.oauth_signature;

    // Build signature base string
    const baseString = buildSignatureBaseString(req.method, fullUrl, allParams);

    // Generate expected signature based on method
    let expectedSignature;
    const signatureMethod = oauthParams.oauth_signature_method;

    switch (signatureMethod) {
      case 'HMAC-SHA1':
        expectedSignature = generateHmacSignature(baseString, consumerSecret, tokenSecret, 'sha1');
        break;
      case 'HMAC-SHA256':
        expectedSignature = generateHmacSignature(baseString, consumerSecret, tokenSecret, 'sha256');
        break;
      case 'HMAC-SHA512':
        expectedSignature = generateHmacSignature(baseString, consumerSecret, tokenSecret, 'sha512');
        break;
      case 'RSA-SHA1':
      case 'RSA-SHA256':
        if (!rsaPublicKey) {
          return { valid: false, error: 'RSA public key required for RSA signature validation', oauthParams };
        }
        // For RSA, we need to verify the signature
        const hashAlgorithm = signatureMethod === 'RSA-SHA1' ? 'RSA-SHA1' : 'RSA-SHA256';
        const verify = crypto.createVerify(hashAlgorithm);
        verify.update(baseString);
        const isValid = verify.verify(rsaPublicKey, oauthParams.oauth_signature, 'base64');
        return { valid: isValid, error: isValid ? null : 'Invalid signature', oauthParams };
      case 'PLAINTEXT':
        expectedSignature = generatePlaintextSignature(consumerSecret, tokenSecret);
        break;
      default:
        return { valid: false, error: `Unsupported signature method: ${signatureMethod}`, oauthParams };
    }

    // Compare signatures
    const receivedSignature = oauthParams.oauth_signature;
    const valid = expectedSignature === receivedSignature;

    return {
      valid,
      error: valid ? null : 'Invalid signature',
      oauthParams,
      debug: {
        baseString,
        expectedSignature,
        receivedSignature
      }
    };
  } catch (err) {
    return {
      valid: false,
      error: `Signature validation error: ${err.message}`,
      oauthParams: {}
    };
  }
}

/**
 * Generate a random nonce
 * @returns {string} Random nonce
 */
function generateNonce() {
  return crypto.randomBytes(16).toString('hex');
}

/**
 * Generate current timestamp
 * @returns {string} Current Unix timestamp
 */
function generateTimestamp() {
  return Math.floor(Date.now() / 1000).toString();
}

module.exports = {
  extractOAuthParams,
  percentEncode,
  buildSignatureBaseString,
  generateHmacSignature,
  generateRsaSignature,
  generatePlaintextSignature,
  validateSignature,
  generateNonce,
  generateTimestamp
};
