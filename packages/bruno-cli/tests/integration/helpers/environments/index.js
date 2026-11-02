const fs = require('fs');
const path = require('path');
const http = require('http');
const { expect } = require('@jest/globals');
const { parseEnvironment } = require('@usebruno/filestore');
const { runCli } = require('../run-cli');
const { copyFixtureToTmpDir, removeTmpDir } = require('../tmp-dir');

// Nothing asserts on the response; the requests just need an endpoint that answers.
const respondOk = (_req, res) => {
  res.writeHead(200, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ ok: true }));
};

/**
 * Hands the request back as the response body, so a request's own `tests` block can assert on
 * what the run actually sent. The shape mirrors the testbench's /api/echo/everything
 * (packages/bruno-tests/src/index.js), which the Playwright suites run these fixtures against.
 *
 * @type {import('http').RequestListener}
 */
const echoRequest = (req, res) => {
  let body = '';
  req.on('data', (chunk) => { body += chunk; });
  req.on('end', () => {
    const { searchParams } = new URL(req.url, `http://${req.headers.host}`);
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      method: req.method,
      url: req.url,
      query: Object.fromEntries(searchParams),
      headers: req.headers,
      body
    }));
  });
};

/**
 * Binds an HTTP server to an ephemeral port on the loopback interface.
 *
 * @param {import('http').RequestListener} [handler] - Defaults to a 200 `{ ok: true }`
 * @returns {Promise<{ baseUrl: string, close: () => Promise<void> }>}
 */
const startLocalServer = async (handler = respondOk) => {
  const server = http.createServer(handler);
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const { port } = server.address();

  return {
    baseUrl: `http://127.0.0.1:${port}`,
    close: () => new Promise((resolve) => server.close(resolve))
  };
};

/**
 * Tracks the temp copies a suite seeds, so one `afterEach` removes them all.
 *
 * @returns {{ seedFixture: (fixtureDir: string, tag: string) => string, removeSeededFixtures: () => void }}
 */
const createFixtureSeeder = () => {
  let tmpDirs = [];

  // A run rewrites the environment files it is pointed at, so it never sees the committed fixture.
  const seedFixture = (fixtureDir, tag) => {
    const tmpDir = copyFixtureToTmpDir(fixtureDir, tag);
    tmpDirs.push(tmpDir);
    return tmpDir;
  };

  const removeSeededFixtures = () => {
    tmpDirs.forEach(removeTmpDir);
    tmpDirs = [];
  };

  return { seedFixture, removeSeededFixtures };
};

/**
 * Runs the CLI against a collection under the developer sandbox and without a proxy, the way every
 * environment suite does, and throws on a non-zero exit so a broken run cannot read as a pass.
 *
 * @param {string} collectionDir - Directory to run from
 * @param {string[]} args - CLI arguments, starting with the command
 * @returns {Promise<{ code: number, stdout: string, stderr: string }>}
 */
const runCollection = async (collectionDir, args) => {
  const result = await runCli([...args, '--sandbox', 'developer', '--noproxy'], collectionDir);

  if (result.code !== 0) {
    throw new Error(
      `CLI exited with code ${result.code}.\n--- stdout ---\n${result.stdout}\n--- stderr ---\n${result.stderr}`
    );
  }

  return result;
};

/**
 * @param {string} filePath - Environment file to read; its extension selects the format
 */
const readEnvironment = (filePath) =>
  parseEnvironment(fs.readFileSync(filePath, 'utf8'), { format: path.extname(filePath).slice(1) });

const variableNames = (environment) => environment.variables.map((variable) => variable.name).sort();

const findVariable = (environment, name) => environment.variables.find((variable) => variable.name === name);

/**
 * Asserted on the raw bytes: a secret can also reach disk through a field no parser surfaces.
 *
 * @param {string} value - Value that must appear in none of the files
 * @param {string[]} filePaths - Files to search
 */
const expectValueNotWritten = (value, filePaths) => {
  const carrying = filePaths.filter((filePath) => fs.readFileSync(filePath, 'utf8').includes(value));
  expect(carrying).toEqual([]);
};

module.exports = {
  echoRequest,
  startLocalServer,
  createFixtureSeeder,
  runCollection,
  readEnvironment,
  variableNames,
  findVariable,
  expectValueNotWritten
};
