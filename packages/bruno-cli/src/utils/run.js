const path = require('path');
const { stripExtension } = require('./filesystem');

const createSkippedFileResults = (skippedFiles, collectionPath) => {
  return skippedFiles.map((skippedFile) => {
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
      postResponseTestResults: [],
      runDuration: 0,
      suitename: stripExtension(relativePath),
      name: path.basename(skippedFile.path),
      path: relativePath
    };
  });
};

module.exports = {
  createSkippedFileResults
};
