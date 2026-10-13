const { describe, it, expect, beforeAll, afterAll, beforeEach, afterEach } = require('@jest/globals');
const fs = require('fs');
const os = require('os');
const path = require('path');
const http = require('http');
const { runCli } = require('./helpers/run-cli');

// The safe sandbox can evaluate a run's first assertion before QuickJS has finished loading;
// the developer sandbox keeps these runs deterministic. The QuickJS bridge for
// bru.getIterationData() is covered in bruno-js.
const runDataCli = (args, cwd) => runCli(['run', '--noproxy', '--sandbox', 'developer', ...args], cwd);

const writeFixtureFile = (filePath, content) => {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, content);
};

describe('CLI run — data file iterations', () => {
  let server;
  let port;
  let tmpDir;
  let receivedPaths;

  beforeAll(async () => {
    server = http.createServer((req, res) => {
      receivedPaths.push(req.url);
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
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'bru-cli-iteration-data-'));
    receivedPaths = [];

    writeFixtureFile(
      path.join(tmpDir, 'bruno.json'),
      JSON.stringify({ version: '1', name: 'iteration-data', type: 'collection' }, null, 2) + '\n'
    );
    writeFixtureFile(path.join(tmpDir, 'collection.bru'), 'meta {\n  name: iteration-data\n  seq: 1\n}\n');
    writeFixtureFile(
      path.join(tmpDir, 'user.bru'),
      `meta {
  name: user
  type: http
  seq: 1
}

get {
  url: http://127.0.0.1:${port}/users/{{name}}
  body: none
  auth: none
}

assert {
  res.status: eq {{expectedStatus}}
}

tests {
  test("sees its row", function () {
    expect(bru.getIterationData("name")).to.equal(req.getUrl().split("/").pop());
    bru.setVar("lastIteration", bru.getIteration());
  });
}
`
    );
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true, maxRetries: 3, retryDelay: 100 });
  });

  const readReport = () => JSON.parse(fs.readFileSync(path.join(tmpDir, 'report.json'), 'utf8'));

  it('runs once per csv row and reports each iteration', async () => {
    writeFixtureFile(path.join(tmpDir, 'users.csv'), 'name,expectedStatus\nalice,200\nbob,200\n');

    const { code, stdout } = await runDataCli(['--data-file', 'users.csv', '--reporter-json', 'report.json'], tmpDir);

    expect(code).toBe(0);
    expect(receivedPaths).toEqual(['/users/alice', '/users/bob']);
    expect(stdout).toContain('Iteration 1/2');
    expect(stdout).toContain('Iteration 2/2');

    const report = readReport();
    expect(report.map(({ iterationIndex, summary }) => ({ iterationIndex, passedTests: summary.passedTests, passedAssertions: summary.passedAssertions }))).toEqual([
      { iterationIndex: 0, passedTests: 1, passedAssertions: 1 },
      { iterationIndex: 1, passedTests: 1, passedAssertions: 1 }
    ]);
    expect(report[1].results[0].iterationIndex).toBe(1);
  });

  it('reuses the last json row when --iterations exceeds the rows', async () => {
    writeFixtureFile(path.join(tmpDir, 'users.json'), JSON.stringify([{ name: 'alice', expectedStatus: 200 }, { name: 'bob', expectedStatus: 200 }]));

    const { code } = await runDataCli(['--data-file', 'users.json', '--iterations', '3'], tmpDir);

    expect(code).toBe(0);
    expect(receivedPaths).toEqual(['/users/alice', '/users/bob', '/users/bob']);
  });

  it('fails the run when a row does not satisfy its assertions', async () => {
    writeFixtureFile(path.join(tmpDir, 'users.csv'), 'name,expectedStatus\nalice,200\nbob,404\n');

    const { code } = await runDataCli(['--data-file', 'users.csv'], tmpDir);

    expect(code).toBe(1);
    expect(receivedPaths).toEqual(['/users/alice', '/users/bob']);
  });

  it('keeps the single-report json shape for a single iteration', async () => {
    writeFixtureFile(path.join(tmpDir, 'users.csv'), 'name,expectedStatus\nalice,200\n');

    const { code } = await runDataCli(['--data-file', 'users.csv', '--reporter-json', 'report.json'], tmpDir);

    expect(code).toBe(0);
    const report = readReport();
    expect(Array.isArray(report)).toBe(false);
    expect(report.results[0].iterationIndex).toBe(0);
  });

  it('rejects a malformed data file before sending any request', async () => {
    writeFixtureFile(path.join(tmpDir, 'users.csv'), 'name,expectedStatus\nalice\n');

    const { code, stderr } = await runDataCli(['--data-file', 'users.csv'], tmpDir);

    expect(code).toBe(10);
    expect(stderr).toContain('Failed to parse data file: Invalid CSV at line 2: expected 2 fields but found 1');
    expect(receivedPaths).toEqual([]);
  });

  it('rejects an unsupported data file extension', async () => {
    writeFixtureFile(path.join(tmpDir, 'users.txt'), 'name\nalice\n');

    const { code, stderr } = await runDataCli(['--data-file', 'users.txt'], tmpDir);

    expect(code).toBe(10);
    expect(stderr).toContain('Data file must be a .csv or .json file');
  });

  it('rejects an invalid iteration count', async () => {
    const { code, stderr } = await runDataCli(['--iterations', '0'], tmpDir);

    expect(code).toBe(255);
    expect(stderr).toContain('Iterations must be a positive whole number');
    expect(receivedPaths).toEqual([]);
  });
});
