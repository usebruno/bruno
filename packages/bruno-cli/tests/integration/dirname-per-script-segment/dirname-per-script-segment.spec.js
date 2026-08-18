const { describe, it, expect, beforeAll, afterAll, afterEach } = require('@jest/globals');
const fs = require('fs');
const path = require('path');
const http = require('http');
const { runCli } = require('../helpers/run-cli');
const { createCollectionFixture } = require('../helpers/collection-fixture');

const FIXTURE_DIR = path.join(__dirname, 'fixtures', 'dirname-filename-cli');

describe('CLI run — __dirname/__filename are bound per script segment (node-vm)', () => {
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
      fs.rmSync(workDir, { recursive: true, force: true });
      workDir = null;
    }
  });

  it('collection, folder, and request scripts each see their own __dirname/__filename', async () => {
    workDir = createCollectionFixture(FIXTURE_DIR);
    const result = await runCli(
      [
        'run', 'subfolder/dirname-request.yml',
        '--env', 'Test',
        '--env-var', `host=${baseUrl}`,
        '--sandbox', 'developer',
        '--noproxy'
      ],
      workDir
    );

    if (result.code !== 0) {
      throw new Error(
        `CLI exited with code ${result.code}.\n--- stdout ---\n${result.stdout}\n--- stderr ---\n${result.stderr}`
      );
    }

    const subfolderPath = path.join(workDir, 'subfolder');
    const envContent = fs.readFileSync(path.join(workDir, 'environments', 'Test.yml'), 'utf8');
    expect(envContent).toContain(`value: ${subfolderPath}\n`);
    expect(envContent).toContain(`value: ${path.join(subfolderPath, 'folder.yml')}\n`);
    expect(envContent).toContain(`value: ${path.join(subfolderPath, 'dirname-request.yml')}\n`);

    const collectionContent = fs.readFileSync(path.join(workDir, 'opencollection.yml'), 'utf8');
    expect(collectionContent).toContain(`value: ${workDir}\n`);
    expect(collectionContent).toContain(`value: ${path.join(workDir, 'opencollection.yml')}\n`);
  }, 60_000);
});
