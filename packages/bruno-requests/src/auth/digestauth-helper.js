const crypto = require('crypto');
const { URL } = require('node:url');

function isStrPresent(str) {
  return str && str.trim() !== '' && str.trim() !== 'undefined';
}

// Matches an auth-scheme name or an auth-param (RFC 7235): name=token or
// name="quoted-string". Names use the full token character set (RFC 7230), so an
// extension such as x+flag=yes is not mistaken for a new scheme. Quoted values may
// contain commas (e.g. realm="Example, Inc." or qop="auth,auth-int") and
// backslash-escaped quotes, so the header can't simply be split on ','. The
// lookbehind keeps matching linear on long unbroken tokens.
const AUTH_CHALLENGE_TOKEN_REGEX = /(?<![\w!#$%&'*+.^`|~-])([\w!#$%&'*+.^`|~-]+)(?:\s*=\s*(?:"((?:[^"\\]|\\.)*)"|([^\s,]*)))?/g;

// A quoted-string's value is its text with each quoted-pair (\x) read as x.
function unquote(quotedValue) {
  return quotedValue.replace(/\\(.)/g, '$1');
}

function quote(value) {
  return `"${String(value).replace(/[\\"]/g, '\\$&')}"`;
}

// Reads the params of the first challenge only. Repeated WWW-Authenticate headers
// are joined with ', ', so a following challenge (e.g. `, Basic realm="..."`)
// must not override them.
function parseDigestChallenge(header) {
  const params = {};
  for (const [, key, quotedValue, tokenValue] of header.matchAll(AUTH_CHALLENGE_TOKEN_REGEX)) {
    const isSchemeName = quotedValue === undefined && tokenValue === undefined;
    if (isSchemeName) {
      if (Object.keys(params).length > 0) {
        break;
      }
      continue;
    }
    params[key.toLowerCase()] = quotedValue === undefined ? tokenValue : unquote(quotedValue);
  }
  return params;
}

function containsDigestHeader(response) {
  const authHeader = response?.headers?.['www-authenticate'];
  return authHeader ? authHeader.trim().toLowerCase().startsWith('digest') : false;
}

function containsAuthorizationHeader(originalRequest) {
  return Boolean(
    originalRequest.headers['Authorization']
    || originalRequest.headers['authorization']
  );
}

function md5(input) {
  return crypto.createHash('md5').update(input).digest('hex');
}

export function addDigestInterceptor(axiosInstance, request) {
  const { username, password } = request.digestConfig;
  console.debug('Digest Auth Interceptor Initialized');

  if (!isStrPresent(username) || !isStrPresent(password)) {
    console.warn('Required Digest Auth fields (username/password) are not present');
    return;
  }

  axiosInstance.interceptors.response.use(
    (response) => response,
    (error) => {
      const originalRequest = error.config;

      // Prevent retry loops
      if (originalRequest._retry) {
        return Promise.reject(error);
      }
      originalRequest._retry = true;

      if (
        error.response?.status === 401
        && containsDigestHeader(error.response)
        && !containsAuthorizationHeader(originalRequest)
      ) {
        console.debug('Processing Digest Authentication Challenge');
        console.debug(error.response.headers['www-authenticate']);

        const authDetails = parseDigestChallenge(error.response.headers['www-authenticate']);

        // Validate required auth details
        if (!authDetails.realm || !authDetails.nonce) {
          console.warn('Missing required auth details (realm or nonce)');
          return Promise.reject(error);
        }

        console.debug('Auth Details: \n', authDetails);

        const nonceCount = '00000001';
        const cnonce = crypto.randomBytes(24).toString('hex');

        if (authDetails.algorithm && authDetails.algorithm.toUpperCase() !== 'MD5') {
          console.warn(`Unsupported Digest algorithm: ${authDetails.algorithm}`);
          return Promise.reject(error);
        } else {
          authDetails.algorithm = 'MD5';
        }

        // Build full URL from the original request (may include query params and baseURL)
        const resolvedUrl = new URL(
          originalRequest.url || request.url,
          originalRequest.baseURL || request.baseURL || 'http://localhost'
        );
        const uri = `${resolvedUrl.pathname}${resolvedUrl.search}`;
        // Used 'GET' as default method to avoid missing method error
        const method = (originalRequest.method || request.method || 'GET').toUpperCase();
        const HA1 = md5(`${username}:${authDetails.realm}:${password}`);
        const HA2 = md5(`${method}:${uri}`);
        let response;
        if (authDetails.qop && authDetails.qop.split(',').map((q) => q.trim().toLowerCase()).includes('auth')) {
          console.debug('Using QOP \'auth\' for Digest Authentication');
          response = md5(`${HA1}:${authDetails.nonce}:${nonceCount}:${cnonce}:auth:${HA2}`);
        } else {
          console.debug('No QOP specified, using simple digest');
          response = md5(`${HA1}:${authDetails.nonce}:${HA2}`);
        }

        const headerFields = [
          `username=${quote(username)}`,
          `realm=${quote(authDetails.realm)}`,
          `nonce=${quote(authDetails.nonce)}`,
          `uri=${quote(uri)}`,
          `response="${response}"`
        ];

        if (authDetails.qop && authDetails.qop.split(',').map((q) => q.trim().toLowerCase()).includes('auth')) {
          headerFields.push(`qop="auth"`, `algorithm="${authDetails.algorithm}"`, `nc="${nonceCount}"`, `cnonce="${cnonce}"`);
        }

        if (authDetails.opaque) {
          headerFields.push(`opaque=${quote(authDetails.opaque)}`);
        }

        const authorizationHeader = `Digest ${headerFields.join(', ')}`;

        // Ensure headers are initialized
        originalRequest.headers = originalRequest.headers || {};
        originalRequest.headers['Authorization'] = authorizationHeader;

        console.debug(`Authorization: ${originalRequest.headers['Authorization']}`);

        delete originalRequest.digestConfig;

        return axiosInstance(originalRequest);
      }

      return Promise.reject(error);
    }
  );
}
