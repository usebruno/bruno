const { describe, it, expect, beforeAll, afterAll } = require('@jest/globals');
const fs = require('fs');
const os = require('os');
const path = require('path');
const http = require('http');
const crypto = require('crypto');
const { runCli } = require('./helpers/run-cli');

const writeFixtureFile = (filePath, content) => {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, content);
};

describe('CLI run — quickjs safe mode trap containment', () => {
  let server;
  let baseUrl;
  let tmpDir;

  beforeAll(async () => {
    server = http.createServer((req, res) => {
      const payload = crypto.randomBytes(135000).toString('base64');
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ status: 'ok', payload }));
    });
    await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
    const { port } = server.address();
    baseUrl = `http://127.0.0.1:${port}`;

    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'bruno-quickjs-trap-'));
    writeFixtureFile(
      path.join(tmpDir, 'bruno.json'),
      JSON.stringify({ version: '1', name: 'quickjs-trap-containment', type: 'collection', ignore: [] })
    );
    writeFixtureFile(
      path.join(tmpDir, 'opencollection.yml'),
      'opencollection: "1.0.0"\ninfo:\n  name: quickjs-trap-containment\n'
    );
    writeFixtureFile(
      path.join(tmpDir, '01-join-large-payloads.yml'),
      `info:
  name: 01-join-large-payloads
  type: http
  seq: 1

http:
  method: GET
  url: ${baseUrl}/first

runtime:
  scripts:
    - type: after-response
      code: |-
        const chunks = [];
        for (let i = 0; i < 60; i++) {
          const r = await bru.sendRequest({ url: '${baseUrl}/chunk/' + i, method: 'GET' });
          chunks.push(r.data.payload);
        }
        bru.setVar('joinedLength', chunks.join('').length);
    - type: tests
      code: |-
        test('all payloads fetched and combined', function() {
          expect(res.getStatus()).to.equal(200);
          expect(bru.getVar('joinedLength')).to.be.above(8000000);
        });
`
    );
    writeFixtureFile(
      path.join(tmpDir, '02-post-trap-health.yml'),
      `info:
  name: 02-post-trap-health
  type: http
  seq: 2

http:
  method: GET
  url: ${baseUrl}/first

runtime:
  scripts:
    - type: after-response
      code: bru.setVar('afterTrap', 'healthy');
    - type: tests
      code: |-
        test('runs cleanly on the replacement engine', function() {
          expect(res.getStatus()).to.equal(200);
          expect(bru.getVar('afterTrap')).to.equal('healthy');
          expect(bru.getVar('joinedLength')).to.be.above(8000000);
        });
`
    );
    writeFixtureFile(
      path.join(tmpDir, '03-sync-vars.yml'),
      `info:
  name: 03-sync-vars
  type: http
  seq: 3

http:
  method: GET
  url: ${baseUrl}/first

runtime:
  scripts:
    - type: tests
      code: |-
        test('sync vars expression starting async work does not crash the run', function() {
          expect(res.getStatus()).to.equal(200);
        });
  actions:
    - type: set-variable
      phase: after-response
      selector:
        expression: Promise.resolve().then(() => bru.sleep(5))
        method: jsonq
      variable:
        name: drainBorn
        scope: runtime
`
    );
    writeFixtureFile(
      path.join(tmpDir, '04-async-test-callback.yml'),
      `info:
  name: 04-async-test-callback
  type: http
  seq: 4

http:
  method: GET
  url: ${baseUrl}/first

runtime:
  scripts:
    - type: tests
      code: |-
        test('async test with awaited host work passes', async () => {
          const val = await new Promise((resolve) => {
            setTimeout(() => {
              resolve('expected');
            }, 120);
          });
          expect(val).to.equal('expected');
          bru.setVar('asyncTestRan', 'yes');
        });
`
    );
    writeFixtureFile(
      path.join(tmpDir, '05-async-test-completed.yml'),
      `info:
  name: 05-async-test-completed
  type: http
  seq: 5

http:
  method: GET
  url: ${baseUrl}/first

runtime:
  scripts:
    - type: tests
      code: |-
        test('the awaited test callback finished before its run returned', function() {
          expect(bru.getVar('asyncTestRan')).to.equal('yes');
        });
`
    );
  });

  afterAll(async () => {
    await new Promise((resolve) => server.close(resolve));
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('contains the engine trap and survives sync vars and async test callbacks', async () => {
    const { code, stdout, stderr } = await runCli(['run', '.', '--sandbox', 'safe'], tmpDir);
    const output = `${stdout}\n${stderr}`;

    expect(output).toContain('was replaced; the run was not affected');
    expect(output).not.toContain('Aborted');
    expect(code).toBe(0);
    expect(output).toContain('5 Passed');
    expect(output).not.toContain('Failed');
  }, 120000);
});
