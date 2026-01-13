const path = require('path');

const createSkippedResult = (skippedFile, collectionPath) => {
  const relativePath = path.relative(collectionPath, skippedFile.path);
  return {
    test: {
      filename: relativePath
    },
    request: {
      method: null,
      url: null,
      headers: null,
      data: null
    },
    response: {
      status: 'skipped',
      statusText: skippedFile.error,
      data: null,
      responseTime: 0
    },
    error: skippedFile.error,
    status: 'skipped',
    skipped: true,
    assertionResults: [],
    testResults: [],
    preRequestTestResults: [],
    postResponseTestResults: []
  };
};

module.exports = {
  createSkippedResult
};
