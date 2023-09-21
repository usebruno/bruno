const { between, regex, everyCharUntil } = require('arcsecond');

const scriptBegin = regex(/^script\s*\r?\n/);
const scriptEnd = regex(/^[\r?\n]+\/script[\s\r?\n]*/);

const scriptTag = between(scriptBegin)(scriptEnd)(everyCharUntil(scriptEnd)).map((script) => {
  return {
    script: script
  };
});

module.exports = scriptTag;
