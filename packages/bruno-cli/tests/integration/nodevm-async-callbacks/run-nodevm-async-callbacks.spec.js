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
describe('CLI run — async test() callbacks in developer sandbox', () => {
  let server;
  let baseUrl;

  beforeAll(async () => {
    server = http.createServer((req, res) => {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ status: 'ok' }));
    });
    await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
    baseUrl = `http://127.0.0.1:${server.address().port}`;
  });

  afterAll(async () => {
    await new Promise((resolve) => server.close(resolve));
  });

  it.each(['developer', 'safe'])('awaits async test() callbacks in every phase (--sandbox %s)', async (sandbox) => {
    const collectionDir = createCollectionFixture(FIXTURE_COLLECTION);
    try {
      const { code, stdout, stderr } = await runCli(
        ['run', '.', '--sandbox', sandbox, '--env-var', `baseUrl=${baseUrl}`],
        collectionDir
      );
      const output = stripAnsi(`${stdout}\n${stderr}`);

      // 01 -> 02: an async test() result survives to be read by a later request.
      expect(output).toContain('✓ async test with awaited host work passes');
      expect(output).toContain('✓ the awaited test callback finished before its run returned');

      // 03: all three script phases on one request, each awaited independently.
      expect(output).toContain('✓ pre-request sync test (control)');
      expect(output).toContain('✓ pre-request async test (bug check)');
      expect(output).toContain('✓ post-response sync test (control)');
      expect(output).toContain('✓ post-response async test (bug check)');
      expect(output).toContain('✓ sync pass (control)');
      expect(output).toContain('✓ async assertion never runs (bug check)');

      // 04: waiting on a real HTTP call, not just a timer, is awaited the same way.
      expect(output).toContain('✓ async test awaiting a real request (bug check)');

      // 03's tests tab carries two deliberate control-group failures, so the run as a
      // whole exits non-zero (ERROR_FAILED_COLLECTION) - that's expected, not a bug.
      expect(output).toContain('✕ sync fail (control)');
      expect(output).toContain('✕ async fail after await (bug check)');

      expect(code).toBe(1);
    } finally {
      fs.rmSync(collectionDir, { recursive: true, force: true });
    }
  }, 30000);
});
