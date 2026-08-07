const fs = require('fs');
const os = require('os');
const path = require('path');

/**
 * @param {string} tag - Short suite identifier, used in the directory name
 * @returns {string} Absolute path to the new directory
 */
const createTmpDir = (tag) => fs.mkdtempSync(path.join(os.tmpdir(), `bru-cli-${tag}-`));

/**
 * A run rewrites the environment files it is pointed at, so never point it at the committed fixture.
 *
 * @param {string} fixtureDir - Absolute path to the committed fixture to copy
 * @param {string} tag - Short suite identifier, used in the directory name
 * @returns {string} Absolute path to the copy
 */
const copyFixtureToTmpDir = (fixtureDir, tag) => {
  const tmpDir = createTmpDir(tag);
  fs.cpSync(fixtureDir, tmpDir, { recursive: true });
  return tmpDir;
};

/**
 * `force` only suppresses ENOENT; the retries cover Windows locking a file the run just wrote.
 *
 * @param {string} tmpDir - Directory to remove
 */
const removeTmpDir = (tmpDir) => {
  fs.rmSync(tmpDir, { recursive: true, force: true, maxRetries: 10, retryDelay: 100 });
};

module.exports = { createTmpDir, copyFixtureToTmpDir, removeTmpDir };
