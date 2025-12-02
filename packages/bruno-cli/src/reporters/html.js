const fs = require('fs');
const { generateHtmlReport } = require('@usebruno/common/runner');
const { CLI_VERSION } = require('../constants');

const makeHtmlOutput = async (results, outputPath, runCompletionTime, environment = null) => {
  let runnerResults = results;
  if (!results) {
    runnerResults = [];
  } else if (results.results) {
    // Convert CLI format to expected format: array of { iterationIndex, results, summary }
    runnerResults = [{
      iterationIndex: 0,
      results: results.results,
      summary: results.summary
    }];
  } else if (Array.isArray(results)) {
    runnerResults = results;
  }

  const htmlString = generateHtmlReport({ 
    runnerResults: runnerResults,
    version: `usebruno v${CLI_VERSION}`,
    environment: environment,
    runCompletionTime: runCompletionTime
  });
  fs.writeFileSync(outputPath, htmlString);
};

module.exports = makeHtmlOutput;
