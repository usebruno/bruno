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

describe('CLI run — --sandbox-shared-modules', () => {
  let server;
  let port;
  let tmpDir;

  beforeAll(async () => {
    server = http.createServer((_req, res) => {
      res.writeHead(200, { 'Content-Type': 'text/plain' });
      res.end('ok');
    });
    await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
    port = server.address().port;
  });

  afterAll(async () => {
    await new Promise((resolve) => server.close(resolve));
  });

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'bru-cli-sandbox-shared-modules-'));
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  const stageCollection = ({
    withCounter = false,
    collectionDir = tmpDir,
    additionalContextRoots,
    requests
  } = {}) => {
    const brunoConfig = {
      version: '1',
      name: 'sandbox-shared-modules',
      type: 'collection'
    };
    if (additionalContextRoots) {
      brunoConfig.scripts = { additionalContextRoots };
    }

    writeFixtureFile(
      path.join(collectionDir, 'bruno.json'),
      JSON.stringify(brunoConfig, null, 2) + '\n'
    );
    writeFixtureFile(
      path.join(collectionDir, 'collection.bru'),
      'meta {\n  name: sandbox-shared-modules\n  seq: 1\n}\n'
    );

    if (withCounter) {
      writeFixtureFile(
        path.join(collectionDir, 'counter.js'),
        'module.exports = { flag: null };\n'
      );
    }

    for (const [name, body] of Object.entries(requests)) {
      writeFixtureFile(path.join(collectionDir, name), body);
    }
  };

  const requestBru = ({ name, seq, preRequest = '', tests = '' }) => `meta {
  name: ${name}
  type: http
  seq: ${seq}
}

get {
  url: http://127.0.0.1:${port}/ping
  body: none
  auth: none
}
${preRequest ? `\nscript:pre-request {\n${preRequest}\n}\n` : ''}${tests ? `\ntests {\n${tests}\n}\n` : ''}`;

  it('shares a required local module across requests when enabled', async () => {
    stageCollection({
      withCounter: true,
      requests: {
        'a.bru': requestBru({
          name: 'a',
          seq: 1,
          preRequest: `  const m = require('./counter');\n  m.flag = 'from-a';`
        }),
        'b.bru': requestBru({
          name: 'b',
          seq: 2,
          tests: `  const m = require('./counter');\n  test('module is shared', function() {\n    expect(m.flag).to.eql('from-a');\n  });`
        })
      }
    });

    const result = await runCli(
      ['run', '.', '--sandbox', 'developer', '--sandbox-shared-modules', '--noproxy'],
      tmpDir
    );

    expect(result.code).toBe(0);
    expect(result.stdout).toMatch(/module is shared/);
    expect(result.stdout).not.toMatch(/failed/i);
  }, 60_000);

  it('keeps modules isolated across requests by default', async () => {
    stageCollection({
      withCounter: true,
      requests: {
        'a.bru': requestBru({
          name: 'a',
          seq: 1,
          preRequest: `  const m = require('./counter');\n  m.flag = 'from-a';`
        }),
        'b.bru': requestBru({
          name: 'b',
          seq: 2,
          tests: `  const m = require('./counter');\n  test('module is isolated', function() {\n    expect(m.flag).to.eql(null);\n  });`
        })
      }
    });

    const result = await runCli(
      ['run', '.', '--sandbox', 'developer', '--noproxy'],
      tmpDir
    );

    expect(result.code).toBe(0);
    expect(result.stdout).toMatch(/module is isolated/);
    expect(result.stdout).not.toMatch(/failed/i);
  }, 60_000);

  it('resolves Bruno bundled modules with no collection package.json', async () => {
    stageCollection({
      requests: {
        'bundled.bru': requestBru({
          name: 'bundled',
          seq: 1,
          tests: `  const Ajv = require('ajv');\n  test('ajv is available', function() {\n    expect(typeof Ajv).to.eql('function');\n  });`
        })
      }
    });

    expect(fs.existsSync(path.join(tmpDir, 'package.json'))).toBe(false);
    expect(fs.existsSync(path.join(tmpDir, 'node_modules'))).toBe(false);

    const result = await runCli(
      ['run', 'bundled.bru', '--sandbox', 'developer', '--sandbox-shared-modules', '--noproxy'],
      tmpDir
    );

    expect(result.code).toBe(0);
    expect(result.stdout).toMatch(/ajv is available/);
    expect(result.stdout).not.toMatch(/failed/i);
  }, 60_000);

  it('does not crash with --sandbox safe', async () => {
    stageCollection({
      requests: {
        'safe.bru': requestBru({
          name: 'safe',
          seq: 1,
          tests: `  test('safe sandbox runs', function() {\n    expect(true).to.eql(true);\n  });`
        })
      }
    });

    const result = await runCli(
      ['run', 'safe.bru', '--sandbox', 'safe', '--sandbox-shared-modules', '--noproxy'],
      tmpDir
    );

    expect(result.code).toBe(0);
    expect(result.stdout).toMatch(/safe sandbox runs/);
  }, 60_000);

  it('requires a sibling module via additionalContextRoots', async () => {
    const collectionDir = path.join(tmpDir, 'collection');
    const sharedDir = path.join(tmpDir, 'shared');
    writeFixtureFile(path.join(sharedDir, 'utils.js'), 'module.exports = { ok: true };\n');

    stageCollection({
      collectionDir,
      additionalContextRoots: ['../shared'],
      requests: {
        'acr.bru': requestBru({
          name: 'acr',
          seq: 1,
          tests: `  const utils = require('../shared/utils');\n  test('acr utils resolve', function() {\n    expect(utils.ok).to.eql(true);\n  });`
        })
      }
    });

    const result = await runCli(
      ['run', 'acr.bru', '--sandbox', 'developer', '--sandbox-shared-modules', '--noproxy'],
      collectionDir
    );

    expect(result.code).toBe(0);
    expect(result.stdout).toMatch(/acr utils resolve/);
    expect(result.stdout).not.toMatch(/failed/i);
  }, 60_000);

  it('resolves npm from shared root via additionalContextRoots', async () => {
    const collectionDir = path.join(tmpDir, 'collection');
    const sharedDir = path.join(tmpDir, 'shared');
    writeFixtureFile(
      path.join(sharedDir, 'node_modules', 'shared-util', 'index.js'),
      'module.exports = { parse: (s) => JSON.parse(s) };\n'
    );
    writeFixtureFile(
      path.join(sharedDir, 'parser.js'),
      'const sharedUtil = require("shared-util");\nmodule.exports = { parse: sharedUtil.parse };\n'
    );

    stageCollection({
      collectionDir,
      additionalContextRoots: ['../shared'],
      requests: {
        'acr-npm.bru': requestBru({
          name: 'acr-npm',
          seq: 1,
          tests: `  const parser = require('../shared/parser');\n  test('shared npm resolves', function() {\n    expect(parser.parse('{"ok":true}').ok).to.eql(true);\n  });`
        })
      }
    });

    const result = await runCli(
      ['run', 'acr-npm.bru', '--sandbox', 'developer', '--sandbox-shared-modules', '--noproxy'],
      collectionDir
    );

    expect(result.code).toBe(0);
    expect(result.stdout).toMatch(/shared npm resolves/);
    expect(result.stdout).not.toMatch(/failed/i);
  }, 60_000);

  it('shares an additionalContextRoots module across requests', async () => {
    const collectionDir = path.join(tmpDir, 'collection');
    const sharedDir = path.join(tmpDir, 'shared');
    writeFixtureFile(path.join(sharedDir, 'counter.js'), 'module.exports = { flag: null };\n');

    stageCollection({
      collectionDir,
      additionalContextRoots: ['../shared'],
      requests: {
        'a.bru': requestBru({
          name: 'a',
          seq: 1,
          preRequest: `  const m = require('../shared/counter');\n  m.flag = 'from-a';`
        }),
        'b.bru': requestBru({
          name: 'b',
          seq: 2,
          tests: `  const m = require('../shared/counter');\n  test('acr module is shared', function() {\n    expect(m.flag).to.eql('from-a');\n  });`
        })
      }
    });

    const result = await runCli(
      ['run', '.', '--sandbox', 'developer', '--sandbox-shared-modules', '--noproxy'],
      collectionDir
    );

    expect(result.code).toBe(0);
    expect(result.stdout).toMatch(/acr module is shared/);
    expect(result.stdout).not.toMatch(/failed/i);
  }, 60_000);
});
