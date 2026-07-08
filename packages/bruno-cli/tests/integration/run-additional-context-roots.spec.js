const { describe, it, expect, beforeAll, afterAll, beforeEach, afterEach } = require('@jest/globals');
const fs = require('fs');
const os = require('os');
const path = require('path');
const http = require('http');
const { spawn } = require('child_process');

const CLI_BIN = path.resolve(__dirname, '..', '..', 'bin', 'bru.js');

const writeFixtureFile = (filePath, content) => {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, content);
};

// workspace/
// ├── workspace.yml
// ├── node_modules/forbidden-lib/                    (ancestor — must NOT resolve)
// ├── shared-scripts/
// │   ├── utils.js                                    (generateAuthToken, formatDate)
// │   ├── deep/nested/nested-helper.js                (buildRequestId — walk-up target)
// │   └── node_modules/signature-utils/               (FNV-1a checksum helper)
// └── collections/
//     ├── collectionA/
//     └── collectionB/
const buildWorkspaceFixture = (workspaceDir, baseUrl) => {
  writeFixtureFile(
    path.join(workspaceDir, 'workspace.yml'),
    'opencollection: 1.0.0\ninfo:\n  name: "additional-context-roots-workspace"\n  type: workspace\n'
    + 'collections:\n  - name: "collectionA"\n    path: "collections/collectionA"\n'
    + '  - name: "collectionB"\n    path: "collections/collectionB"\nspecs:\ndocs: \'\'\n'
  );

  // signature-utils — a deterministic FNV-1a checksum. Stands in for a
  // crypto/signing helper a real shared script would pull in.
  writeFixtureFile(
    path.join(workspaceDir, 'shared-scripts', 'node_modules', 'signature-utils', 'index.js'),
    'function computeChecksum(input) {\n'
    + '  let hash = 0x811c9dc5;\n'
    + '  for (let i = 0; i < input.length; i++) {\n'
    + '    hash = ((hash ^ input.charCodeAt(i)) * 0x01000193) >>> 0;\n'
    + '  }\n'
    + '  return hash.toString(16).padStart(8, "0");\n'
    + '}\n'
    + 'module.exports = { computeChecksum };\n'
  );

  writeFixtureFile(
    path.join(workspaceDir, 'shared-scripts', 'utils.js'),
    'const { computeChecksum } = require("signature-utils");\n'
    + 'function generateAuthToken({ apiKey, timestamp }) {\n'
    + '  return `${apiKey}.${timestamp}.${computeChecksum(`${apiKey}:${timestamp}`)}`;\n'
    + '}\n'
    + 'function formatDate(input) {\n'
    + '  return new Date(input).toISOString().slice(0, 10);\n'
    + '}\n'
    + 'module.exports = { generateAuthToken, formatDate };\n'
  );

  // Walk-up target: signature-utils sits two dirs above this file.
  writeFixtureFile(
    path.join(workspaceDir, 'shared-scripts', 'deep', 'nested', 'nested-helper.js'),
    'const { computeChecksum } = require("signature-utils");\n'
    + 'function buildRequestId(endpoint, method = "GET") {\n'
    + '  const slug = endpoint.replace(/[^a-z0-9]/gi, "_");\n'
    + '  return `${method}_${slug}_${computeChecksum(`${method} ${endpoint}`)}`;\n'
    + '}\n'
    + 'module.exports = { buildRequestId };\n'
  );

  // Ancestor node_modules at the workspace root — NOT in additionalContextRoots.
  // Must be unreachable from any script.
  writeFixtureFile(
    path.join(workspaceDir, 'node_modules', 'forbidden-lib', 'index.js'),
    'module.exports = { forbidden: true };\n'
  );

  const collectionBruJson = JSON.stringify({
    version: '1',
    name: 'collectionA',
    type: 'collection',
    scripts: {
      additionalContextRoots: ['../../shared-scripts']
    }
  }, null, 2) + '\n';

  // Both collections point at the same shared-scripts root.
  for (const name of ['collectionA', 'collectionB']) {
    const collDir = path.join(workspaceDir, 'collections', name);
    writeFixtureFile(
      path.join(collDir, 'bruno.json'),
      collectionBruJson.replace('"name": "collectionA"', `"name": "${name}"`)
    );
    writeFixtureFile(
      path.join(collDir, 'collection.bru'),
      `meta {\n  name: ${name}\n  seq: 1\n}\n`
    );
    writeFixtureFile(
      path.join(collDir, 'environments', 'Test.bru'),
      `vars {\n  host: ${baseUrl}\n}\n`
    );
  }

  // Happy path: pre-request → shared utils.js → signature-utils. Test proves
  // both generateAuthToken (needs the npm package) and formatDate (doesn't)
  // are reachable through the shared module.
  const happyPathBru = `meta {
  name: happy-path
  type: http
  seq: 1
}

get {
  url: {{host}}/ping
  body: none
  auth: none
}

script:pre-request {
  const { generateAuthToken, formatDate } = require('../../shared-scripts/utils');
  bru.setVar('authToken', generateAuthToken({ apiKey: 'test-api-key', timestamp: 1700000000 }));
  bru.setVar('startDate', formatDate('2024-06-15T12:00:00Z'));
}

tests {
  test('shared utils.js resolves signature-utils via additionalContextRoots', function() {
    expect(bru.getVar('authToken')).to.match(/^test-api-key\\.1700000000\\.[0-9a-f]{8}$/);
    expect(bru.getVar('startDate')).to.equal('2024-06-15');
  });
}
`;

  // Walk-up: nested-helper lives two dirs below the shared root; its require
  // must traverse deep/nested → deep → shared-scripts/node_modules.
  const nestedWalkupBru = `meta {
  name: nested-walkup
  type: http
  seq: 2
}

get {
  url: {{host}}/ping
  body: none
  auth: none
}

script:pre-request {
  const { buildRequestId } = require('../../shared-scripts/deep/nested/nested-helper');
  bru.setVar('requestId', buildRequestId('/api/v1/users', 'POST'));
}

tests {
  test('nested shared util resolves signature-utils via walk-up', function() {
    expect(bru.getVar('requestId')).to.match(/^POST__api_v1_users_[0-9a-f]{8}$/);
  });
}
`;

  // Negative: require('forbidden-lib') must throw. Runs inside the tests block
  // so a throw doesn't abort before the assertion runs.
  const forbiddenBru = `meta {
  name: forbidden
  type: http
  seq: 3
}

get {
  url: {{host}}/ping
  body: none
  auth: none
}

tests {
  test('ancestor node_modules is NOT resolvable via require', function() {
    let threw = false;
    try {
      require('forbidden-lib');
    } catch (e) {
      threw = true;
    }
    expect(threw).to.equal(true);
  });
}
`;

  const collAPath = path.join(workspaceDir, 'collections', 'collectionA');
  writeFixtureFile(path.join(collAPath, 'happy-path.bru'), happyPathBru);
  writeFixtureFile(path.join(collAPath, 'nested-walkup.bru'), nestedWalkupBru);
  writeFixtureFile(path.join(collAPath, 'forbidden.bru'), forbiddenBru);

  const collBPath = path.join(workspaceDir, 'collections', 'collectionB');
  writeFixtureFile(path.join(collBPath, 'happy-path.bru'), happyPathBru);
};

