const { describe, it, expect, beforeAll, afterAll, beforeEach, afterEach } = require('@jest/globals');
const fs = require('fs');
const os = require('os');
const path = require('path');
const http = require('http');
const { runCli } = require('./helpers/run-cli');

const writeFixtureFile = (filePath, content) => {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, content);
};

/**
 * The json reporter on OSS codebase writes a single `{ summary, results }` object.
 * While the Enterprise Edition writes an array holding one of those per iteration.
 * This is causing the tests to fail when running on Enterprise Edition.
 *
 * Below is a short term helper that supports both formats so the tests work across OSS and EE.
 * TODO: Update the OSS codebase to write the array format.
 */
const getRequestHeadersFromReport = (dir) => {
  const report = JSON.parse(fs.readFileSync(path.join(dir, 'report.json'), 'utf8'));
  const iterationReport = Array.isArray(report) ? report[0] : report;

  return iterationReport.results[0].request.headers;
};

describe('CLI run — request headers (user-defined and transport headers)', () => {
  let server;
  let receivedHeaders;
  let port;
  let tmpDir;

  // This is a simple http server setup that updates the receivedHeaders local variable with the request headers.
  // We then use this in the tests to ensure the request headers are passed through to the server.
  beforeAll(async () => {
    server = http.createServer((req, res) => {
      receivedHeaders = req.headers;
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ ok: true }));
    });
    await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
    port = server.address().port;
  });

  afterAll(async () => {
    await new Promise((resolve) => server.close(resolve));
  });

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'bru-cli-sent-headers-'));
    receivedHeaders = undefined;
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  const stageCollection = (requestBody) => {
    writeFixtureFile(
      path.join(tmpDir, 'bruno.json'),
      JSON.stringify({ version: '1', name: 'sent-headers', type: 'collection' }, null, 2) + '\n'
    );
    writeFixtureFile(path.join(tmpDir, 'collection.bru'), 'meta {\n  name: sent-headers\n  seq: 1\n}\n');
    writeFixtureFile(path.join(tmpDir, 'req.bru'), requestBody);
  };

  const httpRequest = (extra = '') => `meta {
  name: req
  type: http
  seq: 1
}

get {
  url: http://127.0.0.1:${port}/ping
  body: none
  auth: none
}

headers {
  my-header-1: my-value-1
}
${extra}`;

  // Verify that every request header has been received by the server.
  // Also verify that transport headers are sent (Host, Connection, Accept-Encoding, User-Agent).
  it('should send all request headers to server along with transport headers', async () => {
    stageCollection(httpRequest());

    const { code } = await runCli(['run', 'req.bru', '--noproxy', '--reporter-json', 'report.json'], tmpDir);
    expect(code).toBe(0);

    const requestHeaders = getRequestHeadersFromReport(tmpDir);
    const requestHeaderNames = Object.keys(requestHeaders).map((name) => name.toLowerCase());

    expect(Object.keys(receivedHeaders).filter((name) => !requestHeaderNames.includes(name))).toEqual([]);
    expect(requestHeaders).toMatchObject({
      'Host': `127.0.0.1:${port}`,
      'Connection': 'keep-alive',
      'Accept-Encoding': 'gzip, compress, deflate, br',
      'User-Agent': expect.stringMatching(/^bruno-runtime\//),
      'my-header-1': 'my-value-1'
    });
  });

  it('should not add a default transport header if the user has already declared the same header', async () => {
    stageCollection(
      httpRequest().replace('  my-header-1: my-value-1', '  my-header-1: my-value-1\n  user-agent: mine/1.0')
    );

    const { code } = await runCli(['run', 'req.bru', '--noproxy', '--reporter-json', 'report.json'], tmpDir);
    expect(code).toBe(0);

    const requestHeaders = getRequestHeadersFromReport(tmpDir);

    expect(requestHeaders['user-agent']).toBe('mine/1.0');
    expect(requestHeaders['User-Agent']).toBeUndefined();
  });

  it('includes transport headers in req.getHeaders() within post-response scripts', async () => {
    stageCollection(
      httpRequest(`
script:post-response {
  console.log('SENT_HEADERS ' + JSON.stringify(Object.keys(req.getHeaders()).sort()));
}
`)
    );

    const { code, stdout } = await runCli(['run', 'req.bru', '--noproxy'], tmpDir);
    expect(code).toBe(0);

    const logged = JSON.parse(stdout.match(/SENT_HEADERS (\[.*\])/)[1]);
    expect(logged).toEqual(expect.arrayContaining(['Host', 'Connection', 'Accept-Encoding', 'User-Agent']));
  });
});
