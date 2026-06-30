const { describe, it, expect, beforeEach, afterEach } = require('@jest/globals');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawn } = require('child_process');

const CLI_BIN = path.resolve(__dirname, '..', '..', 'bin', 'bru.js');

const BRUNO_JSON = JSON.stringify({
  version: '1',
  name: 'agent-cmds-test',
  type: 'collection',
  ignore: ['node_modules', '.git']
});

const COLLECTION_BRU = `meta {
  name: agent-cmds-test
  seq: 1
}
`;

const LOGIN_BRU = `meta {
  name: login
  type: http
  seq: 1
}

post {
  url: {{host}}/login
  body: json
  auth: none
}

body:json {
  {"user": "alice"}
}

tests {
  test('200', () => { expect(res.getStatus()).to.equal(200); });
}
`;

const writeFixture = (root) => {
  fs.writeFileSync(path.join(root, 'bruno.json'), BRUNO_JSON);
  fs.writeFileSync(path.join(root, 'collection.bru'), COLLECTION_BRU);
  fs.mkdirSync(path.join(root, 'environments'), { recursive: true });
  fs.writeFileSync(path.join(root, 'environments', 'Local.bru'), 'vars {\n  host: http://localhost:1234\n}\n');
  fs.mkdirSync(path.join(root, 'auth'), { recursive: true });
  fs.writeFileSync(path.join(root, 'auth', 'login.bru'), LOGIN_BRU);
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

const parseEnvelope = (s) => {
  const lines = s.split('\n').filter(Boolean);
  if (lines.length === 1) {
    // NDJSON mode: single line, single envelope.
    return JSON.parse(lines[0]);
  }
  // Pretty mode: one multi-line JSON document.
  return JSON.parse(s);
};

describe('bru introspect', () => {
  let tmpDir;
  beforeEach(() => { tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'bru-introspect-')); });
  afterEach(() => { fs.rmSync(tmpDir, { recursive: true, force: true }); });

  it('emits a versioned envelope with command tree and exit codes', async () => {
    const { code, stdout, stderr } = await runCli(['introspect', '--json'], tmpDir);
    expect(code).toBe(0);
    expect(stderr).toBe('');

    const env = parseEnvelope(stdout);
    expect(env.version).toBe(1);
    expect(env.kind).toBe('introspect');
    expect(env.ok).toBe(true);

    expect(env.data.json_contract_version).toBe(1);
    expect(env.data.supported_json_versions).toEqual([1]);
    expect(env.data.cli_version).toMatch(/^\d+\.\d+\.\d+/);

    const names = env.data.commands.map((c) => c.name).sort();
    expect(names).toEqual(['get', 'import', 'introspect', 'ls', 'request', 'run', 'schema', 'serve']);

    // Every documented exit code maps to a stable slug.
    for (const ec of env.data.exit_codes) {
      expect(typeof ec.code).toBe('number');
      expect(ec.name).toMatch(/^[a-z][a-z0-9_]*$/);
      expect(ec.constant).toMatch(/^ERROR_/);
    }
  });

  it('emits the same shape without --json, just pretty-printed', async () => {
    const { code, stdout } = await runCli(['introspect'], tmpDir);
    expect(code).toBe(0);
    const env = parseEnvelope(stdout);
    expect(env.kind).toBe('introspect');
    expect(env.data.commands.length).toBeGreaterThan(0);
  });
});

describe('bru ls', () => {
  let tmpDir;
  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'bru-ls-'));
    writeFixture(tmpDir);
  });
  afterEach(() => { fs.rmSync(tmpDir, { recursive: true, force: true }); });

  it('walks the collection and lists requests + folders + environments', async () => {
    const { code, stdout, stderr } = await runCli(['ls', '--json'], tmpDir);
    expect(code).toBe(0);
    expect(stderr).toBe('');

    const env = parseEnvelope(stdout);
    expect(env.kind).toBe('ls');
    expect(env.data.collection.name).toBe('agent-cmds-test');
    expect(env.data.collection.format).toBe('bru');

    // Environments are surfaced separately.
    expect(env.data.environments).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ type: 'environment', name: 'Local' })
      ])
    );

    // The auth/ folder and auth/login.bru are both in items.
    const types = env.data.items.map((i) => `${i.type}:${i.path}`);
    expect(types).toEqual(expect.arrayContaining(['folder:auth', 'request:auth/login.bru']));

    // Request entries carry method + url + tests metadata.
    const login = env.data.items.find((i) => i.path === 'auth/login.bru');
    expect(login).toBeTruthy();
    expect(login.method).toBe('POST');
    expect(login.url).toBe('{{host}}/login');
    expect(login.has_tests).toBe(true);
  });

  it('respects --depth', async () => {
    fs.mkdirSync(path.join(tmpDir, 'auth', 'nested'), { recursive: true });
    fs.writeFileSync(path.join(tmpDir, 'auth', 'nested', 'logout.bru'), LOGIN_BRU.replace('login', 'logout'));

    const shallow = parseEnvelope(
      (await runCli(['ls', '--depth', '1', '--json'], tmpDir)).stdout
    );
    expect(shallow.data.items.find((i) => i.path === 'auth/login.bru')).toBeUndefined();
    expect(shallow.data.items.find((i) => i.path === 'auth')).toBeTruthy();

    const deep = parseEnvelope(
      (await runCli(['ls', '--depth', '3', '--json'], tmpDir)).stdout
    );
    expect(deep.data.items.find((i) => i.path === 'auth/nested/logout.bru')).toBeTruthy();
  });

  it('exits with code 5 (input_not_found) when the collection path is missing', async () => {
    const { code, stderr } = await runCli(['ls', './nope', '--json'], tmpDir);
    expect(code).toBe(5);
    const env = parseEnvelope(stderr);
    expect(env.kind).toBe('error');
    expect(env.error.name).toBe('input_not_found');
  });
});

