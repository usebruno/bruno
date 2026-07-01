const { describe, it, expect, beforeAll, afterAll, beforeEach, afterEach } = require('@jest/globals');
const fs = require('fs');
const os = require('os');
const path = require('path');
const http = require('http');
const { spawn } = require('child_process');

const CLI_BIN = path.resolve(__dirname, '..', '..', 'bin', 'bru.js');

const BRUNO_JSON = JSON.stringify({
  version: '1',
  name: 'json-stream-test',
  type: 'collection',
  ignore: ['node_modules', '.git']
});

const COLLECTION_BRU = `meta {
  name: json-stream-test
  seq: 1
}
`;

const PING_BRU = `meta {
  name: ping
  type: http
  seq: 1
}

get {
  url: {{host}}/ping
  body: none
  auth: none
}

assert {
  res.status: eq 200
}

tests {
  test('ok flag is true', () => {
    expect(res.getBody().ok).to.equal(true);
  });
}
`;

const writeFixture = (rootDir, baseUrl) => {
  fs.writeFileSync(path.join(rootDir, 'bruno.json'), BRUNO_JSON);
  fs.writeFileSync(path.join(rootDir, 'collection.bru'), COLLECTION_BRU);
  fs.mkdirSync(path.join(rootDir, 'environments'), { recursive: true });
  fs.writeFileSync(
    path.join(rootDir, 'environments', 'Local.bru'),
    `vars {\n  host: ${baseUrl}\n}\n`
  );
  fs.writeFileSync(path.join(rootDir, 'ping.bru'), PING_BRU);
};

const runCli = (args, cwd) =>
  new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [CLI_BIN, ...args], { cwd, env: { ...process.env } });
    let stdout = '';
    let stderr = '';
    child.stdout.on('data', (chunk) => { stdout += chunk; });
    child.stderr.on('data', (chunk) => { stderr += chunk; });
    child.on('error', reject);
    child.on('close', (code) => resolve({ code, stdout, stderr }));
  });

const parseLines = (s) => s.split('\n').filter(Boolean).map((line) => JSON.parse(line));

