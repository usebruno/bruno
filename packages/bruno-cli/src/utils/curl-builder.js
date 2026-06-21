/**
 * Converts a prepared + interpolated axios request config into a curl command string.
 *
 * @param {object} request - The axios request config (after prepareRequest + interpolateVars)
 * @param {object} options
 * @param {object} [options.filePaths] - Original file paths captured before prepareRequest read them
 * @param {string} [options.filePaths.body] - File path for body mode 'file'
 * @param {Array}  [options.filePaths.multipart] - Array of {name, path} for multipart file entries
 * @returns {string} The curl command string
 */
const buildCurlCommand = (request, options = {}) => {
  const { filePaths = {} } = options;
  const parts = ['curl'];

  // Method
  const method = (request.method || 'GET').toUpperCase();
  if (method !== 'GET') {
    parts.push(`-X ${method}`);
  }

  // URL
  parts.push(shellQuote(request.url));

  // Headers
  if (request.headers) {
    for (const [name, value] of Object.entries(request.headers)) {
      if (value === null || value === undefined) continue;
      parts.push(`-H ${shellQuote(`${name}: ${value}`)}`);
    }
  }

  // Digest auth
  if (request.digestConfig) {
    const { username, password } = request.digestConfig;
    parts.push('--digest');
    parts.push(`--user ${shellQuote(`${username || ''}:${password || ''}`)}`);
  }

  // NTLM auth
  if (request.ntlmConfig) {
    const { username, password, domain } = request.ntlmConfig;
    const user = domain ? `${domain}\\${username || ''}` : (username || '');
    parts.push('--ntlm');
    parts.push(`--user ${shellQuote(`${user}:${password || ''}`)}`);
  }

  // OAuth2 note
  if (request.oauth2) {
    parts.push('# Note: OAuth2 token must be fetched separately; add \'-H "Authorization: Bearer <token>"\'');
  }

  // AWS SigV4 note
  if (request.awsv4config) {
    parts.push('# Note: AWS SigV4 requires dynamic signing; headers will differ at runtime');
  }

  // Body
  const mode = request.mode;
  const data = request.data;

  if (mode === 'json' || mode === 'text' || mode === 'xml' || mode === 'sparql') {
    if (data != null && data !== '') {
      const bodyStr = typeof data === 'object' ? JSON.stringify(data) : String(data);
      parts.push(`--data-raw ${shellQuote(bodyStr)}`);
    }
  } else if (mode === 'formUrlEncoded') {
    if (Array.isArray(data)) {
      for (const param of data) {
        parts.push(`--data-urlencode ${shellQuote(`${param.name}=${param.value}`)}`);
      }
    } else if (typeof data === 'string' && data.length > 0) {
      parts.push(`--data-raw ${shellQuote(data)}`);
    }
  } else if (mode === 'multipartForm') {
    if (Array.isArray(data)) {
      const multipartFilePaths = filePaths.multipart || [];
      for (const param of data) {
        if (param.type === 'file') {
          const fileEntry = multipartFilePaths.find((f) => f.name === param.name);
          const filePath = fileEntry ? fileEntry.path : (param.value || 'unknown');
          parts.push(`-F ${shellQuote(`${param.name}=@${filePath}`)}`);
        } else {
          parts.push(`-F ${shellQuote(`${param.name}=${param.value || ''}`)}`);
        }
      }
    }
  } else if (mode === 'graphql') {
    if (data != null) {
      const graphqlBody = {
        query: data.query || '',
        variables: data.variables || {}
      };
      parts.push(`--data-raw ${shellQuote(JSON.stringify(graphqlBody))}`);
    }
  } else if (mode === 'file') {
    const filePath = filePaths.body || 'unknown';
    parts.push(`--data-binary ${shellQuote(`@${filePath}`)}`);
  }

  // Format with line continuations
  if (parts.length <= 2) {
    return parts.join(' ');
  }

  return parts.join(' \\\n  ');
};

/**
 * Shell-quote a string using single quotes.
 * Embedded single quotes are handled via the '\'' technique.
 */
const shellQuote = (str) => {
  if (str == null) return '\'\'';
  const s = String(str);
  // If string contains no special characters, we can still quote for safety
  return '\'' + s.replace(/'/g, '\'\\\'\'') + '\'';
};

module.exports = {
  buildCurlCommand
};
