const fs = require('fs');
const { generateHtmlReport } = require('@usebruno/common/runner');

const makeHtmlOutput = async (results, outputPath) => {
  // we modify the runnerResults to fit the T_RunnerResults structure
  const runnerResults = [{
    iterationIndex: 0,
    results
  }];
  const htmlString = generateHtmlReport({ runnerResults });
  fs.writeFileSync(outputPath, htmlString);
};

module.exports = makeHtmlOutput;
