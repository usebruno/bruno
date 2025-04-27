const os = require('os');
const fs = require('fs');
const xmlbuilder = require('xmlbuilder2');
const { generateJunitReport } = require('@usebruno/common/runner');

const makeJUnitOutput = async (results, outputPath) => {
  // we modify the runnerResults to fit the T_RunnerResults structure
  const runnerResults = [{
    iterationIndex: 0,
    results
  }];
  const output = generateJunitReport({ runnerResults, config: { hostname: os.hostname() } });
  const xml = xmlbuilder.create(output).end({ prettyPrint: true });
  fs.writeFileSync(outputPath, xml);
};

module.exports = makeJUnitOutput;
