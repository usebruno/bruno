import cookie from 'cookie';
import URL from 'url';
import { parse } from 'shell-quote';
import { isEmpty } from 'lodash';
import { parseQueryParams } from '@usebruno/common/utils';

/**
 * Flag definitions - maps flag names to their states and actions
 * State-returning flags expect a value, immediate action flags don't
 */
const FLAG_CATEGORIES = {
  // State-returning flags (expect a value after the flag)
  'user-agent': ['-A', '--user-agent'],
  'header': ['-H', '--header'],
  'data': ['-d', '--data', '--data-ascii', '--data-urlencode'],
  'json': ['--json'],
  'user': ['-u', '--user'],
  'method': ['-X', '--request'],
  'cookie': ['-b', '--cookie'],
  'form': ['-F', '--form'],
  // Special data flags with properties
  'data-raw': ['--data-raw'],
  'data-binary': ['--data-binary'],

  // Immediate action flags (no value expected)
  'head': ['-I', '--head'],
  'compressed': ['--compressed'],
  'insecure': ['-k', '--insecure'],
  'digest': ['--digest'],
  'ntlm': ['--ntlm'],
  /**
   * Query flags: mark data for conversion to query parameters.
   * While this is an immediate action flag, the actual conversion to a query string occurs later during post-build request processing.
   * Due to the unpredictable order of flags, query string construction is deferred to the end.
   */
  'query': ['-G', '--get']
};

/**
 * Parse a curl command into a request object
 *
 * @TODO
 * - Handle T (file upload)
 */
const parseCurlCommand = (curl) => {
  const cleanedCommand = cleanCurlCommand(curl);
  const parsedArgs = parse(cleanedCommand);
  const request = buildRequest(parsedArgs);

  return cleanRequest(postBuildProcessRequest(request));
};

/**
 * Build request object by processing parsed arguments
 * Uses a state machine pattern to handle flag-value pairs
 */
const buildRequest = (parsedArgs) => {
  const request = { headers: {} };
  let currentState = null;

  for (const arg of parsedArgs) {
    const newState = processArgument(arg, currentState, request);
    // Reset state after handling a value, or update to new state
    if (currentState && !newState) {
      currentState = null;
    } else if (newState) {
      currentState = newState;
    }
  }

  return request;
};

/**
 * Process a single argument and return new state if needed
 * State machine: flags set states, values are processed based on current state
 */
const processArgument = (arg, currentState, request) => {
  // Handle flag arguments first (they set states)
  const flagState = handleFlag(arg, request);
  if (flagState) {
    return flagState;
  }

  // Handle values based on current state (e.g., -H "value" where currentState is 'header')
  if (arg && currentState) {
    handleValue(arg, currentState, request);
    return null;
  }

  // Handle URL detection (only when no current state to avoid conflicts)
  if (!currentState && isURLOrFragment(arg)) {
    setURL(request, arg);
    return null;
  }

  return null;
};

/**
 * Handle flag arguments and return new state
 * Determines if flag expects a value or performs immediate action
 */
const handleFlag = (arg, request) => {
  // Find which category this flag belongs to
  for (const [category, flags] of Object.entries(FLAG_CATEGORIES)) {
    if (flags.includes(arg)) {
      return handleFlagCategory(category, arg, request);
    }
  }

  return null;
};

/**
 * Handle flag based on its category
 * Returns state name for flags that expect values, null for immediate actions
 */
const handleFlagCategory = (category, arg, request) => {
  switch (category) {
    // State-returning flags (return category name to expect value)
    case 'user-agent':
    case 'header':
    case 'data':
    case 'json':
    case 'user':
    case 'method':
    case 'cookie':
    case 'form':
      return category;

    // Special data flags (set properties and return 'data' state)
    case 'data-raw':
      request.isDataRaw = true;
      return 'data';

    case 'data-binary':
      request.isDataBinary = true;
      return 'data';

    // Immediate action flags (perform action and return null)
    case 'head':
      request.method = 'HEAD';
      return null;

    case 'compressed':
      request.headers['Accept-Encoding'] = request.headers['Accept-Encoding'] || 'deflate, gzip';
      return null;

    case 'insecure':
      request.insecure = true;
      return null;

    case 'digest':
      request.isDigestAuth = true;
      return null;

    case 'ntlm':
      request.isNtlmAuth = true;
      return null;

    case 'query':
      // set temporary property isQuery to true to indicate that the data should be converted to query string
      // this is processed later at post build request processing
      request.isQuery = true;
      return null;

    default:
      return null;
  }
};

/**
 * Handle values based on the current parsing state
 * Maps state names to their value processing functions
 */
