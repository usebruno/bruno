const { describe, it, expect, beforeAll, afterAll, afterEach } = require('@jest/globals');
const fs = require('fs');
const path = require('path');
const { runCli } = require('../helpers/run-cli');
const { createCollectionFixture } = require('../helpers/collection-fixture');
const { startLocalServer } = require('../helpers/environments');

const FIXTURE_DIR = path.join(__dirname, 'fixtures', 'workspace');

// Both scopes keep their name under the same `__name__` key, so a leak between them would be silent.
describe('CLI run — bru.getEnvName() and bru.getGlobalEnvName()', () => {
  let server;
  let baseUrl;
  let workspaceDir;

  beforeAll(async () => {
    server = await startLocalServer();
    baseUrl = server.baseUrl;
  });

  afterAll(() => server.close());

  afterEach(() => {
    if (!workspaceDir) return;
    fs.rmSync(workspaceDir, { recursive: true, force: true, maxRetries: 10, retryDelay: 100 });
    workspaceDir = null;
  });

  const run = async (requestFile, { sandbox, args }) => {
    workspaceDir = createCollectionFixture(FIXTURE_DIR);
    const collectionDir = path.join(workspaceDir, 'collections', 'collection');
    const result = await runCli([
      'run', `${requestFile}.yml`,
      '--workspace-path', workspaceDir,
      '--global-env-var', `baseUrl=${baseUrl}`,
      '--sandbox', sandbox,
      '--noproxy',
      '--reporter-json', 'report.json',
      ...args
    ], collectionDir);

    if (result.code !== 0) {
      throw new Error(
        `CLI exited with code ${result.code}.\n--- stdout ---\n${result.stdout}\n--- stderr ---\n${result.stderr}`
      );
    }

    // A zero exit means nothing failed, not that anything ran — the counts prove the tests executed.
    const report = JSON.parse(fs.readFileSync(path.join(collectionDir, 'report.json'), 'utf8'));

    const { summary } = Array.isArray(report) ? report[0] : report;

    expect(summary).toMatchObject({
      totalRequests: 1,
      passedRequests: 1,
      totalTests: 1,
      passedTests: 1,
      failedTests: 0
    });
  };

  const CASES = [
    { title: 'neither scope selected', request: 'no-env-selected', args: [] },
    { title: 'only a collection environment selected', request: 'collection-env-only', args: ['--env', 'scripted'] },
    { title: 'only a global environment selected', request: 'global-env-only', args: ['--global-env', 'workspace_scripted'] },
    { title: 'both scopes selected', request: 'both-envs', args: ['--env', 'scripted', '--global-env', 'workspace_scripted'] },
    { title: 'the two names swapped across the scopes', request: 'swapped-env-names', args: ['--env', 'workspace_scripted', '--global-env', 'scripted'] },
    { title: 'a global environment whose name must stay out of its variables', request: 'name-is-not-a-variable', args: ['--global-env', 'workspace_scripted'] }
  ];

  CASES.forEach(({ title, request, args }) => {
    it.each(['safe', 'developer'])(`reports the right names with ${title} (--sandbox %s)`, async (sandbox) => {
      await run(request, { sandbox, args });
    }, 60_000);
  });
});
