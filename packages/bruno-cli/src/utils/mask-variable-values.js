const MASK = '********';

/**
 * Replace every occurrence of each variable value in `str` with the mask.
 * Values are matched as literal strings, longest first, so a value that
 * contains another value is masked before its substring can leak.
 */
const maskString = (str, values) => {
  let masked = str;
  for (const value of values) {
    if (typeof value === 'string' && value.length) {
      masked = masked.split(value).join(MASK);
    }
  }
  return masked;
};

/**
 * Mask variable values anywhere they appear in request or response bodies,
 * headers and URLs. `variables` maps a variable name to the value it resolved
 * to during the run; only the values are needed here.
 *
 * Non-string data (parsed JSON bodies, form arrays) is masked by deep-walking
 * it: every string value is masked on its own, and objects are stringified,
 * masked and re-parsed so a secret embedded inside a longer string (a JSON
 * body sent as a string, an XML body) is masked too.
 */
const maskValue = (data, values) => {
  if (!values.length) {
    return data;
  }
  if (typeof data === 'string') {
    return maskString(data, values);
  }
  if (Array.isArray(data)) {
    return data.map((entry) => maskValue(entry, values));
  }
  if (data && typeof data === 'object') {
    if (Buffer.isBuffer(data)) {
      return data;
    }
    const masked = {};
    for (const [key, value] of Object.entries(data)) {
      masked[maskString(key, values)] = maskValue(value, values);
    }
    return masked;
  }
  return data;
};

const maskHeaders = (headers, values) => {
  if (!headers || typeof headers !== 'object' || !values.length) {
    return headers;
  }
  const masked = {};
  for (const [key, value] of Object.entries(headers)) {
    masked[key] = typeof value === 'string' ? maskString(value, values) : value;
  }
  return masked;
};

const maskResultsVariableValues = (results, variables = {}) => {
  // Longest values first: a longer value that contains a shorter one must be
  // replaced before the shorter one's fragments are left behind.
  const values = Object.values(variables)
    .filter((value) => typeof value === 'string' && value.length)
    .sort((a, b) => b.length - a.length);

  if (!values.length) {
    return;
  }

  results.forEach((result) => {
    const request = result.request;
    if (request) {
      if (typeof request.url === 'string') {
        request.url = maskString(request.url, values);
      }
      request.headers = maskHeaders(request.headers, values);
      if ('data' in request) {
        request.data = maskValue(request.data, values);
      }
    }
    const response = result.response;
    if (response) {
      if (typeof response.url === 'string') {
        response.url = maskString(response.url, values);
      }
      response.headers = maskHeaders(response.headers, values);
      if ('data' in response) {
        response.data = maskValue(response.data, values);
      }
    }
  });
};

module.exports = {
  maskResultsVariableValues,
  MASK
};
