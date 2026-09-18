const { describe, it, expect, beforeAll, afterAll, beforeEach, afterEach } = require('@jest/globals');
const fs = require('fs');
const path = require('path');
const http = require('http');
const { runCli } = require('../helpers/run-cli');
const { copyFixtureToTmpDir, removeTmpDir } = require('../helpers/tmp-dir');

// A CLI run spawns a fresh node process and executes up to seven requests, which outruns
// jest's 5s default on a loaded CI box.
const RUN_TIMEOUT = 60000;

// Tags cascade from a folder to everything beneath it, so the same tree is staged in both
// on-disk formats: folder tags live in `meta.tags` of folder.bru and in `info.tags` of folder.yml.
//
//   untagged                  -> []
//   own-tagged                -> [smoke]
//   api/                      -> folder tag [api]
//     inherits-only           -> [api]
//     own-and-inherited       -> [smoke, api]
//     v2/                     -> folder tag [v2]
//       nested                -> [api, v2]
//       reports-tags          -> [smoke, api, v2]
//   legacy/                   -> folder tag [wip]
//     inherits-wip            -> [smoke, wip]
const FORMATS = [
  { format: 'bru', fixture: 'bru-collection', ext: 'bru' },
  { format: 'yml', fixture: 'yml-collection', ext: 'yml' }
];

describe.each(FORMATS)('CLI run — folder tags cascade to requests ($format collection)', ({ fixture, ext }) => {
  const fixtureDir = path.join(__dirname, 'fixtures', fixture);

  let server;
  let baseUrl;
  let workDir;

  beforeAll(async () => {
    server = http.createServer((_req, res) => {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ ok: true }));
    });
    await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
    baseUrl = `http://127.0.0.1:${server.address().port}`;
  });

  afterAll(async () => {
    await new Promise((resolve) => server.close(resolve));
  });

  beforeEach(() => {
    workDir = copyFixtureToTmpDir(fixtureDir, 'folder-tags');
  });

  afterEach(() => {
    removeTmpDir(workDir);
    workDir = null;
  });

  // `paths` is empty for a whole-collection run; the CLI then defaults to a recursive './'.
  const run = async (tagArgs, paths = []) => {
    const result = await runCli(
      [
        'run', ...paths,
        '--env-var', `host=${baseUrl}`,
        '--noproxy',
        '--reporter-json', 'report.json',
        ...tagArgs
      ],
      workDir
    );

    if (result.code !== 0) {
      throw new Error(
        `CLI exited with code ${result.code}.\n--- stdout ---\n${result.stdout}\n--- stderr ---\n${result.stderr}`
      );
    }

    return result;
  };

  // The OSS json reporter writes one `{ summary, results }` object; Enterprise writes an array
  // holding one per iteration. Accept both so the suite passes on either codebase.
  const ranRequests = () => {
    const report = JSON.parse(fs.readFileSync(path.join(workDir, 'report.json'), 'utf8'));
    const iterationReport = Array.isArray(report) ? report[0] : report;

    return iterationReport.results.map((result) => result.path.split(path.sep).join('/')).sort();
  };

  const withExt = (names) => names.map((name) => `${name}.${ext}`).sort();

  it('runs every request when neither tag option is given', async () => {
    await run([]);

    expect(ranRequests()).toEqual(withExt([
      'untagged',
      'own-tagged',
      'api/inherits-only',
      'api/own-and-inherited',
      'api/v2/nested',
      'api/v2/reports-tags',
      'legacy/inherits-wip'
    ]));
  }, RUN_TIMEOUT);

  it('includes requests that carry the tag only through an ancestor folder', async () => {
    await run(['--tags', 'api']);

    // `api/v2/*` match through their grandparent folder, so inheritance is not limited to the
    // nearest folder; `legacy/inherits-wip` proves a folder tag does not leak to a sibling tree.
    expect(ranRequests()).toEqual(withExt([
      'api/inherits-only',
      'api/own-and-inherited',
      'api/v2/nested',
      'api/v2/reports-tags'
    ]));
  }, RUN_TIMEOUT);

  it('does not cascade a nested folder tag back up to its parent folder', async () => {
    await run(['--tags', 'v2']);

    expect(ranRequests()).toEqual(withExt(['api/v2/nested', 'api/v2/reports-tags']));
  }, RUN_TIMEOUT);

  it('matches own tags on the request alongside the inherited ones', async () => {
    await run(['--tags', 'smoke']);

    expect(ranRequests()).toEqual(withExt([
      'own-tagged',
      'api/own-and-inherited',
      'api/v2/reports-tags',
      'legacy/inherits-wip'
    ]));
  }, RUN_TIMEOUT);

  it('accepts a comma separated list of tags', async () => {
    await run(['--tags', 'v2,wip']);

    expect(ranRequests()).toEqual(withExt([
      'api/v2/nested',
      'api/v2/reports-tags',
      'legacy/inherits-wip'
    ]));
  }, RUN_TIMEOUT);

  it('excludes a whole subtree by its folder tag', async () => {
    await run(['--exclude-tags', 'api']);

    expect(ranRequests()).toEqual(withExt(['untagged', 'own-tagged', 'legacy/inherits-wip']));
  }, RUN_TIMEOUT);

  it('excludes a request whose only match for the excluded tag is inherited', async () => {
    await run(['--tags', 'smoke', '--exclude-tags', 'wip']);

    // `legacy/inherits-wip` carries `smoke` itself, but the folder's `wip` still drops it:
    // an exclusion beats an inclusion, and a request cannot opt out of its folder's tags.
    expect(ranRequests()).toEqual(withExt([
      'own-tagged',
      'api/own-and-inherited',
      'api/v2/reports-tags'
    ]));
  }, RUN_TIMEOUT);

  it('runs nothing when no request carries the tag, directly or by inheritance', async () => {
    await run(['--tags', 'no-such-tag']);

    expect(ranRequests()).toEqual([]);
  }, RUN_TIMEOUT);

  it('keeps inheriting tags from folders above the path being run', async () => {
    // The run starts inside `api/v2`, so `api` is only reachable from a folder above the run
    // root — the filter still has to see it.
    await run(['--tags', 'api'], ['api/v2', '-r']);

    expect(ranRequests()).toEqual(withExt(['api/v2/nested', 'api/v2/reports-tags']));
  }, RUN_TIMEOUT);

  it('exposes own plus inherited tags to scripts via req.getTags()', async () => {
    const { stdout } = await run([], [`api/v2/reports-tags.${ext}`]);

    const reqTags = stdout.match(/REQ_TAGS (\[.*\])/);

    expect(reqTags).not.toBeNull();
    expect(JSON.parse(reqTags[1])).toEqual(['smoke', 'api', 'v2']);
  }, RUN_TIMEOUT);
});
