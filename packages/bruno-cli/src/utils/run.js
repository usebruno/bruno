const path = require('path');
const { stripExtension } = require('./filesystem');

const createSkippedResult = (skippedFile, collectionPath) => {
  const relativePath = path.relative(collectionPath, skippedFile.path);
  const result = {
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
  return {
    ...result,
    runDuration: 0,
    suitename: stripExtension(relativePath),
    name: path.basename(skippedFile.path),
    path: relativePath
  };
};

module.exports = {
  createSkippedResult
};
