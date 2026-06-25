const { describe, it, expect, beforeAll, afterAll, beforeEach, afterEach } = require('@jest/globals');
const fs = require('fs');
const os = require('os');
const path = require('path');
const http = require('http');
const { spawn } = require('child_process');

const CLI_BIN = path.resolve(__dirname, '..', '..', 'bin', 'bru.js');

// Writes a fixture file, creating any missing parent directories first (mkdir -p semantics).
const writeFixtureFile = (filePath, content) => {
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
  //
  // SHELL=/bin/sh: the CLI bootstrap (packages/bruno-cli/src/index.js) calls
  // `initializeShellEnv()` unconditionally, which spawns $SHELL via the `shell-env` package
  // to source the user's dotfiles. Forcing /bin/sh standardizes that across machines (a
  // developer with fish/zsh shouldn't have their dotfiles sourced into the test env) and
  // keeps the bootstrap fast and deterministic.
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
    writeFixtureFile(
      path.join(tmpDir, 'bruno.json'),
      JSON.stringify({ version: '1', name: 'typed-cli-collection', type: 'collection' }, null, 2) + '\n'
    );
    writeFixtureFile(
      path.join(tmpDir, 'collection.bru'),
      'meta {\n  name: typed-cli-collection\n  seq: 1\n}\n'
    );
    writeFixtureFile(
      path.join(tmpDir, 'environments', 'Test.bru'),
      `vars {\n  host: ${baseUrl}\n}\n`
    );
    writeFixtureFile(path.join(tmpDir, 'set-typed-vars.bru'), REQUEST_BRU);

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
    writeFixtureFile(
      path.join(workspaceDir, 'workspace.yml'),
      'opencollection: 1.0.0\ninfo:\n  name: "Test Workspace"\n  type: workspace\ncollections:\n  - name: "typed-cli-collection"\n    path: "typed-cli-collection"\nspecs:\ndocs: \'\'\n'
    );
    writeFixtureFile(
      path.join(workspaceDir, 'environments', 'Global.yml'),
      `name: Global\nvariables:\n  - name: baseUrl\n    value: ${baseUrl}\n    enabled: true\n    secret: false\n`
    );

    writeFixtureFile(
      path.join(collectionDir, 'bruno.json'),
      JSON.stringify({ version: '1', name: 'typed-cli-collection', type: 'collection' }, null, 2) + '\n'
    );
    writeFixtureFile(
      path.join(collectionDir, 'collection.bru'),
      'meta {\n  name: typed-cli-collection\n  seq: 1\n}\n'
    );
    writeFixtureFile(
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

  // Verifies the explicit --workspace-path flag (vs. cwd walk-up via findWorkspacePath at
  // run.js:440). With the collection sitting OUTSIDE the workspace tree, the auto-detect
  // walk-up cannot find workspace.yml — the only way the CLI locates the global env file is
  // via the explicit flag. Persistence must still route correctly through that code path.
  it('persists typed global env vars when --workspace-path is provided explicitly', async () => {
    // Workspace and collection are siblings — auto-detect walk-up from the collection dir
    // never reaches the workspace, so --workspace-path is the only way the CLI finds it.
    const workspaceDir = path.join(tmpDir, 'workspace');
    const collectionDir = path.join(tmpDir, 'standalone-collection');

    writeFixtureFile(
      path.join(workspaceDir, 'workspace.yml'),
      'opencollection: 1.0.0\ninfo:\n  name: "Test Workspace"\n  type: workspace\ncollections:\nspecs:\ndocs: \'\'\n'
    );
    writeFixtureFile(
      path.join(workspaceDir, 'environments', 'Global.yml'),
      `name: Global\nvariables:\n  - name: baseUrl\n    value: ${baseUrl}\n    enabled: true\n    secret: false\n`
    );

    writeFixtureFile(
      path.join(collectionDir, 'bruno.json'),
      JSON.stringify({ version: '1', name: 'standalone-collection', type: 'collection' }, null, 2) + '\n'
    );
    writeFixtureFile(
      path.join(collectionDir, 'collection.bru'),
      'meta {\n  name: standalone-collection\n  seq: 1\n}\n'
    );
    writeFixtureFile(
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
}
`
    );

    const result = await runCli(
      [
        'run', 'set-typed-global-vars.bru',
        '--global-env', 'Global',
        '--workspace-path', workspaceDir,
        '--sandbox', 'developer',
        '--noproxy'
      ],
      collectionDir
    );

    if (result.code !== 0) {
      throw new Error(
        `CLI exited with code ${result.code}.\n--- stdout ---\n${result.stdout}\n--- stderr ---\n${result.stderr}`
      );
    }

    const written = fs.readFileSync(path.join(workspaceDir, 'environments', 'Global.yml'), 'utf8');
    expect(written).toMatch(/name:\s*globalNum[\s\S]*?type:\s*number[\s\S]*?data:\s*['"]?99/);
    expect(written).toMatch(/name:\s*globalBool[\s\S]*?type:\s*boolean[\s\S]*?data:\s*['"]?false/);
  }, 60_000);

  // --env-file is the only CLI surface that supports JSON env files (--global-env and --env
  // are locked to yml / bru-or-yml respectively). End-to-end coverage of the JSON branch in
  // persistEnvFile, including the shape-preservation guarantee: uid and custom fields on
  // entries the script doesn't touch must survive the round trip.
  it('persists typed env vars to a --env-file JSON file and preserves per-entry uid / custom fields', async () => {
    writeFixtureFile(
      path.join(tmpDir, 'bruno.json'),
      JSON.stringify({ version: '1', name: 'json-env-collection', type: 'collection' }, null, 2) + '\n'
    );
    writeFixtureFile(
      path.join(tmpDir, 'collection.bru'),
      'meta {\n  name: json-env-collection\n  seq: 1\n}\n'
    );

    // Existing entries carry uid + custom fields to verify the rewrite path doesn't strip
    // them. `host` will be echoed back unchanged by the script (used by the request URL);
    // `untouched` will not appear in the script's writes at all.
    writeFixtureFile(
      path.join(tmpDir, 'External.json'),
      JSON.stringify({
        name: 'External',
        uid: 'env-uid-abc',
        variables: [
          { name: 'host', value: baseUrl, uid: 'var-host', custom: 'keep-host' },
          { name: 'untouched', value: 'stays-put', uid: 'var-untouched', custom: 'keep-me' }
        ]
      }, null, 2) + '\n'
    );

    writeFixtureFile(
      path.join(tmpDir, 'set-typed-vars.bru'),
      `meta {
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
  bru.setEnvVar("port", 3000);
  bru.setEnvVar("enabled", true);
}
`
    );

    const result = await runCli([
      'run', 'set-typed-vars.bru',
      '--env-file', 'External.json',
      '--sandbox', 'developer',
      '--noproxy'
    ]);

    if (result.code !== 0) {
      throw new Error(
        `CLI exited with code ${result.code}.\n--- stdout ---\n${result.stdout}\n--- stderr ---\n${result.stderr}`
      );
    }

    const written = JSON.parse(fs.readFileSync(path.join(tmpDir, 'External.json'), 'utf8'));
    // Top-level metadata preserved
    expect(written.uid).toBe('env-uid-abc');
    const byName = Object.fromEntries(written.variables.map((v) => [v.name, v]));
    // New typed vars from the script
    expect(byName.port).toMatchObject({ value: 3000, dataType: 'number' });
    expect(byName.enabled).toMatchObject({ value: true, dataType: 'boolean' });
    // Untouched entry retains uid + custom field
    expect(byName.untouched).toMatchObject({
      value: 'stays-put',
      uid: 'var-untouched',
      custom: 'keep-me'
    });
    // Echoed-back entry retains uid + custom field
    expect(byName.host).toMatchObject({ uid: 'var-host', custom: 'keep-host' });
  }, 60_000);

  // End-to-end coverage of resolveEnvFileFormat's extension-detection branching for the
  // two non-JSON formats. The persistence behavior for yml / bru is already proven via
  // --env (.bru) and --global-env (.yml); these tests prove that --env-file <path>.yml
  // and --env-file <path>.bru also wire through correctly — descriptor format inferred
  // from the extension, parser/serializer selected accordingly.
  it('persists typed env vars to a --env-file YAML file with type/data blocks', async () => {
    writeFixtureFile(
      path.join(tmpDir, 'bruno.json'),
      JSON.stringify({ version: '1', name: 'yml-envfile-collection', type: 'collection' }, null, 2) + '\n'
    );
    writeFixtureFile(
      path.join(tmpDir, 'collection.bru'),
      'meta {\n  name: yml-envfile-collection\n  seq: 1\n}\n'
    );
    writeFixtureFile(
      path.join(tmpDir, 'External.yml'),
      `name: External\nvariables:\n  - name: host\n    value: ${baseUrl}\n    enabled: true\n    secret: false\n`
    );
    writeFixtureFile(
      path.join(tmpDir, 'set-typed-vars.bru'),
      `meta {
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
  bru.setEnvVar("port", 3000);
  bru.setEnvVar("enabled", true);
}
`
    );

    const result = await runCli([
      'run', 'set-typed-vars.bru',
      '--env-file', 'External.yml',
      '--sandbox', 'developer',
      '--noproxy'
    ]);

    if (result.code !== 0) {
      throw new Error(
        `CLI exited with code ${result.code}.\n--- stdout ---\n${result.stdout}\n--- stderr ---\n${result.stderr}`
      );
    }

    // yml serializer encodes typed values as `value: { type, data }` blocks.
    const written = fs.readFileSync(path.join(tmpDir, 'External.yml'), 'utf8');
    expect(written).toMatch(/name:\s*port[\s\S]*?type:\s*number[\s\S]*?data:\s*['"]?3000/);
    expect(written).toMatch(/name:\s*enabled[\s\S]*?type:\s*boolean[\s\S]*?data:\s*['"]?true/);
    // String values stay as raw `value: ...` — no type/data block.
    expect(written).toMatch(/name:\s*host[\s\S]*?value:\s*['"]?http:\/\/127\.0\.0\.1/);
    expect(written).not.toMatch(/name:\s*host[\s\S]*?type:\s*string/);
  }, 60_000);

  it('persists typed env vars to a --env-file .bru file with @dataType annotations', async () => {
    writeFixtureFile(
      path.join(tmpDir, 'bruno.json'),
      JSON.stringify({ version: '1', name: 'bru-envfile-collection', type: 'collection' }, null, 2) + '\n'
    );
    writeFixtureFile(
      path.join(tmpDir, 'collection.bru'),
      'meta {\n  name: bru-envfile-collection\n  seq: 1\n}\n'
    );
    writeFixtureFile(
      path.join(tmpDir, 'External.bru'),
      `vars {\n  host: ${baseUrl}\n}\n`
    );
    writeFixtureFile(
      path.join(tmpDir, 'set-typed-vars.bru'),
      `meta {
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
  bru.setEnvVar("port", 3000);
  bru.setEnvVar("enabled", true);
}
`
    );

    const result = await runCli([
      'run', 'set-typed-vars.bru',
      '--env-file', 'External.bru',
      '--sandbox', 'developer',
      '--noproxy'
    ]);

    if (result.code !== 0) {
      throw new Error(
        `CLI exited with code ${result.code}.\n--- stdout ---\n${result.stdout}\n--- stderr ---\n${result.stderr}`
      );
    }

    // .bru serializer emits typed values as `@dataType` decorators on the preceding line.
    const written = fs.readFileSync(path.join(tmpDir, 'External.bru'), 'utf8');
    expect(written).toMatch(/@number\s+port:\s*3000/);
    expect(written).toMatch(/@boolean\s+enabled:\s*true/);
    // String values get no annotation.
    expect(written).not.toMatch(/@string\s+host/);
    expect(written).toMatch(/host:\s*http:\/\/127\.0\.0\.1/);
  }, 60_000);

  // Regression guard at the CLI binary boundary: --env-var values are transient (the CLI
  // can't decrypt at-rest secrets, so users pass them in for a single run). Even though a
  // script writes an unrelated env var — which dirties the env scope and makes the runtime
  // echo back the full envVariables map including the override — the on-disk env file must
  // keep its real secret untouched.
  it('does not persist --env-var override values into the env file', async () => {
    writeFixtureFile(
      path.join(tmpDir, 'bruno.json'),
      JSON.stringify({ version: '1', name: 'override-leak-collection', type: 'collection' }, null, 2) + '\n'
    );
    writeFixtureFile(
      path.join(tmpDir, 'collection.bru'),
      'meta {\n  name: override-leak-collection\n  seq: 1\n}\n'
    );
    writeFixtureFile(
      path.join(tmpDir, 'environments', 'Test.bru'),
      `vars {\n  host: ${baseUrl}\n  token: real-secret-on-disk\n}\n`
    );
    writeFixtureFile(
      path.join(tmpDir, 'set-unrelated.bru'),
      `meta {
  name: set-unrelated
  type: http
  seq: 1
}

get {
  url: {{host}}/ping
  body: none
  auth: none
}

script:post-response {
  bru.setEnvVar("unrelated", "value");
}
`
    );

    const result = await runCli([
      'run', 'set-unrelated.bru',
      '--env', 'Test',
      '--env-var', 'token=transient-cli-value',
      '--sandbox', 'developer',
      '--noproxy'
    ]);

    if (result.code !== 0) {
      throw new Error(
        `CLI exited with code ${result.code}.\n--- stdout ---\n${result.stdout}\n--- stderr ---\n${result.stderr}`
      );
    }

    const envContent = fs.readFileSync(path.join(tmpDir, 'environments', 'Test.bru'), 'utf8');
    // Real on-disk secret preserved
    expect(envContent).toMatch(/token:\s*real-secret-on-disk/);
    // Transient override value NEVER reaches disk
    expect(envContent).not.toContain('transient-cli-value');
    // Unrelated key from the script is persisted normally
    expect(envContent).toMatch(/unrelated:\s*value/);
  }, 60_000);
});
