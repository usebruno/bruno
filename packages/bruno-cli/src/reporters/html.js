const fs = require('fs');
const { generateHtmlReport } = require('@usebruno/common/runner');
const { CLI_VERSION } = require('../constants');

const makeHtmlOutput = async (results, outputPath, runCompletionTime) => {
  const environment = results.length > 0 ? results[0].environment : null;
  
  const htmlString = generateHtmlReport({ 
    runnerResults: results,
    version: `usebruno v${CLI_VERSION}`,
    environment: environment,
    runCompletionTime: runCompletionTime
  });
  fs.writeFileSync(outputPath, htmlString);
};

module.exports = makeHtmlOutput;
