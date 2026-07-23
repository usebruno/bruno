const { describe, it, expect, beforeEach, afterEach } = require('@jest/globals');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawn } = require('child_process');

const CLI_BIN = path.resolve(__dirname, '..', '..', 'bin', 'bru.js');

const BRUNO_JSON = JSON.stringify({ version: '1', name: 'req-cmd-test', type: 'collection' });
const COLLECTION_BRU = 'meta {\n  name: req-cmd-test\n  seq: 1\n}\n';

const PAYLOAD = {
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

const runCli = (args, cwd, stdin) =>
  new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [CLI_BIN, ...args], { cwd, env: { ...process.env } });
    let stdout = '';
    let stderr = '';
    child.stdout.on('data', (chunk) => { stdout += chunk; });
    child.stderr.on('data', (chunk) => { stderr += chunk; });
    child.on('error', reject);
    child.on('close', (code) => resolve({ code, stdout, stderr }));
    if (stdin !== undefined) {
      child.stdin.write(stdin);
      child.stdin.end();
    }
  });

const parseEnvelope = (s) => {
  const lines = s.split('\n').filter(Boolean);
  if (lines.length === 1) return JSON.parse(lines[0]);
  return JSON.parse(s);
};

describe('bru request add', () => {
  let tmpDir;
  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'bru-req-add-'));
    setupFixture(tmpDir);
  });
  afterEach(() => { fs.rmSync(tmpDir, { recursive: true, force: true }); });

  it('creates a .bru file from a --data payload', async () => {
    const { code, stdout, stderr } = await runCli(
      ['request', 'add', 'auth/login.bru', '--data', JSON.stringify(PAYLOAD), '--json'],
      tmpDir
    );
    expect(code).toBe(0);
    expect(stderr).toBe('');

    const env = parseEnvelope(stdout);
    expect(env.kind).toBe('request.add');
    expect(env.data.status).toBe('created');
    expect(env.data.path).toBe('auth/login.bru');
    expect(env.data.request.request.method).toBe('POST');

    // File appears on disk and round-trips.
    const onDisk = fs.readFileSync(path.join(tmpDir, 'auth', 'login.bru'), 'utf8');
    expect(onDisk).toContain('name: login');
    expect(onDisk).toContain('{{host}}/login');
  });

  it('auto-appends .bru when omitted', async () => {
    const { code, stdout } = await runCli(
      ['request', 'add', 'auth/login', '--data', JSON.stringify(PAYLOAD), '--json'],
      tmpDir
    );
    expect(code).toBe(0);
    const env = parseEnvelope(stdout);
    expect(env.data.path).toBe('auth/login.bru');
  });

  it('reads --data from stdin when set to "-" (use --data=-, not --data -)', async () => {
    const { code, stdout } = await runCli(
      ['request', 'add', 'auth/login.bru', '--data=-', '--json'],
      tmpDir,
      JSON.stringify(PAYLOAD)
    );
    expect(code).toBe(0);
    const env = parseEnvelope(stdout);
    expect(env.data.status).toBe('created');
  });

  it('rejects a conflicting add when --if-not-exists is not passed', async () => {
    await runCli(['request', 'add', 'auth/login.bru', '--data', JSON.stringify(PAYLOAD), '--json'], tmpDir);
    const { code, stderr } = await runCli(
      ['request', 'add', 'auth/login.bru', '--data', JSON.stringify(PAYLOAD), '--json'],
      tmpDir
    );
    expect(code).toBe(255);
    const err = parseEnvelope(stderr);
    expect(err.kind).toBe('error');
    expect(err.error.message).toMatch(/already exists/i);
  });

  it('is idempotent under --if-not-exists', async () => {
    await runCli(['request', 'add', 'auth/login.bru', '--data', JSON.stringify(PAYLOAD), '--json'], tmpDir);
    const before = fs.readFileSync(path.join(tmpDir, 'auth/login.bru'), 'utf8');

    const { code, stdout } = await runCli(
      ['request', 'add', 'auth/login.bru', '--data', JSON.stringify(PAYLOAD), '--if-not-exists', '--json'],
      tmpDir
    );
    expect(code).toBe(0);
    const env = parseEnvelope(stdout);
    expect(env.data.status).toBe('unchanged');
    expect(env.data.reason).toBe('already_exists');

    // Disk is untouched.
    expect(fs.readFileSync(path.join(tmpDir, 'auth/login.bru'), 'utf8')).toBe(before);
  });
});

