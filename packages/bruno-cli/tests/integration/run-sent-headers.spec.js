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

/** The json reporter writes either a single `{ summary, results }` or an array holding one of
 *  those per iteration. On the array form `report.results` is undefined, so reaching straight
 *  for `report.results[0]` throws instead of failing an assertion. Pick the run first. */
const readReportedHeaders = (dir) => {
  const report = JSON.parse(fs.readFileSync(path.join(dir, 'report.json'), 'utf8'));
  const run = Array.isArray(report) ? report[0] : report;

  return run.results[0].request.headers;
};

/**
 * The transport headers (Host, Connection, Accept-Encoding, ...) only exist once the request is
 * on the wire, so nothing that runs before the axios interceptors can know about them.
 *
 * These cover the whole path end to end: the response interceptor reads them back off the
 * ClientRequest, the runner folds them into `request.headers`, and from there they have to reach
 * both the json reporter and `req.getHeaders()` inside a post-response script.
 */
describe('CLI run — headers the request actually sent', () => {
  let server;
  let receivedHeaders;
  let port;
  let tmpDir;

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

  it('reports every header that reached the server', async () => {
    stageCollection(httpRequest());

    const { code } = await runCli(['run', 'req.bru', '--noproxy', '--reporter-json', 'report.json'], tmpDir);
    expect(code).toBe(0);

    const sent = readReportedHeaders(tmpDir);
    const reported = Object.keys(sent).map((name) => name.toLowerCase());

    expect(Object.keys(receivedHeaders).filter((name) => !reported.includes(name))).toEqual([]);
    expect(sent).toMatchObject({
      'Host': `127.0.0.1:${port}`,
      'Connection': 'keep-alive',
      'Accept-Encoding': 'gzip, compress, deflate, br',
      'User-Agent': expect.stringMatching(/^bruno-runtime\//),
      'my-header-1': 'my-value-1'
    });
  });

  it('leaves a header the user declared untouched', async () => {
    stageCollection(
      httpRequest().replace('  my-header-1: my-value-1', '  my-header-1: my-value-1\n  user-agent: mine/1.0')
    );

    const { code } = await runCli(['run', 'req.bru', '--noproxy', '--reporter-json', 'report.json'], tmpDir);
    expect(code).toBe(0);

    const sent = readReportedHeaders(tmpDir);

    expect(sent['user-agent']).toBe('mine/1.0');
    expect(sent['User-Agent']).toBeUndefined();
  });

  it('hands the same set to a post-response script', async () => {
    stageCollection(
      /** A bru block keyword only parses at column 0. Indented, the whole file fails to parse,
       *  the script never runs, and the run still exits 0, so the only symptom is the stdout match
       *  below coming back null. */
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
