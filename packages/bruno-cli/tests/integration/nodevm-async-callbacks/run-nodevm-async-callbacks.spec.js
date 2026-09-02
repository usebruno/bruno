const { describe, it, expect, beforeAll, afterAll } = require('@jest/globals');
const fs = require('fs');
const path = require('path');
const http = require('http');
const { runCli } = require('../helpers/run-cli');
const { createCollectionFixture } = require('../helpers/collection-fixture');
const { stripAnsi } = require('../helpers/strip-ansi');

const FIXTURE_COLLECTION = path.join(__dirname, 'fixtures', 'collection');

/**
 * Each fixture pairs a sync test() with an async one, so a missing checkmark for the
 * async one means its callback wasn't awaited before `bru run` printed results.
 */
describe('CLI run --sandbox developer - async test() callbacks are awaited before results are read', () => {
  let server;
  let baseUrl;
  let collectionDir;
  let output;
  let code;

  beforeAll(async () => {
    server = http.createServer((req, res) => {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ status: 'ok' }));
    });
    await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
    baseUrl = `http://127.0.0.1:${server.address().port}`;

    collectionDir = createCollectionFixture(FIXTURE_COLLECTION);
    const result = await runCli(
      ['run', '.', '--sandbox', 'developer', '--env-var', `baseUrl=${baseUrl}`],
      collectionDir
    );
    code = result.code;
    output = stripAnsi(`${result.stdout}\n${result.stderr}`);
  });

  afterAll(async () => {
    fs.rmSync(collectionDir, { recursive: true, force: true });
    await new Promise((resolve) => server.close(resolve));
  });

  it('carries an async test() result across requests: one request only sets a var after awaiting it, and a later request reads that var', () => {
    expect(output).toContain('✓ async test with awaited host work passes');
    expect(output).toContain('✓ the awaited test callback finished before its run returned');
  });

  it('awaits async test() callbacks independently in the pre-request, post-response, and tests scripts of a single request', () => {
    expect(output).toContain('✓ pre-request sync test (control)');
    expect(output).toContain('✓ pre-request async test (bug check)');
    expect(output).toContain('✓ post-response sync test (control)');
    expect(output).toContain('✓ post-response async test (bug check)');
    expect(output).toContain('✓ sync pass (control)');
    expect(output).toContain('✓ async assertion never runs (bug check)');
  });

  it('awaits an async test() callback that waits on a real outgoing request (bru.sendRequest), not just a timer', () => {
    expect(output).toContain('✓ async test awaiting a real request (bug check)');
  });

  it('still fails the run for the two deliberate control-group failures, and exits non-zero because of them', () => {
    expect(output).toContain('✕ sync fail (control)');
    expect(output).toContain('✕ async fail after await (bug check)');
    expect(code).toBe(1);
  });
});