describe('bru request edit', () => {
  let tmpDir;
  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'bru-req-edit-'));
    setupFixture(tmpDir);
  });
  afterEach(() => { fs.rmSync(tmpDir, { recursive: true, force: true }); });

  const seed = async () => {
    await runCli(
      ['request', 'add', 'auth/login.bru', '--data', JSON.stringify(PAYLOAD), '--json'],
      tmpDir
    );
  };

  it('applies a JSON Merge Patch and rewrites the file', async () => {
    await seed();
    const { code, stdout } = await runCli(
      ['request', 'edit', 'auth/login.bru', '--patch', JSON.stringify({ request: { url: '{{host}}/v2/login', method: 'PUT' } }), '--json'],
      tmpDir
    );
    expect(code).toBe(0);
    const env = parseEnvelope(stdout);
    expect(env.kind).toBe('request.edit');
    expect(env.data.status).toBe('updated');
    expect(env.data.request.request.method).toBe('PUT');
    expect(env.data.request.request.url).toBe('{{host}}/v2/login');

    const onDisk = fs.readFileSync(path.join(tmpDir, 'auth/login.bru'), 'utf8');
    expect(onDisk).toContain('put {');
    expect(onDisk).toContain('{{host}}/v2/login');
  });

  it('a no-op patch ({}) leaves the parsed shape unchanged', async () => {
    await seed();
    const before = fs.readFileSync(path.join(tmpDir, 'auth/login.bru'), 'utf8');
    const { code } = await runCli(
      ['request', 'edit', 'auth/login.bru', '--patch', '{}', '--json'],
      tmpDir
    );
    expect(code).toBe(0);
    const after = fs.readFileSync(path.join(tmpDir, 'auth/login.bru'), 'utf8');
    // Structural identity through parseRequest is what matters; bruno-lang doesn't
    // promise byte-stable formatting. Confirm via re-parse instead of string compare.
    const { parseRequest } = require('@usebruno/filestore');
    expect(parseRequest(after, { format: 'bru' })).toEqual(parseRequest(before, { format: 'bru' }));
  });

  it('emits an error when the target does not exist', async () => {
    const { code, stderr } = await runCli(
      ['request', 'edit', 'no/such.bru', '--patch', '{}', '--json'],
      tmpDir
    );
    expect(code).toBe(5);
    const err = parseEnvelope(stderr);
    expect(err.error.name).toBe('input_not_found');
  });

  it('rejects an unparseable patch', async () => {
    await seed();
    const { code, stderr } = await runCli(
      ['request', 'edit', 'auth/login.bru', '--patch', 'not json', '--json'],
      tmpDir
    );
    expect(code).toBe(8);
    const err = parseEnvelope(stderr);
    expect(err.error.name).toBe('env_override_malformed');
    expect(err.error.message).toMatch(/parse --patch/i);
  });
});

describe('bru request delete', () => {
  let tmpDir;
  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'bru-req-del-'));
    setupFixture(tmpDir);
  });
  afterEach(() => { fs.rmSync(tmpDir, { recursive: true, force: true }); });

  it('removes the target file', async () => {
    await runCli(
      ['request', 'add', 'auth/login.bru', '--data', JSON.stringify(PAYLOAD), '--json'],
      tmpDir
    );
    const target = path.join(tmpDir, 'auth/login.bru');
    expect(fs.existsSync(target)).toBe(true);

    const { code, stdout } = await runCli(['request', 'delete', 'auth/login.bru', '--json'], tmpDir);
    expect(code).toBe(0);
    const env = parseEnvelope(stdout);
    expect(env.kind).toBe('request.delete');
    expect(env.data.status).toBe('deleted');
    expect(fs.existsSync(target)).toBe(false);
  });

  it('emits an error when the target is missing', async () => {
    const { code, stderr } = await runCli(['request', 'delete', 'nope.bru', '--json'], tmpDir);
    expect(code).toBe(5);
    const err = parseEnvelope(stderr);
    expect(err.error.name).toBe('input_not_found');
  });
});
