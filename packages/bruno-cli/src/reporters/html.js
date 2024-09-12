const fs = require('fs');
const path = require('path');

const makeHtmlOutput = async (results, outputPath) => {
  const resultsJson = JSON.stringify(results, null, 2);

  const reportPath = path.join(__dirname, 'html-template.html');
  const template = fs.readFileSync(reportPath, 'utf8');

  fs.writeFileSync(outputPath, template.replace('__RESULTS_JSON__', resultsJson));
};

module.exports = makeHtmlOutput;
