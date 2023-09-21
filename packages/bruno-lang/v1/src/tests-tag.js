const { between, regex, everyCharUntil } = require('arcsecond');

const testsBegin = regex(/^tests\s*\r?\n/);
const testsEnd = regex(/^[\r?\n]+\/tests[\s\r?\n]*/);

const testsTag = between(testsBegin)(testsEnd)(everyCharUntil(testsEnd)).map((tests) => {
  return {
    tests: tests
  };
});

module.exports = testsTag;
