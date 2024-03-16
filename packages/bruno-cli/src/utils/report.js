const minimatch = require('minimatch');

function cleanResults(results, opts) {
  if (opts.skipSensitiveData || opts.omitRequestBodies) {
    results.filter((res) => !!res.request?.data).forEach((res) => (res.request.data = '[REDACTED]'));
  }
  if (opts.skipSensitiveData || opts.omitResponseBodies) {
    results.filter((res) => !!res.response?.data).forEach((res) => (res.response.data = '[REDACTED]'));
  }
  if (opts.hideRequestBody) {
    results
      .filter((res) => !!res.request?.data)
      .filter((res) => opts.hideRequestBody.find((suitename) => minimatch(res.suitename, suitename)))
      .forEach((res) => (res.request.data = '[REDACTED]'));
  }
  if (opts.hideResponseBody) {
    results
      .filter((res) => !!res.response?.data)
      .filter((res) => opts.hideResponseBody.find((suitename) => minimatch(res.suitename, suitename)))
      .forEach((res) => (res.response.data = '[REDACTED]'));
  }
  if (opts.skipSensitiveData || opts.omitHeaders) {
    results.forEach((res) => {
      if (res.request) {
        res.request.headers = null;
      }
      if (res.response) {
        res.response.headers = null;
      }
    });
  }
  if (opts.skipHeaders) {
    results.forEach((res) => {
      opts.skipHeaders.forEach((header) => {
        if (res.request?.headers && res.request.headers[header]) {
          res.request.headers[header] = '[REDACTED]';
        }
        if (res.response?.headers && res.response.headers[header]) {
          res.response.headers[header] = '[REDACTED]';
        }
      });
    });
  }
  return results;
}

module.exports = {
  cleanResults
};