describe('CLI run --json (NDJSON event stream)', () => {
  let server;
  let baseUrl;
  let tmpDir;

  beforeAll(async () => {
    server = http.createServer((_req, res) => {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ ok: true }));
    });
    await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
    const { port } = server.address();
    baseUrl = `http://127.0.0.1:${port}`;
  });

  afterAll(async () => {
    await new Promise((resolve) => server.close(resolve));
  });

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'bru-cli-json-'));
    writeFixture(tmpDir, baseUrl);
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('emits a well-formed NDJSON event stream from run.start to run.end', async () => {
    const { code, stdout, stderr } = await runCli(['run', 'ping.bru', '--env', 'Local', '--json'], tmpDir);

    expect(code).toBe(0);
    // stderr is empty on success — no error envelope written.
    expect(stderr).toBe('');

    const events = parseLines(stdout);
    expect(events.length).toBeGreaterThanOrEqual(5);

    // First event is always run.start, last is always run.end.
    expect(events[0].kind).toBe('run.start');
    expect(events[events.length - 1].kind).toBe('run.end');

    // Every event carries the contract version + envelope shape.
    for (const ev of events) {
      expect(ev.version).toBe(1);
      expect(typeof ev.kind).toBe('string');
      expect(typeof ev.ok).toBe('boolean');
      expect(ev.meta).toBeTruthy();
      expect(typeof ev.meta.cli_version).toBe('string');
    }

    // Per-request causal order: request.start before request.response before request.end.
    const kinds = events.map((e) => e.kind);
    expect(kinds).toEqual(
      expect.arrayContaining(['run.start', 'request.start', 'request.response', 'request.end', 'run.end'])
    );
    expect(kinds.indexOf('request.start')).toBeLessThan(kinds.indexOf('request.response'));
    expect(kinds.indexOf('request.response')).toBeLessThan(kinds.indexOf('request.end'));

    // run.start carries collection + total_requests. macOS resolves /tmp through /private;
    // realpath both sides to compare.
    expect(fs.realpathSync(events[0].data.collection.path)).toBe(fs.realpathSync(tmpDir));
    expect(events[0].data.env).toBe('Local');
    expect(events[0].data.total_requests).toBe(1);

    // request.response captures the 200 from the in-process server.
    const respEvent = events.find((e) => e.kind === 'request.response');
    expect(respEvent.data.status).toBe(200);
    expect(respEvent.data.path).toBe('ping.bru');

    // assertion.result for "res.status: eq 200" — should be passing.
    const assertion = events.find((e) => e.kind === 'assertion.result');
    expect(assertion).toBeTruthy();
    expect(assertion.data.passed).toBe(true);
    expect(assertion.ok).toBe(true);

    // test.result for the inline test() call.
    const testResult = events.find((e) => e.kind === 'test.result');
    expect(testResult).toBeTruthy();
    expect(testResult.data.phase).toBe('test');
    expect(testResult.data.passed).toBe(true);

    // run.end summary includes exit_code and the summary fields.
    const end = events[events.length - 1];
    expect(end.data.exit_code).toBe(0);
    expect(end.data.totalRequests).toBe(1);
    expect(end.data.passedRequests).toBe(1);
    expect(end.data.bail).toBeNull();
  });

  it('without --json, stdout contains no JSON envelopes', async () => {
    const { code, stdout, stderr } = await runCli(['run', 'ping.bru', '--env', 'Local'], tmpDir);
    expect(code).toBe(0);
    // No NDJSON should appear on stdout when --json is not set.
    expect(stdout).not.toMatch(/^\{"version":1,"kind":"run\.start"/m);
    // Human-readable banner / summary table should still be present.
    expect(stdout).toContain('Execution Summary');
    expect(stderr).toBe('');
  });

  it('emits an error envelope on stderr when --json-version is unsupported', async () => {
    const { code, stdout, stderr } = await runCli(
      ['run', 'ping.bru', '--env', 'Local', '--json', '--json-version', '99'],
      tmpDir
    );

    expect(code).toBe(9);
    expect(stdout).toBe('');
    const errLines = parseLines(stderr);
    expect(errLines).toHaveLength(1);
    expect(errLines[0]).toMatchObject({
      version: 1,
      kind: 'error',
      ok: false,
      error: {
        code: 9,
        name: 'invalid_output_format'
      }
    });
    expect(errLines[0].error.message).toContain('Unsupported --json-version');
  });

  it('emits an error envelope on stderr when the run fails (--bail on assertion fail)', async () => {
    // Rewrite ping.bru to assert a status code the server will never return.
    fs.writeFileSync(
      path.join(tmpDir, 'ping.bru'),
      PING_BRU.replace('res.status: eq 200', 'res.status: eq 418')
    );

    const { code, stdout, stderr } = await runCli(['run', 'ping.bru', '--env', 'Local', '--json'], tmpDir);

    expect(code).toBe(1);

    const events = parseLines(stdout);
    const assertion = events.find((e) => e.kind === 'assertion.result');
    expect(assertion.data.passed).toBe(false);
    expect(assertion.ok).toBe(false);

    const end = events[events.length - 1];
    expect(end.kind).toBe('run.end');
    expect(end.ok).toBe(false);
    expect(end.data.exit_code).toBe(1);

    const errLines = parseLines(stderr);
    expect(errLines).toHaveLength(1);
    expect(errLines[0]).toMatchObject({
      kind: 'error',
      ok: false,
      error: {
        code: 1,
        name: 'run_failed'
      }
    });
  });

  it('emits an error envelope on stderr when the input path does not exist', async () => {
    const { code, stdout, stderr } = await runCli(['run', 'nope.bru', '--json'], tmpDir);

    expect(code).toBe(5);
    // No run.* events were emitted because the failure happens before the loop.
    expect(stdout).toBe('');
    const errLines = parseLines(stderr);
    expect(errLines).toHaveLength(1);
    expect(errLines[0].error.code).toBe(5);
    expect(errLines[0].error.name).toBe('input_not_found');
  });
});
