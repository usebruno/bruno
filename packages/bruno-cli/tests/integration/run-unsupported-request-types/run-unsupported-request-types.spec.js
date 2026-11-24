const { describe, it, expect, beforeAll, afterAll, beforeEach, afterEach } = require('@jest/globals');
const path = require('path');
const http = require('http');
const { runCollection } = require('../helpers/environments');
const { stripAnsi } = require('../helpers/strip-ansi');
const { copyFixtureToTmpDir, removeTmpDir } = require('../helpers/tmp-dir');

// A CLI run spawns a fresh node process, which outruns jest's 5s default on a loaded CI box.
const RUN_TIMEOUT = 60000;

const UNSUPPORTED_REQUESTS_MESSAGE = 'WebSocket and gRPC requests are not supported in CLI';

// The fixture collection holds one request of each type:
//
//   http-request.yml          -> GET  {{host}}/http
//   graphql-request.yml       -> POST {{host}}/graphql
//   realtime/
//     grpc-request.yml        -> ignored by the runner
//     ws-request.yml          -> ignored by the runner

describe('CLI run — gRPC and WebSocket requests are ignored', () => {
  const fixtureDir = path.join(__dirname, 'fixtures', 'collection');

  let server;
  let baseUrl;
  let workDir;
  // Every URL the server received, so a test can tell which requests were really sent.
  let requestedUrls;

  beforeAll(async () => {
    server = http.createServer((req, res) => {
      requestedUrls.push(req.url);
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
    requestedUrls = [];
    workDir = copyFixtureToTmpDir(fixtureDir, 'unsupported-request-types');
  });

  afterEach(() => {
    removeTmpDir(workDir);
  });

  const run = async (...args) => {
    const { stdout } = await runCollection(workDir, ['run', ...args, '--env-var', `host=${baseUrl}`]);
    return stripAnsi(stdout);
  };

  it('runs the whole collection with all types of requests', async () => {
    const output = await run();

    expect(requestedUrls.sort()).toEqual(['/graphql', '/http']);
    expect(output).toContain(`Ignored 2 requests. ${UNSUPPORTED_REQUESTS_MESSAGE}`);
  }, RUN_TIMEOUT);

  it('says "1 request" when a single request is ignored', async () => {
    const output = await run('http-request.yml', 'realtime/grpc-request.yml');

    expect(requestedUrls).toEqual(['/http']);
    expect(output).toContain(`Ignored 1 request. ${UNSUPPORTED_REQUESTS_MESSAGE}`);
  }, RUN_TIMEOUT);

  it('prints no ignored notice when every request is supported', async () => {
    const output = await run('http-request.yml', 'graphql-request.yml');

    expect(requestedUrls.sort()).toEqual(['/graphql', '/http']);
    expect(output).not.toContain(UNSUPPORTED_REQUESTS_MESSAGE);
  }, RUN_TIMEOUT);

  it('prints only the unsupported message when the run holds nothing but gRPC and WebSocket requests', async () => {
    const output = await run('realtime', '-r');

    expect(requestedUrls).toEqual([]);
    expect(output).toContain(UNSUPPORTED_REQUESTS_MESSAGE);
    expect(output).not.toContain('Execution Summary');
    expect(output).not.toContain('Ran all requests');
  }, RUN_TIMEOUT);

  it('prints "No requests found" when nothing was run and nothing was ignored', async () => {
    const output = await run('http-request.yml', '--tags', 'no-such-tag');

    expect(requestedUrls).toEqual([]);
    expect(output).toContain('No requests found');
    expect(output).not.toContain(UNSUPPORTED_REQUESTS_MESSAGE);
  }, RUN_TIMEOUT);
});
