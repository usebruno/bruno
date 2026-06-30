const { describe, it, expect, beforeEach, afterEach } = require('@jest/globals');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawn } = require('child_process');

const CLI_BIN = path.resolve(__dirname, '..', '..', 'bin', 'bru.js');

const BRUNO_JSON = JSON.stringify({ version: '1', name: 'serve-test', type: 'collection' });
const COLLECTION_BRU = 'meta {\n  name: serve-test\n  seq: 1\n}\n';
const REQUEST_PAYLOAD = {
  type: 'http-request',
  name: 'login',
  seq: 1,
  request: {
    method: 'POST',
    url: '{{host}}/login',
    headers: [],
    auth: { mode: 'none' },
    body: { mode: 'none' },
    script: {},
    vars: {},
    assertions: [],
    tests: '',
    docs: '',
    params: []
  }
};

const setupFixture = (root) => {
  fs.writeFileSync(path.join(root, 'bruno.json'), BRUNO_JSON);
  fs.writeFileSync(path.join(root, 'collection.bru'), COLLECTION_BRU);
};

// Launch `bru serve --stdio` and exchange a scripted sequence of NDJSON commands.
// Returns the array of response envelopes (in arrival order on stdout).
const runServeSession = (cwd, commands) =>
  new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [CLI_BIN, 'serve', '--stdio'], {
      cwd,
      env: { ...process.env }
    });
    let stdout = '';
    let stderr = '';
    child.stdout.on('data', (chunk) => { stdout += chunk; });
    child.stderr.on('data', (chunk) => { stderr += chunk; });
    child.on('error', reject);
    child.on('close', (code) => {
      const lines = stdout.split('\n').filter(Boolean);
      const responses = lines.map((l) => {
        try { return JSON.parse(l); } catch (_) { return { __unparseable__: l }; }
      });
      resolve({ code, stdout, stderr, responses });
    });

    // Write all commands then close stdin. Each command is its own line.
    for (const cmd of commands) {
      child.stdin.write(JSON.stringify(cmd) + '\n');
    }
    child.stdin.end();
  });

