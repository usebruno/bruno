const deleteHeaderIfExists = (headers, header) => {
  Object.keys(headers).forEach((key) => {
    if (key.toLowerCase() === header.toLowerCase()) {
      delete headers[key];
    }
  });
};

const sanitizeResultsForReporter = (results, { skipAllHeaders = false, skipHeaders = [], skipRequestBody = false, skipResponseBody = false } = {}) => {
  if (skipAllHeaders) {
    results.forEach((result) => {
      result.request.headers = {};
      result.response.headers = {};
    });
  }

  if (skipHeaders?.length) {
    results.forEach((result) => {
      if (result.request?.headers) {
        skipHeaders.forEach((header) => {
          deleteHeaderIfExists(result.request.headers, header);
        });
      }
      if (result.response?.headers) {
        skipHeaders.forEach((header) => {
          deleteHeaderIfExists(result.response.headers, header);
        });
      }
    });
  }

  if (skipRequestBody) {
    results.forEach((result) => {
      delete result.request.data;
    });
  }

  if (skipResponseBody) {
    results.forEach((result) => {
      delete result.response.data;
    });
  }
};

module.exports = { sanitizeResultsForReporter };
