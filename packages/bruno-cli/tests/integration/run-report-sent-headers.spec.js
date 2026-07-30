const { describe, it, expect, beforeAll, afterAll, beforeEach, afterEach } = require('@jest/globals');
const fs = require('fs');
const os = require('os');
const path = require('path');
const http = require('http');
const { runCli } = require('./helpers/run-cli');

/**
 * --reporter-json's `request.headers` is a published contract: users diff these reports between runs
 * and feed them to other tooling. It has to describe the request that was actually sent — including
 * the transport headers only the adapter knows about — while staying stable across identical runs.
 */
describe('CLI run - reported request headers come from the wire', () => {
  let server;
  let baseUrl;
  let tmpDir;

  beforeAll(async () => {
    server = http.createServer((req, res) => {
      const status = req.url === '/missing' ? 404 : 200;
      res.writeHead(status, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ ok: status === 200 }));
    });
    await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
    baseUrl = `http://127.0.0.1:${server.address().port}`;
  });

  afterAll(async () => {
    await new Promise((resolve) => server.close(resolve));
  });

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'bru-cli-sent-headers-'));
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  const writeFixtureFile = (filePath, content) => {
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    fs.writeFileSync(filePath, content);
  };

  const seedCollection = (url) => {
    writeFixtureFile(
      path.join(tmpDir, 'bruno.json'),
      JSON.stringify({ version: '1', name: 'sent-headers-cli', type: 'collection' }, null, 2) + '\n'
    );
    writeFixtureFile(path.join(tmpDir, 'collection.bru'), 'meta {\n  name: sent-headers-cli\n  seq: 1\n}\n');
    writeFixtureFile(
      path.join(tmpDir, 'ping.bru'),
      `meta {\n  name: ping\n  type: http\n  seq: 1\n}\n\nget {\n  url: ${url}\n  body: none\n  auth: none\n}\n\nheaders {\n  x-request-header: from-definition\n}\n`
    );
  };

  // The reported request headers of the single run entry, keyed lowercase.
  const reportedRequestHeaders = () => {
    const report = JSON.parse(fs.readFileSync(path.join(tmpDir, 'report.json'), 'utf8'));
    const results = Array.isArray(report) ? report[0].results : report.results;
    const headers = results[0].request.headers;
    return Object.fromEntries(Object.entries(headers).map(([name, value]) => [name.toLowerCase(), value]));
  };

  const runReport = async () => {
    const result = await runCli(
      ['run', 'ping.bru', '--reporter-json', 'report.json', '--sandbox', 'developer', '--noproxy'],
      tmpDir
    );
    if (!fs.existsSync(path.join(tmpDir, 'report.json'))) {
      throw new Error(
        `No report written (exit ${result.code}).\n--- stdout ---\n${result.stdout}\n--- stderr ---\n${result.stderr}`
      );
    }
    return result;
  };

  it('reports the transport headers, and omits the internal timing header', async () => {
    seedCollection(`${baseUrl}/ping`);

    await runReport();
    const headers = reportedRequestHeaders();

    // Host/connection/accept-encoding are added while serializing, so they prove the report is built
    // from the wire headers rather than the request definition.
    expect(Object.keys(headers)).toEqual(expect.arrayContaining(['host', 'connection', 'accept-encoding']));
    expect(headers['host']).toBe(new URL(baseUrl).host);
    // The definition header still survives alongside them.
    expect(headers['x-request-header']).toBe('from-definition');
    // Reporting a raw epoch value would make two identical runs produce different reports.
    expect(Object.keys(headers)).not.toContain('request-start-time');
  }, 60_000);

  it('reports them for a failing status too', async () => {
    seedCollection(`${baseUrl}/missing`);

    await runReport();
    const headers = reportedRequestHeaders();

    // A 4xx rejects in axios and is promoted back to a response, a separate path from the 200 case.
    expect(Object.keys(headers)).toEqual(expect.arrayContaining(['host', 'connection', 'accept-encoding']));
    expect(Object.keys(headers)).not.toContain('request-start-time');
  }, 60_000);

  it('reports the headers it was about to send when the connection fails', async () => {
    // Nothing is listening on port 1, so the request never gets a response.
    seedCollection('http://127.0.0.1:1/nope');

    await runReport();
    const headers = reportedRequestHeaders();

    // Node serializes the header block when the ClientRequest is built, before it connects, so even a
    // failed send reports the real headers instead of falling back to the definition.
    expect(Object.keys(headers)).toEqual(expect.arrayContaining(['host', 'connection']));
    expect(headers['x-request-header']).toBe('from-definition');
    expect(Object.keys(headers)).not.toContain('request-start-time');
  }, 60_000);
});
