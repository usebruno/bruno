const { describe, it, expect, beforeEach, afterEach } = require('@jest/globals');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawn } = require('child_process');

const CLI_BIN = path.resolve(__dirname, '..', '..', 'bin', 'bru.js');

const SKIP_REASON = 'Feature unavailable in this environment';
const CONTINUATION_REASON = 'Continuation request reached after skip';

const writeFixtureFile = (filePath, content) => {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, content);
};

const createRequest = ({
  name,
  seq,
  url,
  preRequest,
  postResponse = '',
  tests = ''
}) => `meta {
  name: ${name}
  type: http
  seq: ${seq}
}

get {
  url: ${url}
  body: none
  auth: none
}

script:pre-request {
${preRequest}
}
${postResponse ? `
script:post-response {
${postResponse}
}
` : ''}${tests ? `
tests {
${tests}
}
` : ''}`;

describe('CLI run - request skip lifecycle', () => {
  let tmpDir;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(
      path.join(os.tmpdir(), 'bru-cli-request-skip-')
    );

    writeFixtureFile(
      path.join(tmpDir, 'bruno.json'),
      JSON.stringify({
        version: '1',
        name: 'request-skip',
        type: 'collection'
      }, null, 2) + '\n'
    );

    writeFixtureFile(
      path.join(tmpDir, 'collection.bru'),
      'meta {\n  name: request-skip\n  seq: 1\n}\n'
    );

    writeFixtureFile(
      path.join(tmpDir, 'request-one.bru'),
      createRequest({
        name: 'request-one',
        seq: 1,
        url: 'http://127.0.0.1:1/must-not-be-sent-one',
        preRequest: `  req.skip('${SKIP_REASON}');`,
        postResponse:
          `  throw new Error('request-one post-response script must not execute');`,
        tests:
          `  throw new Error('request-one response tests must not execute');`
      })
    );

    writeFixtureFile(
      path.join(tmpDir, 'request-two.bru'),
      createRequest({
        name: 'request-two',
        seq: 2,
        url: 'http://127.0.0.1:1/must-not-be-sent-two',
        preRequest: `  req.skip('${CONTINUATION_REASON}');`,
        postResponse:
          `  throw new Error('request-two post-response script must not execute');`,
        tests:
          `  throw new Error('request-two response tests must not execute');`
      })
    );
  });

  afterEach(() => {
    fs.rmSync(tmpDir, {
      recursive: true,
      force: true
    });
  });

  const runCli = (args) => new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [CLI_BIN, ...args], {
      cwd: tmpDir,
      env: { ...process.env },
      windowsHide: true
    });

    let stdout = '';
    let stderr = '';

    child.stdout.on('data', (chunk) => {
      stdout += chunk;
    });

    child.stderr.on('data', (chunk) => {
      stderr += chunk;
    });

    child.on('error', reject);

    child.on('close', (code) => {
      resolve({
        code,
        stdout,
        stderr
      });
    });
  });

  it.each([
    ['developer'],
    ['safe']
  ])(
    'skips requests, continues with --bail, and reports reasons (--sandbox %s)',
    async (sandbox) => {
      const jsonPath = path.join(
        tmpDir,
        `results-${sandbox}.json`
      );

      const junitPath = path.join(
        tmpDir,
        `results-${sandbox}.xml`
      );

      const htmlPath = path.join(
        tmpDir,
        `results-${sandbox}.html`
      );

      const result = await runCli([
        'run',
        '.',
        '--sandbox',
        sandbox,
        '--bail',
        '--noproxy',
        '--reporter-json',
        jsonPath,
        '--reporter-junit',
        junitPath,
        '--reporter-html',
        htmlPath
      ]);

      if (result.code !== 0) {
        throw new Error(
          `CLI exited with code ${result.code}.\n`
          + `--- stdout ---\n${result.stdout}\n`
          + `--- stderr ---\n${result.stderr}`
        );
      }

      const json = JSON.parse(
        fs.readFileSync(jsonPath, 'utf8')
      );

      expect(json.summary).toEqual(expect.objectContaining({
        totalRequests: 2,
        passedRequests: 0,
        failedRequests: 0,
        errorRequests: 0,
        skippedRequests: 2
      }));

      const firstSkippedResult = json.results.find(
        (entry) => entry.name === 'request-one'
      );

      const continuationResult = json.results.find(
        (entry) => entry.name === 'request-two'
      );

      expect(firstSkippedResult).toEqual(expect.objectContaining({
        status: 'skipped',
        skipped: true,
        skipReason: SKIP_REASON,
        error: null,
        assertionResults: [],
        testResults: [],
        postResponseTestResults: []
      }));

      expect(firstSkippedResult.response).toEqual(
        expect.objectContaining({
          status: 'skipped',
          statusText: SKIP_REASON,
          skipped: true,
          skipReason: SKIP_REASON
        })
      );

      expect(continuationResult).toEqual(expect.objectContaining({
        status: 'skipped',
        skipped: true,
        skipReason: CONTINUATION_REASON,
        error: null,
        assertionResults: [],
        testResults: [],
        postResponseTestResults: []
      }));

      expect(continuationResult.response).toEqual(
        expect.objectContaining({
          status: 'skipped',
          statusText: CONTINUATION_REASON,
          skipped: true,
          skipReason: CONTINUATION_REASON
        })
      );

      const junit = fs.readFileSync(junitPath, 'utf8');

      expect(junit).toContain(
        `<skipped message="${SKIP_REASON}"`
      );

      expect(junit).toContain(
        `<skipped message="${CONTINUATION_REASON}"`
      );

      expect(
        (junit.match(/<skipped\b/g) || [])
      ).toHaveLength(2);

      const html = fs.readFileSync(htmlPath, 'utf8');

      const encodedResults = html.match(
        /JSON\.parse\(decodeBase64\('([^']+)'\)\)/
      )?.[1];

      expect(encodedResults).toBeDefined();

      const embedded = JSON.parse(
        Buffer.from(encodedResults, 'base64').toString('utf8')
      );

      const htmlResults = embedded.results[0].results;

      const htmlFirstSkippedResult = htmlResults.find(
        (entry) => entry.name === 'request-one'
      );

      const htmlContinuationResult = htmlResults.find(
        (entry) => entry.name === 'request-two'
      );

      expect(htmlFirstSkippedResult.skipReason).toBe(
        SKIP_REASON
      );

      expect(htmlContinuationResult.skipReason).toBe(
        CONTINUATION_REASON
      );
    },
    60_000
  );
});
