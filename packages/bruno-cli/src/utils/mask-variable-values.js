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
 * to during the run — a single value, or the list of every value observed
 * when the variable changed over the run; only the values are needed here.
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
  if (typeof data === 'number') {
    // A numeric variable value (env vars parsed as numbers by the
    // interpolator) reaches the report as a JSON number; compare its string
    // form so the number is masked instead of passing through untouched.
    const stringified = String(data);
    const masked = maskString(stringified, values);
    return masked === stringified ? data : masked;
  }
  if (Array.isArray(data)) {
    return data.map((entry) => maskValue(entry, values));
  }
  if (data && typeof data === 'object') {
    if (Buffer.isBuffer(data)) {
      // Binary bodies can embed the value in their bytes, and the report
      // serializes the buffer verbatim, so the bytes are replaced wholesale.
      return MASK;
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
    // Headers can hold arrays of strings (e.g. set-cookie): each element that
    // could carry a value is masked on its own.
    if (Array.isArray(value)) {
      masked[key] = value.map((entry) => (typeof entry === 'string' ? maskString(entry, values) : entry));
    } else {
      masked[key] = typeof value === 'string' ? maskString(value, values) : value;
    }
  }
  return masked;
};

// Fields of a run result that can embed resolved variable values outside the
// request/response payloads: error messages, assertion and test results (a
// failed expectation prints the actual value it compared).
const RESULT_TEXT_FIELDS = ['error', 'assertionResults', 'testResults', 'preRequestTestResults', 'postResponseTestResults'];

const maskResultsVariableValues = (results, variables = {}) => {
  // Longest values first: a longer value that contains a shorter one must be
  // replaced before the shorter one's fragments are left behind. A variable
  // maps to one value or to every value it resolved to over the run.
  const values = Object.values(variables)
    .flatMap((value) => (Array.isArray(value) ? value : [value]))
    .map((value) => (typeof value === 'number' ? String(value) : value))
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
      if (typeof response.statusText === 'string') {
        response.statusText = maskString(response.statusText, values);
      }
    }
    for (const field of RESULT_TEXT_FIELDS) {
      if (result[field] !== undefined && result[field] !== null) {
        result[field] = maskValue(result[field], values);
      }
    }
  });
};

module.exports = {
  maskResultsVariableValues,
  MASK
};
