const { describe, it, expect, beforeAll, afterAll, afterEach } = require('@jest/globals');
const fs = require('fs');
const path = require('path');
const http = require('http');
const { runCli } = require('../helpers/run-cli');
const { createCollectionFixture } = require('../helpers/collection-fixture');

const FIXTURE_DIR = path.join(__dirname, 'fixtures', 'dirname-filename-cli');

describe('CLI run: __dirname/__filename are bound per script segment', () => {
  let server;
  let baseUrl;
  let workDir;

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

  afterEach(() => {
    if (workDir) {
      fs.rmSync(workDir, { recursive: true, force: true, maxRetries: 10, retryDelay: 100 });
      workDir = null;
    }
  });

  it.each(['developer', 'safe'])('collection, parent, child, and request scripts each see their own __dirname/__filename (--sandbox %s)', async (sandbox) => {
    workDir = createCollectionFixture(FIXTURE_DIR);
    const result = await runCli(
      [
        'run', 'parent/child/dirname-request.yml',
        '--env', 'Test',
        '--env-var', `host=${baseUrl}`,
        '--sandbox', sandbox,
        '--noproxy'
      ],
      workDir
    );

    if (result.code !== 0) {
      throw new Error(
        `CLI exited with code ${result.code}.\n--- stdout ---\n${result.stdout}\n--- stderr ---\n${result.stderr}`
      );
    }

    const parentPath = path.join(workDir, 'parent');
    const childPath = path.join(parentPath, 'child');
    const envContent = fs.readFileSync(path.join(workDir, 'environments', 'Test.yml'), 'utf8').replace(/\r\n/g, '\n');
    expect(envContent).toContain(`value: ${parentPath}\n`);
    expect(envContent).toContain(`value: ${path.join(parentPath, 'folder.yml')}\n`);
    expect(envContent).toContain(`value: ${childPath}\n`);
    expect(envContent).toContain(`value: ${path.join(childPath, 'folder.yml')}\n`);
    expect(envContent).toContain(`value: ${path.join(childPath, 'dirname-request.yml')}\n`);

    const collectionContent = fs.readFileSync(path.join(workDir, 'opencollection.yml'), 'utf8').replace(/\r\n/g, '\n');
    expect(collectionContent).toContain(`value: ${workDir}\n`);
    expect(collectionContent).toContain(`value: ${path.join(workDir, 'opencollection.yml')}\n`);

    if (sandbox === 'developer') {
      expect(envContent).toContain('value: hello\n');
    } else {
      expect(envContent).not.toContain('value: hello\n');
    }
  }, 60_000);
});