const handleValue = (value, state, request) => {
  const valueHandlers = {
    'header': () => setHeader(request, value),
    'user-agent': () => setUserAgent(request, value),
    'data': () => setData(request, value),
    'json': () => setJsonData(request, value),
    'form': () => setFormData(request, value),
    'user': () => setAuth(request, value),
    'method': () => setMethod(request, value),
    'cookie': () => setCookie(request, value)
  };

  const handler = valueHandlers[state];
  if (handler) {
    handler();
  }
};

/**
 * Set header from value
 */
const setHeader = (request, value) => {
  const [headerName, headerValue] = value.split(/:\s*(.+)/);
  request.headers[headerName] = headerValue;
};

/**
 * Set user agent
 */
const setUserAgent = (request, value) => {
  request.headers['User-Agent'] = value;
};

/**
 * Set authentication credentials
 * Stores credentials temporarily for finalization in post-processing
 */
const setAuth = (request, value) => {
  if (typeof value !== 'string') {
    return;
  }

  const [username, password] = value.split(':');

  // Store credentials temporarily for finalization in post-processing
  request.authCredentials = {
    username: username || '',
    password: password || ''
  };
};

/**
 * Finalize authentication object based on credentials and auth type flags
 */
const normalizeAuthProperties = (request) => {
  if (!request.authCredentials) {
    delete request.isDigestAuth;
    delete request.isNtlmAuth;
    return;
  }

  const { username, password } = request.authCredentials;

  // Determine auth mode based on flags
  let mode = 'basic';
  if (request.isDigestAuth) {
    mode = 'digest';
  } else if (request.isNtlmAuth) {
    mode = 'ntlm';
  }

  request.auth = {
    mode: mode,
    [mode]: { username, password }
  };

  // Clean up temporary properties
  delete request.authCredentials;
  delete request.isDigestAuth;
  delete request.isNtlmAuth;
};

/**
 * Set request method
 */
const setMethod = (request, value) => {
  request.method = value.toUpperCase();
};

/**
 * Set request cookies
 */
const setCookie = (request, value) => {
  if (typeof value !== 'string') {
    return;
  }

  const parsedCookies = cookie.parse(value);
  request.cookies = { ...request.cookies, ...parsedCookies };
  request.cookieString = request.cookieString ? request.cookieString + '; ' + value : value;

  request.headers['Cookie'] = request.cookieString;
};

/**
 * Set data (handles multiple -d flags by concatenating with &)
 */
const setData = (request, value) => {
  request.data = request.data ? request.data + '&' + value : value;
};

/**
 * Set JSON data
 * JSON flag automatically sets Content-Type and converts GET/HEAD to POST
 */
const setJsonData = (request, value) => {
  if (request.method === 'GET' || request.method === 'HEAD') {
    request.method = 'POST';
  }
  request.headers['Content-Type'] = 'application/json';
  // JSON data replaces existing data (don't append with &)
  request.data = value;
};

/**
 * Set form data
 * Form data always sets method to POST and creates multipart uploads
 */
const setFormData = (request, value) => {
  const formArray = Array.isArray(value) ? value : [value];
  const multipartUploads = [];

  formArray.forEach((field) => {
    const upload = parseFormField(field);
    if (upload) {
      multipartUploads.push(upload);
    }
  });

  request.multipartUploads = request.multipartUploads || [];
  request.multipartUploads.push(...multipartUploads);
  request.method = 'POST';
};

/**
 * Parse a single form field
 * Handles text fields, quoted values, and file uploads (@path)
 */
const parseFormField = (field) => {
  const match = field.match(/^([^=]+)=(?:@?"([^"]*)"|@([^@]*)|([^@]*))?$/);

  if (!match) return null;

  const fieldName = match[1];
  const fieldValue = match[2] || match[3] || match[4] || '';
  const isFile = field.includes('@');

  return {
    name: fieldName,
    value: fieldValue,
    type: isFile ? 'file' : 'text',
    enabled: true
  };
};

/**
 * Check if argument is a URL or URL fragment
 */
const isURLOrFragment = (arg) => {
  return isURL(arg) || isURLFragment(arg);
};

/**
 * Check if argument looks like a URL
 */
