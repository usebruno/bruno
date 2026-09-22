const { describe, it, expect, beforeAll, afterAll } = require('@jest/globals');
const fs = require('fs');
const path = require('path');
const http = require('http');
const crypto = require('crypto');
const { runCli } = require('../helpers/run-cli');
const { createCollectionFixture } = require('../helpers/collection-fixture');

const FIXTURE_COLLECTION = path.join(__dirname, 'fixtures', 'collection');

describe('CLI run — quickjs safe mode trap containment', () => {
  let server;
  let baseUrl;
  let collectionDir;

  beforeAll(async () => {
    // Distinct payloads per request: identical ones do not strand handles the
    // same way, so a shared body would stop provoking the trap.
    server = http.createServer((req, res) => {
      const payload = crypto.randomBytes(135000).toString('base64');
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ status: 'ok', payload }));
    });
    await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));

    baseUrl = `http://127.0.0.1:${server.address().port}`;
    collectionDir = createCollectionFixture(FIXTURE_COLLECTION);
  });

  afterAll(async () => {
    await new Promise((resolve) => server.close(resolve));
    fs.rmSync(collectionDir, { recursive: true, force: true });
  });

  it('contains the engine trap and survives sync vars and async test callbacks', async () => {
    const { code, stdout, stderr } = await runCli(
      ['run', '.', '--sandbox', 'safe', '--env-var', `baseUrl=${baseUrl}`],
      collectionDir
    );
    const output = `${stdout}\n${stderr}`;

    expect(output).toContain('was replaced; the run was not affected');
    expect(output).not.toContain('Aborted');
    expect(code).toBe(0);
    expect(output).toContain('5 Passed');
    expect(output).not.toContain('Failed');
  }, 120000);
});
