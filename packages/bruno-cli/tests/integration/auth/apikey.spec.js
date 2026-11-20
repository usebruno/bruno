const { describe, it, expect, beforeAll, afterAll } = require('@jest/globals');
const fs = require('fs');
const os = require('os');
const path = require('path');
const http = require('http');
const { runCli } = require('../helpers/run-cli');

describe('CLI API key query parameters', () => {
  let server;
  let port;
  let receivedUrl;

  beforeAll(async () => {
    server = http.createServer((req, res) => {
      receivedUrl = req.url;
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ ok: true }));
    });
    await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
    port = server.address().port;
  });

  afterAll(async () => {
    await new Promise((resolve) => server.close(resolve));
  });

  it('interpolates the URL and API key while preserving the auth mode', async () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'bru-apikey-'));
    try {
      const fixture = path.resolve(__dirname, '../../../../../tests/auth/apikey/fixtures/collections/apikey-auth-mode-test');
      fs.cpSync(fixture, dir, { recursive: true });
      const requestPath = path.join(dir, 'dynamic-query-key.bru');
      const request = fs.readFileSync(requestPath, 'utf8')
        .replace('http://localhost:8081/ping', '{{baseUrl}}/ping')
        .replace('  api_key_query_name: api_key', `  baseUrl: http://127.0.0.1:${port}\n  api_key_query_name: api_key`);
      fs.writeFileSync(requestPath, request);

      const { code, stdout, stderr } = await runCli(['run', 'dynamic-query-key.bru', '--noproxy'], dir);
      expect({ code, stdout, stderr }).toEqual(expect.objectContaining({ code: 0 }));
      expect(receivedUrl).toBe('/ping?api_key=secret-key-value');
    } finally {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });
});