describe('CLI run — additionalContextRoots npm module resolution', () => {
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
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'bru-cli-acr-'));
    buildWorkspaceFixture(tmpDir, baseUrl);
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  // spawnSync starves the in-process HTTP server → ECONNREFUSED. Use async spawn.
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

  const runOrFail = async (args, cwd) => {
    const result = await runCli(args, cwd);
    if (result.code !== 0) {
      throw new Error(
        `CLI exited with code ${result.code}.\n--- stdout ---\n${result.stdout}\n--- stderr ---\n${result.stderr}`
      );
    }
    return result;
  };

  it('resolves an npm module from shared-scripts/node_modules when required via additionalContextRoots', async () => {
    const collDir = path.join(tmpDir, 'collections', 'collectionA');
    const result = await runOrFail(
      ['run', 'happy-path.bru', '--env', 'Test', '--sandbox', 'developer', '--noproxy'],
      collDir
    );
    expect(result.stdout).toMatch(/shared utils\.js resolves signature-utils via additionalContextRoots/);
    expect(result.stdout).not.toMatch(/failed/i);
  }, 60_000);

  it('walks up from a nested shared script to find its npm dependency', async () => {
    const collDir = path.join(tmpDir, 'collections', 'collectionA');
    const result = await runOrFail(
      ['run', 'nested-walkup.bru', '--env', 'Test', '--sandbox', 'developer', '--noproxy'],
      collDir
    );
    expect(result.stdout).toMatch(/nested shared util resolves signature-utils via walk-up/);
    expect(result.stdout).not.toMatch(/failed/i);
  }, 60_000);

  it('does not leak npm resolution to an ancestor node_modules outside additionalContextRoots', async () => {
    const collDir = path.join(tmpDir, 'collections', 'collectionA');
    const result = await runOrFail(
      ['run', 'forbidden.bru', '--env', 'Test', '--sandbox', 'developer', '--noproxy'],
      collDir
    );
    expect(result.stdout).toMatch(/ancestor node_modules is NOT resolvable via require/);
    expect(result.stdout).not.toMatch(/failed/i);
  }, 60_000);

  it('resolves the shared package from a second collection in the same workspace', async () => {
    const collDir = path.join(tmpDir, 'collections', 'collectionB');
    const result = await runOrFail(
      ['run', 'happy-path.bru', '--env', 'Test', '--sandbox', 'developer', '--noproxy'],
      collDir
    );
    expect(result.stdout).toMatch(/shared utils\.js resolves signature-utils via additionalContextRoots/);
    expect(result.stdout).not.toMatch(/failed/i);
  }, 60_000);
});
