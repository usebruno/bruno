const { describe, it, expect, beforeAll, afterAll, beforeEach, afterEach } = require('@jest/globals');
const fs = require('fs');
const os = require('os');
const path = require('path');
const http = require('http');
const { spawn } = require('child_process');

const CLI_BIN = path.resolve(__dirname, '..', '..', 'bin', 'bru.js');

const writeFileSyncMkdirP = (filePath, content) => {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, content);
};

const REQUEST_BRU = `meta {
  name: set-typed-vars
  type: http
  seq: 1
}

get {
  url: {{host}}/ping
  body: none
  auth: none
}

script:post-response {
  bru.setEnvVar("envNum", 42);
  bru.setEnvVar("envBool", true);
  bru.setEnvVar("envObj", { port: 3000, ssl: true });
  bru.setEnvVar("envStr", "hello");

  bru.setCollectionVar("collNum", 7);
  bru.setCollectionVar("collBool", false);
  bru.setCollectionVar("collObj", { region: "eu", retries: 3 });
  bru.setCollectionVar("collStr", "plain");
}
`;

describe('CLI run — typed env + collection vars set via scripts are persisted to disk', () => {
  // The CLI needs a reachable HTTP target so its post-response script can run.
  // Spin up a throwaway local server so the test doesn't depend on the network.
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
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'bru-cli-typed-persist-'));
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  // spawnSync would block jest's event loop, leaving the in-process HTTP server unable to
  // answer the CLI's request — leading to ECONNREFUSED and the post-response script never
  // running. Use async spawn so the server stays responsive.
  const runCli = (args, cwd = tmpDir) =>
    new Promise((resolve, reject) => {
      const child = spawn(process.execPath, [CLI_BIN, ...args], {
        cwd,
        env: { ...process.env, SHELL: '/bin/sh' }
      });
      let stdout = '';
      let stderr = '';
      child.stdout.on('data', (chunk) => { stdout += chunk; });
      child.stderr.on('data', (chunk) => { stderr += chunk; });
      child.on('error', reject);
      child.on('close', (code) => resolve({ code, stdout, stderr }));
    });

  const writeFixture = () => {
    writeFileSyncMkdirP(
      path.join(tmpDir, 'bruno.json'),
      JSON.stringify({ version: '1', name: 'typed-cli-collection', type: 'collection' }, null, 2) + '\n'
    );
    writeFileSyncMkdirP(
      path.join(tmpDir, 'collection.bru'),
      'meta {\n  name: typed-cli-collection\n  seq: 1\n}\n'
    );
    writeFileSyncMkdirP(
      path.join(tmpDir, 'environments', 'Test.bru'),
      `vars {\n  host: ${baseUrl}\n}\n`
    );
    writeFileSyncMkdirP(path.join(tmpDir, 'set-typed-vars.bru'), REQUEST_BRU);
  };

  const assertDiskState = () => {
    const envContent = fs.readFileSync(path.join(tmpDir, 'environments', 'Test.bru'), 'utf8');
    expect(envContent).toMatch(/@number\s+envNum:\s*42/);
    expect(envContent).toMatch(/@boolean\s+envBool:\s*true/);
    expect(envContent).toMatch(/@object\s+envObj:/);
    expect(envContent).toContain('"port": 3000');
    expect(envContent).toContain('"ssl": true');
    // 'string' is the implicit default — never materialized as an annotation.
    expect(envContent).not.toMatch(/@string\s+envStr/);
    expect(envContent).toMatch(/envStr:\s*hello/);

    const collectionBru = fs.readFileSync(path.join(tmpDir, 'collection.bru'), 'utf8');
    expect(collectionBru).toMatch(/@number\s+collNum:\s*7/);
    expect(collectionBru).toMatch(/@boolean\s+collBool:\s*false/);
    expect(collectionBru).toMatch(/@object\s+collObj:/);
    expect(collectionBru).toContain('"region": "eu"');
    expect(collectionBru).toContain('"retries": 3');
    expect(collectionBru).not.toMatch(/@string\s+collStr/);
    expect(collectionBru).toMatch(/collStr:\s*plain/);
  };

  // Run the same fixture under both sandboxes — they wrap different JS runtimes (`nodevm` vs
  // `quickjs`) but must produce identical persisted disk state. See
  // packages/bruno-cli/src/commands/run.js getJsSandboxRuntime: 'safe' → quickjs, anything
  // else → nodevm.
  it.each([
    ['developer'],
    ['safe']
  ])('writes @number/@boolean/@object annotations after CLI run (--sandbox %s)', async (sandbox) => {
    writeFixture();

    const result = await runCli([
      'run', 'set-typed-vars.bru', '--env', 'Test', '--sandbox', sandbox, '--noproxy'
    ]);

    // If the CLI hard-fails (non-zero exit + no request output), surface its stderr so the
    // failure mode is obvious instead of a cryptic "file content didn't match" assertion below.
    if (result.code !== 0) {
      throw new Error(
        `CLI exited with code ${result.code}.\n--- stdout ---\n${result.stdout}\n--- stderr ---\n${result.stderr}`
      );
    }

    assertDiskState();
  }, 60_000);

  // Global env vars live in the workspace, not the collection. The CLI finds them by walking
  // up from cwd looking for workspace.yml (or honoring --workspace-path), then reading
  // <workspace>/environments/<name>.yml. Persistence routes through the same
  // persistVariableUpdates path as env/collection vars — see run.js:484 for the
  // globalEnvFileDescriptor wiring.
  it.each([
    ['developer'],
    ['safe']
  ])('writes typed global env vars back to <workspace>/environments/<name>.yml (--sandbox %s)', async (sandbox) => {
    const workspaceDir = path.join(tmpDir, 'workspace');
    const collectionDir = path.join(workspaceDir, 'typed-cli-collection');

    // The CLI's workspace check only looks for the file's existence — see run.js
    // findWorkspacePath. A minimal valid YAML body keeps the fixture small.
    writeFileSyncMkdirP(
      path.join(workspaceDir, 'workspace.yml'),
      'opencollection: 1.0.0\ninfo:\n  name: "Test Workspace"\n  type: workspace\ncollections:\n  - name: "typed-cli-collection"\n    path: "typed-cli-collection"\nspecs:\ndocs: \'\'\n'
    );
    writeFileSyncMkdirP(
      path.join(workspaceDir, 'environments', 'Global.yml'),
      `name: Global\nvariables:\n  - name: baseUrl\n    value: ${baseUrl}\n    enabled: true\n    secret: false\n`
    );

    writeFileSyncMkdirP(
      path.join(collectionDir, 'bruno.json'),
      JSON.stringify({ version: '1', name: 'typed-cli-collection', type: 'collection' }, null, 2) + '\n'
    );
    writeFileSyncMkdirP(
      path.join(collectionDir, 'collection.bru'),
      'meta {\n  name: typed-cli-collection\n  seq: 1\n}\n'
    );
    writeFileSyncMkdirP(
      path.join(collectionDir, 'set-typed-global-vars.bru'),
      `meta {
  name: set-typed-global-vars
  type: http
  seq: 1
}

get {
  url: {{baseUrl}}/ping
  body: none
  auth: none
}

script:post-response {
  bru.setGlobalEnvVar("globalNum", 99);
  bru.setGlobalEnvVar("globalBool", false);
  bru.setGlobalEnvVar("globalObj", { tier: "premium", limit: 100 });
}
`
    );

    const result = await runCli(
      ['run', 'set-typed-global-vars.bru', '--global-env', 'Global', '--sandbox', sandbox, '--noproxy'],
      collectionDir
    );

    if (result.code !== 0) {
      throw new Error(
        `CLI exited with code ${result.code}.\n--- stdout ---\n${result.stdout}\n--- stderr ---\n${result.stderr}`
      );
    }

    // The yml env serializer encodes typed values as `value: { type, data }` blocks — see
    // packages/bruno-filestore/src/formats/yml/common/datatype.ts. Strings stay as raw
    // `value: …` with no type block.
    const written = fs.readFileSync(path.join(workspaceDir, 'environments', 'Global.yml'), 'utf8');
    expect(written).toMatch(/name:\s*globalNum[\s\S]*?type:\s*number[\s\S]*?data:\s*['"]?99/);
    expect(written).toMatch(/name:\s*globalBool[\s\S]*?type:\s*boolean[\s\S]*?data:\s*['"]?false/);
    expect(written).toMatch(/name:\s*globalObj[\s\S]*?type:\s*object[\s\S]*?data:[\s\S]*?tier/);
    expect(written).toMatch(/name:\s*baseUrl[\s\S]*?value:\s*['"]?http:\/\/127\.0\.0\.1/);
    expect(written).not.toMatch(/name:\s*baseUrl[\s\S]*?type:\s*string/);
  }, 60_000);
});