describe('bru get', () => {
  let tmpDir;
  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'bru-get-'));
    writeFixture(tmpDir);
  });
  afterEach(() => { fs.rmSync(tmpDir, { recursive: true, force: true }); });

  it('reads a request as parsed JSON', async () => {
    const { code, stdout } = await runCli(['get', 'request', 'auth/login.bru', '--json'], tmpDir);
    expect(code).toBe(0);
    const env = parseEnvelope(stdout);
    expect(env.kind).toBe('request.get');
    expect(env.data.path).toBe('auth/login.bru');
    expect(env.data.request).toBeTruthy();
    // The bru-lang shape: { type, name, request: { method, url, ... }, ... }
    expect(env.data.request.name).toBe('login');
    expect(env.data.request.request.method).toBe('POST');
    expect(env.data.request.request.url).toBe('{{host}}/login');
  });

  it('auto-appends the .bru extension when omitted', async () => {
    const { code, stdout } = await runCli(['get', 'request', 'auth/login', '--json'], tmpDir);
    expect(code).toBe(0);
    const env = parseEnvelope(stdout);
    expect(env.data.path).toBe('auth/login.bru');
  });

  it('reads an environment by name (no extension needed)', async () => {
    const { code, stdout } = await runCli(['get', 'environment', 'Local', '--json'], tmpDir);
    expect(code).toBe(0);
    const env = parseEnvelope(stdout);
    expect(env.kind).toBe('environment.get');
    expect(env.data.environment.variables).toEqual(
      expect.arrayContaining([expect.objectContaining({ name: 'host' })])
    );
  });

  it('reads the collection root', async () => {
    const { code, stdout } = await runCli(['get', 'collection', '--json'], tmpDir);
    expect(code).toBe(0);
    const env = parseEnvelope(stdout);
    expect(env.kind).toBe('collection.get');
    expect(env.data.collection).toBeTruthy();
  });

  it('emits an error envelope when the request is missing', async () => {
    const { code, stderr } = await runCli(['get', 'request', 'nope.bru', '--json'], tmpDir);
    expect(code).toBe(5);
    const env = parseEnvelope(stderr);
    expect(env.kind).toBe('error');
    expect(env.error.name).toBe('input_not_found');
  });

  it('emits an error envelope when the environment is missing', async () => {
    const { code, stderr } = await runCli(['get', 'environment', 'Missing', '--json'], tmpDir);
    expect(code).toBe(6);
    const env = parseEnvelope(stderr);
    expect(env.kind).toBe('error');
    expect(env.error.name).toBe('env_not_found');
  });
});

describe('bru schema', () => {
  let tmpDir;
  beforeEach(() => { tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'bru-schema-')); });
  afterEach(() => { fs.rmSync(tmpDir, { recursive: true, force: true }); });

  it('returns the on-disk Draft 2020-12 schema for a request', async () => {
    const { code, stdout } = await runCli(['schema', 'request', '--json'], tmpDir);
    expect(code).toBe(0);
    const env = parseEnvelope(stdout);
    expect(env.kind).toBe('schema');
    expect(env.data.resource).toBe('request');
    expect(env.data.source).toBe('hand-authored');
    expect(env.data.schema.$schema).toBe('https://json-schema.org/draft/2020-12/schema');
    expect(env.data.schema.title).toBe('Bruno request');
    expect(env.data.schema.properties.type.enum).toEqual(
      expect.arrayContaining(['http-request', 'graphql-request'])
    );
  });

  it('returns the generated environment schema (sourced from Yup)', async () => {
    const { code, stdout } = await runCli(['schema', 'environment', '--json'], tmpDir);
    expect(code).toBe(0);
    const env = parseEnvelope(stdout);
    expect(env.data.source).toBe('generated');
    expect(env.data.schema.properties.name).toBeTruthy();
    expect(env.data.schema.properties.variables.type).toBe('array');
  });

  it('returns a schema for every documented kind', async () => {
    const kinds = ['request', 'folder', 'environment', 'environments', 'collection', 'collection-var', 'cli-output'];
    for (const k of kinds) {
      const { code, stdout } = await runCli(['schema', k, '--json'], tmpDir);
      expect(code).toBe(0);
      const env = parseEnvelope(stdout);
      expect(env.data.resource).toBe(k);
      expect(env.data.schema.$schema).toBe('https://json-schema.org/draft/2020-12/schema');
    }
  });
});