describe('bru serve --stdio', () => {
  let tmpDir;
  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'bru-serve-'));
    setupFixture(tmpDir);
  });
  afterEach(() => { fs.rmSync(tmpDir, { recursive: true, force: true }); });

  it('emits a serve.ready envelope on startup, exits 0 on EOF', async () => {
    const { code, responses } = await runServeSession(tmpDir, []);
    expect(code).toBe(0);
    expect(responses).toHaveLength(1);
    expect(responses[0]).toMatchObject({
      version: 1,
      kind: 'serve.ready',
      ok: true,
      data: { json_contract_version: 1 }
    });
  });

  it('dispatches introspect/ls/schema in arrival order, echoing the id', async () => {
    const { code, responses } = await runServeSession(tmpDir, [
      { id: 'a', command: 'introspect' },
      { id: 'b', command: 'ls' },
      { id: 'c', command: 'schema', args: { kind: 'request' } }
    ]);
    expect(code).toBe(0);
    // 1 ready + 3 responses = 4
    expect(responses).toHaveLength(4);
    expect(responses[0].kind).toBe('serve.ready');
    expect(responses[1].id).toBe('a');
    expect(responses[1].kind).toBe('introspect');
    expect(responses[2].id).toBe('b');
    expect(responses[2].kind).toBe('ls');
    expect(responses[3].id).toBe('c');
    expect(responses[3].kind).toBe('schema');
    expect(responses[3].data.resource).toBe('request');
  });

  it('honours {command: "shutdown"} and emits serve.shutdown', async () => {
    const { code, responses } = await runServeSession(tmpDir, [
      { id: '1', command: 'introspect' },
      { id: 'bye', command: 'shutdown' },
      // This one must NOT be processed because shutdown set the exit flag.
      { id: 'ghost', command: 'introspect' }
    ]);
    expect(code).toBe(0);
    const kinds = responses.map((r) => r.kind);
    expect(kinds).toEqual(['serve.ready', 'introspect', 'serve.shutdown']);
    expect(responses.find((r) => r.id === 'ghost')).toBeUndefined();
  });

  it('returns an error envelope (not exit) on malformed JSON, keeps serving', async () => {
    const { code, responses } = await runServeSession(tmpDir, []);
    // Replay with mixed valid/invalid input manually so we can inject a bad line.
    const child = spawn(process.execPath, [CLI_BIN, 'serve', '--stdio'], { cwd: tmpDir });
    let stdout = '';
    child.stdout.on('data', (c) => { stdout += c; });
    child.stdin.write('this is not json\n');
    child.stdin.write(JSON.stringify({ id: 'after-bad', command: 'introspect' }) + '\n');
    child.stdin.end();
    const exitCode = await new Promise((res) => child.on('close', res));
    expect(exitCode).toBe(0);
    const lines = stdout.split('\n').filter(Boolean).map((l) => JSON.parse(l));
    // ready, error envelope for the bad line, introspect response for the good one
    expect(lines[0].kind).toBe('serve.ready');
    expect(lines[1]).toMatchObject({ kind: 'error', ok: false, error: { name: 'envelope_invalid_json' } });
    expect(lines[2].id).toBe('after-bad');
    expect(lines[2].kind).toBe('introspect');
    // Sanity: the leading-EOF-only session from above produced exactly one ready.
    expect(responses).toHaveLength(1);
    expect(code).toBe(0);
  });

  it('returns an error envelope for unknown commands and keeps serving', async () => {
    const { responses } = await runServeSession(tmpDir, [
      { id: 'x', command: 'does.not.exist' },
      { id: 'y', command: 'introspect' }
    ]);
    expect(responses[1]).toMatchObject({
      id: 'x',
      kind: 'error',
      ok: false,
      error: { name: 'unknown_command' }
    });
    expect(responses[2].id).toBe('y');
    expect(responses[2].kind).toBe('introspect');
  });

  it('routes write commands: request.add / request.edit / request.delete', async () => {
    const { code, responses } = await runServeSession(tmpDir, [
      { id: '1', command: 'request.add', args: { path: 'auth/login.bru', data: REQUEST_PAYLOAD } },
      { id: '2', command: 'request.edit', args: { path: 'auth/login.bru', patch: { request: { url: '{{host}}/v2/login', method: 'PUT' } } } },
      { id: '3', command: 'get', args: { kind: 'request', path: 'auth/login.bru' } },
      { id: '4', command: 'request.delete', args: { path: 'auth/login.bru' } }
    ]);
    expect(code).toBe(0);

    const add = responses.find((r) => r.id === '1');
    const edit = responses.find((r) => r.id === '2');
    const get = responses.find((r) => r.id === '3');
    const del = responses.find((r) => r.id === '4');

    expect(add.kind).toBe('request.add');
    expect(add.ok).toBe(true);
    expect(add.data.status).toBe('created');

    expect(edit.kind).toBe('request.edit');
    expect(edit.data.status).toBe('updated');
    expect(edit.data.request.request.method).toBe('PUT');

    expect(get.kind).toBe('request.get');
    expect(get.data.request.request.url).toBe('{{host}}/v2/login');

    expect(del.kind).toBe('request.delete');
    expect(fs.existsSync(path.join(tmpDir, 'auth/login.bru'))).toBe(false);
  });

  it('payloads can be inlined as plain objects (no JSON.parse round-trip in serve)', async () => {
    // The one-shot CLI requires --data="<json>"; serve agents pass objects directly
    // in args.data. Confirm that path works (coercePayload skips JSON.parse on object).
    const { responses } = await runServeSession(tmpDir, [
      { id: 'inline', command: 'request.add', args: { path: 'inline.bru', data: REQUEST_PAYLOAD } }
    ]);
    const env = responses.find((r) => r.id === 'inline');
    expect(env.ok).toBe(true);
    expect(env.data.status).toBe('created');
  });

  it('fails fast on bad --json-version at startup', async () => {
    const child = spawn(process.execPath, [CLI_BIN, 'serve', '--stdio', '--json-version', '99'], { cwd: tmpDir });
    let stderr = '';
    child.stderr.on('data', (c) => { stderr += c; });
    child.stdin.end();
    const exit = await new Promise((res) => child.on('close', res));
    expect(exit).toBe(9);
    const env = JSON.parse(stderr.trim());
    expect(env.error.name).toBe('invalid_output_format');
  });

  it('fails fast without --stdio', async () => {
    const child = spawn(process.execPath, [CLI_BIN, 'serve'], { cwd: tmpDir });
    let stderr = '';
    child.stderr.on('data', (c) => { stderr += c; });
    const exit = await new Promise((res) => child.on('close', res));
    expect(exit).toBe(9);
    const env = JSON.parse(stderr.trim());
    expect(env.error.name).toBe('serve_transport_required');
  });
});
