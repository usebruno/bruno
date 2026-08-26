const { describe, it, expect, beforeAll, afterAll } = require('@jest/globals');
const fs = require('fs');
const path = require('path');
const http = require('http');
const { runCli } = require('../helpers/run-cli');
const { createCollectionFixture } = require('../helpers/collection-fixture');

const FIXTURE_COLLECTION = path.join(__dirname, 'fixtures', 'collection');

// `logResults` prints a checkmark and its message as two separately-chalked pieces
// (`chalk.green('✓ ') + chalk.dim(message)`), so if the invoking shell has color forced
// on (e.g. FORCE_COLOR set), the raw output has ANSI codes spliced between them - breaking
// a literal `toContain('✓ message')` check even though the text reads the same on screen.
// Stripping codes here keeps the assertions below agnostic to the runner's environment.

const stripAnsi = (text) => text.replace(/\x1b\[[0-9;]*m/g, '');

/**
 * `--sandbox developer` runs pre-request, post-response, and test scripts in Node's `vm`
 * module rather than QuickJS. Each script pairs a sync test() with an async one that only
 * resolves after a real timer, so a result missing from that phase's own tally means its
 * callback wasn't awaited before the run moved on - `bru run` only ever prints a checkmark
 * line for a result it actually received.
 *
 * 01/02 additionally chain an async test() result across two separate requests via a var
 * (mirroring the safe-mode pattern in quickjs-trap-containment/), 03 proves all three
 * script phases are awaited independently within a single request, and 04 waits on a real
 * outgoing HTTP call (bru.sendRequest) instead of a timer.
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