const isURL = (arg) => {
  if (typeof arg !== 'string') {
    return false;
  }

  // First try to parse as a regular URL (with protocol)
  if (URL.parse(arg || '').host) {
    return true;
  }

  // Check if it looks like a domain without protocol
  // This regex matches domain patterns like:
  // - example.com
  // - sub.example.com
  // - example.com/path
  // - example.com/path?query=value
  // Must contain at least one dot to be considered a domain
  const DOMAIN_PATTERN = /^[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(\.[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+(\/[^\s]*)?(\?[^\s]*)?$/;

  return DOMAIN_PATTERN.test(arg);
};

/**
 * Check if argument looks like a URL fragment
 * Handles shell-quote operator objects and query parameter patterns
 */
const isURLFragment = (arg) => {
  // If it's a glob pattern that looks like a URL, treat it as a complete URL
  if (arg && typeof arg === 'object' && arg.op === 'glob') {
    return isURL(arg.pattern);
  }
  if (arg && typeof arg === 'object' && arg.op === '&') {
    return true;
  }
  if (typeof arg === 'string') {
    // check if arg is a query string containing key=value pair
    return /^[^=]+=[^&]*$/.test(arg);
  }
  return false;
};

/**
 * Set URL and related properties
 * Handles URL concatenation for shell-quote fragments
 */
const setURL = (request, url) => {
  const urlString = getUrlString(url);
  if (!urlString) return;

  // Add default protocol if none is present
  let processedUrl = urlString;
  if (!request.url && !urlString.match(/^[a-zA-Z]+:\/\//)) {
    processedUrl = 'https://' + urlString;
  }

  const newUrl = request.url ? request.url + processedUrl : processedUrl;

  const { url: formattedUrl, queries, urlWithoutQuery } = parseUrl(newUrl);

  request.url = formattedUrl;
  request.urlWithoutQuery = urlWithoutQuery;
  request.queries = queries;
};

/**
 * Convert URL fragment to string
 * Handles shell-quote operator objects
 */
const getUrlString = (url) => {
  if (typeof url === 'string') return url;
  if (url?.op === 'glob') return url.pattern;
  if (url?.op === '&') return '&';
  return null;
};

/**
 * Parse URL
 * Returns formatted URL, URL without query, and queries
 */
const parseUrl = (url) => {
  const parsedUrl = URL.parse(url);

  const queries = parseQueryParams(parsedUrl.query, { decode: false });

  let formattedUrl = URL.format(parsedUrl);
  if (!url.endsWith('/') && formattedUrl.endsWith('/')) {
    // Remove trailing slashes if origin url does not have a trailing slash
    formattedUrl = formattedUrl.slice(0, -1);
  }

  const urlWithoutQuery = formattedUrl.split('?')[0];

  return {
    url: formattedUrl,
    urlWithoutQuery,
    queries
  };
};

/**
 * Convert data to query string
 * Used when -G or --get flag is present to move data from body to URL
 */
const convertDataToQueryString = (request) => {
  let url = request.url;

  if (url.indexOf('?') < 0) {
    url += '?';
  } else if (!url.endsWith('&')) {
    url += '&';
  }

  // append data to url as query string
  url += request.data;

  const { url: formattedUrl, queries } = parseUrl(url);

  request.url = formattedUrl;
  request.queries = queries;

  return request;
};

/**
 * Post-build processing of request
 * Handles method conversion, query parameter processing, and auth finalization
 */
const postBuildProcessRequest = (request) => {
  if (request.isQuery && request.data) {
    request = convertDataToQueryString(request);
    // remove data and isQuery from request as they are no longer needed
    delete request.data;
    delete request.isQuery;
  } else if (request.data) {
    // if data is present, set method to POST unless the method is explicitly set
    if (!request.method || request.method === 'HEAD') {
      request.method = 'POST';
    }
  }

  normalizeAuthProperties(request);

  // if method is not set, set it to GET
  if (!request.method) {
    request.method = 'GET';
  }

  // bruno requires method to be lowercase
  request.method = request.method.toLowerCase();

  return request;
};

/**
 * Clean up the final request object
 */
const cleanRequest = (request) => {
  if (isEmpty(request.headers)) {
    delete request.headers;
  }

  if (isEmpty(request.queries)) {
    delete request.queries;
  }

  return request;
};

/**
 * Clean up curl command
 * Handles escape sequences, line continuations, and method concatenation
 */
const cleanCurlCommand = (curlCommand) => {
  // Handle escape sequences
  curlCommand = curlCommand.replace(/\$('.*')/g, (match, group) => group);
  // Convert escaped single quotes to shell quote pattern
  curlCommand = curlCommand.replace(/\\'(?!')/g, '\'\\\'\'');
  // Fix concatenated HTTP methods
  curlCommand = fixConcatenatedMethods(curlCommand);

  return curlCommand.trim();
};

/**
 * Fix concatenated HTTP methods
 * Eg: Converts -XPOST to -X POST for proper parsing
 */
const fixConcatenatedMethods = (command) => {
  const methodFixes = [
    { from: / -XPOST/, to: ' -X POST' },
    { from: / -XGET/, to: ' -X GET' },
    { from: / -XPUT/, to: ' -X PUT' },
    { from: / -XPATCH/, to: ' -X PATCH' },
    { from: / -XDELETE/, to: ' -X DELETE' },
    { from: / -XOPTIONS/, to: ' -X OPTIONS' },
    { from: / -XHEAD/, to: ' -X HEAD' },
    { from: / -Xnull/, to: ' ' }
  ];

  methodFixes.forEach(({ from, to }) => {
    command = command.replace(from, to);
  });

  return command;
};

export default parseCurlCommand;
