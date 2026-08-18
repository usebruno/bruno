const fs = require('fs');
const os = require('os');
const path = require('path');

// bru mutates files during a run; copy so source fixtures stay pristine. Caller cleans up.
// realpathSync: macOS os.tmpdir() is a symlink; sandbox resolves __dirname to the realpath.
const prepareFixtureWorkdir = (fixtureDir) => {
  const workDir = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'bru-cli-fixture-')));
  fs.cpSync(fixtureDir, workDir, { recursive: true });
  return workDir;
};

module.exports = { prepareFixtureWorkdir };
