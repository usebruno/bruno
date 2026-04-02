const crypto = require('crypto');
const { URL } = require('node:url');

function isStrPresent(str) {
  return str && str.trim() !== '' && str.trim() !== 'undefined';
}

function stripQuotes(str) {
  return str.replace(/"/g, '');
}

function splitAuthHeaderKeyValue(str) {
  const indexOfEqual = str.indexOf('=');
  const key = str.substring(0, indexOfEqual).trim();
  const value = str.substring(indexOfEqual + 1);
  return [key, value];
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
  let { username, password } = request.digestConfig;

  // If credentials are embedded in the URL (https://user:pass@host/path), extract them
  // as a fallback. We do NOT strip the URL here — axios needs the credentials intact to
  // send Authorization: Basic for servers that accept Basic auth. The URL is stripped
  // inside the error handler only when a Digest challenge is confirmed, at which point
  // the Basic header is also removed so the retry uses Digest instead.
  let urlHasCredentials = false;
  try {
    const parsedUrl = new URL(request.url);
    if (parsedUrl.username || parsedUrl.password) {
      urlHasCredentials = true;
      if (!isStrPresent(username)) username = decodeURIComponent(parsedUrl.username);
      if (!isStrPresent(password)) password = decodeURIComponent(parsedUrl.password);
    }
  } catch (e) {
    // Unparseable URL — continue with existing credentials
  }

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

      if (error.response?.status === 401 && containsDigestHeader(error.response)) {
        // When URL-embedded credentials were present, axios auto-added Authorization: Basic
        // on the first request. Now that we know the server wants Digest, remove that header
        // and strip the credentials from the URL so the retry doesn't re-add Basic auth.
        if (urlHasCredentials) {
          delete originalRequest.headers['Authorization'];
          delete originalRequest.headers['authorization'];
          try {
            const parsedUrl = new URL(originalRequest.url || request.url);
            parsedUrl.username = '';
            parsedUrl.password = '';
            originalRequest.url = parsedUrl.toString();
          } catch (e) {}
        }

        if (containsAuthorizationHeader(originalRequest)) {
          return Promise.reject(error);
        }
        console.debug('Processing Digest Authentication Challenge');
        console.debug(error.response.headers['www-authenticate']);

        const authDetails = error.response.headers['www-authenticate']
          .split(',')
          .map((pair) => splitAuthHeaderKeyValue(pair).map((item) => item.trim()).map(stripQuotes))
          .reduce((acc, [key, value]) => {
            const normalizedKey = key.toLowerCase().replace('digest ', '');
            if (normalizedKey && value !== undefined) {
              acc[normalizedKey] = value;
            }
            return acc;
          }, {});

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
          `username="${username}"`,
          `realm="${authDetails.realm}"`,
          `nonce="${authDetails.nonce}"`,
          `uri="${uri}"`,
          `response="${response}"`
        ];

        if (authDetails.qop && authDetails.qop.split(',').map((q) => q.trim().toLowerCase()).includes('auth')) {
          headerFields.push(`qop="auth"`, `algorithm="${authDetails.algorithm}"`, `nc="${nonceCount}"`, `cnonce="${cnonce}"`);
        }

        if (authDetails.opaque) {
          headerFields.push(`opaque="${authDetails.opaque}"`);
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
