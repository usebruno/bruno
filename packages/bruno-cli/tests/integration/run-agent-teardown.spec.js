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
 * Without `--cache-ssl-session` every request gets its own keep-alive agent. Once the
 * response is in, that agent parks its socket in its free pool and is never used again,
 * so nothing closes the socket: a run used to hold one open connection per executed
 * request until the process exited (2,000 requests -> 2,000 fds). The runner now tears
 * throwaway agents down as soon as the response completes, so the server never sees
 * more than the connection of the request in flight.
 */
describe('CLI run — throwaway agents are torn down after each request', () => {
  const REQUEST_COUNT = 6;
  let server;
  let openSockets;
  let openAtRequest;
  let port;
  let tmpDir;

  beforeAll(async () => {
    openSockets = new Set();
    openAtRequest = [];
    server = http.createServer((req, res) => {
      openAtRequest.push(openSockets.size);
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ ok: true }));
    });
    server.on('connection', (socket) => {
      openSockets.add(socket);
      socket.on('close', () => openSockets.delete(socket));
    });
    await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
    port = server.address().port;
  });

  afterAll(async () => {
    for (const socket of openSockets) {
      socket.destroy();
    }
    await new Promise((resolve) => server.close(resolve));
  });

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'bru-cli-agent-teardown-'));
    openAtRequest.length = 0;
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  const stageCollection = () => {
    writeFixtureFile(
      path.join(tmpDir, 'bruno.json'),
      JSON.stringify({ version: '1', name: 'agent-teardown', type: 'collection' }, null, 2) + '\n'
    );
    writeFixtureFile(path.join(tmpDir, 'collection.bru'), 'meta {\n  name: agent-teardown\n  seq: 1\n}\n');
    for (let i = 1; i <= REQUEST_COUNT; i++) {
      writeFixtureFile(
        path.join(tmpDir, `req-${i}.bru`),
        `meta {
  name: req-${i}
  type: http
  seq: ${i}
}

get {
  url: http://127.0.0.1:${port}/ping/${i}
  body: none
  auth: none
}
`
      );
    }
  };

  it('closes each request\'s connection before the next request is sent', async () => {
    stageCollection();

    const { code } = await runCli(['run', '--noproxy'], tmpDir);
    expect(code).toBe(0);

    expect(openAtRequest).toHaveLength(REQUEST_COUNT);
    // Only the in-flight connection may be open; one extra is tolerated for the
    // previous socket's FIN still being in transit when the next request lands.
    expect(Math.max(...openAtRequest)).toBeLessThanOrEqual(2);
  });
});
