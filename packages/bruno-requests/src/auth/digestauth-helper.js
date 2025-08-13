const crypto = require('crypto');
const { URL } = require('url');

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
    originalRequest.headers['Authorization'] ||
    originalRequest.headers['authorization']
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
        error.response?.status === 401 &&
        containsDigestHeader(error.response) &&
        !containsAuthorizationHeader(originalRequest)
      ) {
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

        console.debug("Auth Details: \n", authDetails);

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
        const response = md5(
          `${HA1}:${authDetails.nonce}:${nonceCount}:${cnonce}:auth:${HA2}`
        );

        const headerFields = [
          `username="${username}"`,
          `realm="${authDetails.realm}"`,
          `nonce="${authDetails.nonce}"`,
          `uri="${uri}"`,
          `qop="auth"`,
          `algorithm="${authDetails.algorithm}"`,
          `response="${response}"`,
          `nc="${nonceCount}"`,
          `cnonce="${cnonce}"`,
        ];

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
