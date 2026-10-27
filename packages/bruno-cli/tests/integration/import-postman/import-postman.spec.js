const { describe, it, expect, beforeAll, afterAll, beforeEach, afterEach } = require('@jest/globals');
const fs = require('fs');
const path = require('path');
const http = require('http');
const { runCli } = require('../helpers/run-cli');
const { createTmpDir, removeTmpDir } = require('../helpers/tmp-dir');

// An import followed by a run spawns two node processes, which outruns jest's 5s default on a
// loaded CI box.
const RUN_TIMEOUT = 60000;

const FIXTURES_DIR = path.join(__dirname, 'fixtures');
const COLLECTION_FIXTURE = path.join(FIXTURES_DIR, 'runnable.postman_collection.json');
const ENVIRONMENT_FIXTURE = path.join(FIXTURES_DIR, 'staging.postman_environment.json');

describe('CLI import postman — imported collections run with bru run', () => {
  let server;
  let baseUrl;
  let receivedRequests;
  let workDir;

  beforeAll(async () => {
    server = http.createServer((req, res) => {
      receivedRequests.push({ url: req.url, headers: req.headers });
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ ok: true }));
    });
    await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
    baseUrl = `http://127.0.0.1:${server.address().port}`;
  });

  afterAll(async () => {
    await new Promise((resolve) => server.close(resolve));
  });

  beforeEach(() => {
    // The spawned CLI resolves the collection from process.cwd(), which the OS returns with
    // symlinks (macOS tmpdir) resolved, so paths compared against it must be resolved too.
    workDir = fs.realpathSync.native(createTmpDir('import-postman'));
    receivedRequests = [];
  });

  afterEach(() => {
    removeTmpDir(workDir);
    workDir = null;
  });

  // The server port is only known at run time, so the environment export is staged with it.
  const stageEnvironment = () => {
    const environment = JSON.parse(fs.readFileSync(ENVIRONMENT_FIXTURE, 'utf8'));
    environment.values.find((variable) => variable.key === 'baseUrl').value = baseUrl;
    const environmentPath = path.join(workDir, 'staging.postman_environment.json');
    fs.writeFileSync(environmentPath, JSON.stringify(environment, null, 2));
    return environmentPath;
  };

  const runCollection = (collectionDir) => runCli(['run', '--env', 'staging', '--noproxy'], collectionDir);

  const expectEveryRequestServed = () => {
    expect(receivedRequests.map((request) => request.url).sort()).toEqual(['/health', '/users/profile']);
    const profileRequest = receivedRequests.find((request) => request.url === '/users/profile');
    expect(profileRequest.headers['x-token']).toBe('from-pre-request');
  };

  it('writes the collection and its --environment, and the run passes', async () => {
    const collectionDir = path.join(workDir, 'collection');

    const importResult = await runCli([
      'import', 'postman',
      '--source', COLLECTION_FIXTURE,
      '--output', collectionDir,
      '--environment', stageEnvironment()
    ], workDir);

    expect(importResult.code).toBe(0);
    [
      'opencollection.yml',
      'Health.yml',
      path.join('Users', 'folder.yml'),
      path.join('Users', 'Get Profile.yml'),
      path.join('environments', 'staging.yml')
    ].forEach((file) => {
      expect(fs.existsSync(path.join(collectionDir, file))).toBe(true);
    });

    const runResult = await runCollection(collectionDir);

    expect(runResult.code).toBe(0);
    expectEveryRequestServed();
  }, RUN_TIMEOUT);

  it('adds a postman-env environment to an imported collection, and the run passes', async () => {
    const collectionDir = path.join(workDir, 'collection');
    const collectionImport = await runCli(['import', 'postman', '--source', COLLECTION_FIXTURE, '--output', collectionDir], workDir);
    expect(collectionImport.code).toBe(0);

    const environmentImport = await runCli(['import', 'postman-env', '--source', stageEnvironment(), '--output', collectionDir], workDir);

    expect(environmentImport.code).toBe(0);
    expect(fs.readdirSync(path.join(collectionDir, 'environments'))).toEqual(['staging.yml']);

    const runResult = await runCollection(collectionDir);

    expect(runResult.code).toBe(0);
    expectEveryRequestServed();
  }, RUN_TIMEOUT);

  it.each(['bru', 'opencollection'])('rejects postman with --collection-format %s, writing nothing', async (collectionFormat) => {
    const collectionDir = path.join(workDir, 'collection');

    const { code, stderr } = await runCli([
      'import', 'postman',
      '--source', COLLECTION_FIXTURE,
      '--output', collectionDir,
      '--collection-format', collectionFormat
    ], workDir);

    expect(code).not.toBe(0);
    expect(stderr).toContain('--collection-format is not supported for postman');
    expect(fs.existsSync(collectionDir)).toBe(false);
  }, RUN_TIMEOUT);

  it('rejects postman-env with --collection-format', async () => {
    const collectionDir = path.join(workDir, 'collection');
    const collectionImport = await runCli(['import', 'postman', '--source', COLLECTION_FIXTURE, '--output', collectionDir], workDir);
    expect(collectionImport.code).toBe(0);

    const { code, stderr } = await runCli([
      'import', 'postman-env',
      '--source', stageEnvironment(),
      '--output', collectionDir,
      '--collection-format', 'opencollection'
    ], workDir);

    expect(code).not.toBe(0);
    expect(stderr).toContain('--collection-format is not supported for postman-env');
    expect(fs.existsSync(path.join(collectionDir, 'environments'))).toBe(false);
  }, RUN_TIMEOUT);

  it('rejects postman-env when --output is a bru collection', async () => {
    const bruCollectionDir = path.join(workDir, 'bru-collection');
    fs.mkdirSync(bruCollectionDir);
    fs.writeFileSync(path.join(bruCollectionDir, 'bruno.json'), JSON.stringify({ version: '1', name: 'bru', type: 'collection' }));

    const { code, stderr } = await runCli(['import', 'postman-env', '--source', stageEnvironment(), '--output', bruCollectionDir], workDir);

    expect(code).not.toBe(0);
    expect(stderr).toContain('postman-env supports only OpenCollection (yml) collections');
    expect(fs.existsSync(path.join(bruCollectionDir, 'environments'))).toBe(false);
  }, RUN_TIMEOUT);

  it('rejects postman-env when --output is not a Bruno collection', async () => {
    const notACollectionDir = path.join(workDir, 'not-a-collection');
    fs.mkdirSync(notACollectionDir);

    const { code } = await runCli(['import', 'postman-env', '--source', stageEnvironment(), '--output', notACollectionDir], workDir);

    expect(code).not.toBe(0);
    expect(fs.existsSync(path.join(notACollectionDir, 'environments'))).toBe(false);
  }, RUN_TIMEOUT);

  it('still writes the collection when an item is skipped, and exits 1', async () => {
    const collection = JSON.parse(fs.readFileSync(COLLECTION_FIXTURE, 'utf8'));
    delete collection.item.find((item) => item.name === 'Health').request.method;
    const sourcePath = path.join(workDir, 'with-skipped-item.postman_collection.json');
    fs.writeFileSync(sourcePath, JSON.stringify(collection, null, 2));
    const collectionDir = path.join(workDir, 'collection');

    const { code } = await runCli(['import', 'postman', '--source', sourcePath, '--output', collectionDir], workDir);

    expect(code).toBe(1);
    expect(fs.existsSync(path.join(collectionDir, 'opencollection.yml'))).toBe(true);
    expect(fs.existsSync(path.join(collectionDir, 'Users', 'Get Profile.yml'))).toBe(true);
    expect(fs.existsSync(path.join(collectionDir, 'Health.yml'))).toBe(false);
  }, RUN_TIMEOUT);
});
