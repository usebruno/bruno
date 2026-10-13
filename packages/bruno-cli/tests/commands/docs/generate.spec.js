const path = require('path');
const fs = require('fs');
const os = require('os');
const { execSync } = require('child_process');
const { describe, it, expect, beforeAll, afterAll, afterEach } = require('@jest/globals');
const generate = require('../../../src/commands/docs/generate');
const { EXIT_STATUS } = require('../../../src/constants');
const { createTmpDir, copyFixtureToTmpDir, removeTmpDir } = require('../../integration/helpers/tmp-dir');

const FIXTURE = path.resolve(__dirname, 'fixtures/collection');
const YML_FIXTURE = path.resolve(__dirname, 'fixtures/yml-collection');

const mockExit = () => {
  jest.spyOn(console, 'error').mockImplementation(() => {});
  return jest.spyOn(process, 'exit').mockImplementation((code) => {
    throw new Error(`exit:${code}`);
  });
};

describe('bru docs generate', () => {
  let originalCwd;
  let outDir;

  beforeAll(() => {
    originalCwd = process.cwd();
    outDir = fs.mkdtempSync(path.join(os.tmpdir(), 'bru-docs-'));
    process.chdir(FIXTURE);
  });

  afterAll(() => {
    process.chdir(originalCwd);
    removeTmpDir(outDir);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('uses the collection name as the document title', async () => {
    const output = path.join(outDir, 'a.html');
    await generate.handler({ output, gitLink: false });

    const html = fs.readFileSync(output, 'utf8');
    expect(html).toContain('<title>collection - API Documentation</title>');
    expect(html).toContain('new window.OpenCollection');
    expect(html).toContain('const collectionData =');
  });

  it('shows the collection version from the bru config (collectionVersion, not the schema marker)', async () => {
    const output = path.join(outDir, 'version.html');
    await generate.handler({ output, gitLink: false });
    const html = fs.readFileSync(output, 'utf8');
    expect(html).toContain('version: 2.1.0');
  });

  it('leaves out the git repo url when --no-git-link is used', async () => {
    const output = path.join(outDir, 'b.html');
    await generate.handler({ output, gitLink: false });
    expect(fs.readFileSync(output, 'utf8')).not.toContain('gitCollectionUrl');
  });

  it('still writes a smaller but valid doc when no request matches the tag filter', async () => {
    const all = path.join(outDir, 'all.html');
    const filtered = path.join(outDir, 'filtered.html');
    await generate.handler({ output: all, gitLink: false });
    await generate.handler({ output: filtered, gitLink: false, tags: 'nonexistent-tag' });

    const allHtml = fs.readFileSync(all, 'utf8');
    const filteredHtml = fs.readFileSync(filtered, 'utf8');
    expect(filteredHtml.length).toBeLessThan(allHtml.length);
    expect(filteredHtml).toContain('new window.OpenCollection');
  });

  it('creates any missing folders in the output path', async () => {
    const output = path.join(outDir, 'nested', 'deep', 'c.html');
    await generate.handler({ output, gitLink: false });
    expect(fs.existsSync(output)).toBe(true);
  });

  it('exits with the invalid-file code when an environment file cannot be parsed', async () => {
    const exitSpy = mockExit();
    const badDir = fs.mkdtempSync(path.join(os.tmpdir(), 'bru-docs-badenv-'));
    fs.cpSync(FIXTURE, badDir, { recursive: true });
    fs.mkdirSync(path.join(badDir, 'environments'), { recursive: true });
    fs.writeFileSync(path.join(badDir, 'environments', 'Broken.bru'), '@@@ not valid bru @@@\n');
    const prevCwd = process.cwd();
    process.chdir(badDir);
    try {
      await expect(
        generate.handler({ output: path.join(badDir, 'x.html'), gitLink: false })
      ).rejects.toThrow();
      expect(exitSpy).toHaveBeenNthCalledWith(1, 10);
    } finally {
      process.chdir(prevCwd);
      removeTmpDir(badDir);
    }
  });

  it('warns but still writes the doc when a request file cannot be parsed', async () => {
    const warnSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    const badDir = copyFixtureToTmpDir(FIXTURE, 'bru-docs-badreq');
    fs.writeFileSync(
      path.join(badDir, 'Broken.bru'),
      'meta {\n  name: Broken\n  type: http\n  seq: 9\n\n>>> not valid bru <<<\n'
    );
    const prevCwd = process.cwd();
    process.chdir(badDir);
    try {
      const output = path.join(outDir, 'skipped.html');
      await generate.handler({ output, gitLink: false });
      expect(fs.existsSync(output)).toBe(true);
      const message = warnSpy.mock.calls.map((args) => args.join(' ')).join('\n');
      expect(message).toContain('could not be parsed');
    } finally {
      process.chdir(prevCwd);
      removeTmpDir(badDir);
    }
  });

  it('generates a doc with zero environments when the collection has no environments folder, even with --all-envs', async () => {
    const output = path.join(outDir, 'no-env-folder.html');
    await generate.handler({ output, gitLink: false, allEnvs: true });
    expect(fs.existsSync(output)).toBe(true);
    expect(fs.readFileSync(output, 'utf8')).toContain('new window.OpenCollection');
  });
});

describe('bru docs generate: environment selection', () => {
  let originalCwd;
  let collDir;
  let outDir;

  const writeEnv = (dir, name, host) =>
    fs.writeFileSync(
      path.join(dir, `${name}.bru`),
      `vars {\n  BASE_URL: ${host}\n}\n`
    );

  beforeAll(() => {
    originalCwd = process.cwd();
    collDir = fs.mkdtempSync(path.join(os.tmpdir(), 'bru-docs-envs-'));
    fs.cpSync(FIXTURE, collDir, { recursive: true });
    const envDir = path.join(collDir, 'environments');
    fs.mkdirSync(envDir, { recursive: true });
    writeEnv(envDir, 'Production', 'https://prod.example.com');
    writeEnv(envDir, 'Staging', 'https://staging.example.com');
    outDir = fs.mkdtempSync(path.join(os.tmpdir(), 'bru-docs-envs-out-'));
    process.chdir(collDir);
  });

  afterAll(() => {
    process.chdir(originalCwd);
    removeTmpDir(collDir);
    removeTmpDir(outDir);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('embeds no environments by default when no env flag is given', async () => {
    const output = path.join(outDir, 'no-envs.html');
    await generate.handler({ output, gitLink: false });
    const html = fs.readFileSync(output, 'utf8');
    expect(html).not.toContain('Production');
    expect(html).not.toContain('Staging');
  });

  it('includes only the environments listed in --envs', async () => {
    const output = path.join(outDir, 'envs.html');
    await generate.handler({ output, gitLink: false, envs: 'Production' });
    const html = fs.readFileSync(output, 'utf8');
    expect(html).toContain('Production');
    expect(html).not.toContain('Staging');
  });

  it('drops an included environment that is also excluded, without erroring (exclude wins)', async () => {
    const output = path.join(outDir, 'inc-exc.html');
    await generate.handler({ output, gitLink: false, envs: 'Production,Staging', excludeEnvs: 'Staging' });
    const html = fs.readFileSync(output, 'utf8');
    expect(html).toContain('Production');
    expect(html).not.toContain('Staging');
  });

  it('accepts repeated env flags (an array of names) and embeds each', async () => {
    const output = path.join(outDir, 'repeat.html');
    await generate.handler({ output, gitLink: false, envs: ['Production', 'Staging'] });
    const html = fs.readFileSync(output, 'utf8');
    expect(html).toContain('Production');
    expect(html).toContain('Staging');
  });

  it('splits comma-separated values within a repeated flag too', async () => {
    const output = path.join(outDir, 'mixed.html');
    await generate.handler({ output, gitLink: false, envs: ['Production,Staging'] });
    const html = fs.readFileSync(output, 'utf8');
    expect(html).toContain('Production');
    expect(html).toContain('Staging');
  });

  it('accepts repeated exclude-env flags (an array of names) alongside --all-envs', async () => {
    const output = path.join(outDir, 'exclude-repeat.html');
    await generate.handler({ output, gitLink: false, allEnvs: true, excludeEnvs: ['Production'] });
    const html = fs.readFileSync(output, 'utf8');
    expect(html).toContain('Staging');
    expect(html).not.toContain('Production');
  });

  it('accepts repeated --envs flags each with comma-separated values', async () => {
    const output = path.join(outDir, 'repeat-comma.html');
    await generate.handler({ output, gitLink: false, envs: ['Production,Staging', 'Production'] });
    const html = fs.readFileSync(output, 'utf8');
    expect(html).toContain('Production');
    expect(html).toContain('Staging');
    expect((html.match(/name: Production/g) || []).length).toBe(1);
  });

  it('embeds the environments in the order given to --envs', async () => {
    const output = path.join(outDir, 'order.html');
    await generate.handler({ output, gitLink: false, envs: 'Staging,Production' });
    const html = fs.readFileSync(output, 'utf8');
    expect(html.indexOf('Staging')).toBeLessThan(html.indexOf('Production'));
  });

  it('embeds an environment once even when --envs repeats it', async () => {
    const output = path.join(outDir, 'dup.html');
    await generate.handler({ output, gitLink: false, envs: 'Production,Production' });
    const html = fs.readFileSync(output, 'utf8');
    expect((html.match(/name: Production/g) || []).length).toBe(1);
  });

  it('embeds no environments when only --exclude-envs is given (exclude needs a base set)', async () => {
    const output = path.join(outDir, 'exclude-only.html');
    await generate.handler({ output, gitLink: false, excludeEnvs: 'Production' });
    const html = fs.readFileSync(output, 'utf8');
    expect(html).not.toContain('Production');
    expect(html).not.toContain('Staging');
  });

  it('embeds every environment with --all-envs', async () => {
    const output = path.join(outDir, 'all-envs.html');
    await generate.handler({ output, gitLink: false, allEnvs: true });
    const html = fs.readFileSync(output, 'utf8');
    expect(html).toContain('Production');
    expect(html).toContain('Staging');
  });

  it('rejects --all-envs combined with --envs', async () => {
    const exitSpy = mockExit();

    await expect(
      generate.handler({ output: path.join(outDir, 'x.html'), gitLink: false, allEnvs: true, envs: 'Production' })
    ).rejects.toThrow();
    expect(exitSpy).toHaveBeenNthCalledWith(1, 255);
    const message = console.error.mock.calls.map((args) => args.join(' ')).join('\n');
    expect(message).toContain('--envs');
    expect(message).not.toContain('--exclude-envs');
  });

  it('embeds every environment except the excluded ones when --all-envs and --exclude-envs are combined', async () => {
    const output = path.join(outDir, 'all-except.html');
    await generate.handler({ output, gitLink: false, allEnvs: true, excludeEnvs: 'Production' });
    const html = fs.readFileSync(output, 'utf8');
    expect(html).toContain('Staging');
    expect(html).not.toContain('Production');
  });

  it('errors when --envs names an environment that does not exist', async () => {
    const exitSpy = mockExit();

    await expect(
      generate.handler({ output: path.join(outDir, 'x.html'), gitLink: false, envs: 'DoesNotExist' })
    ).rejects.toThrow();
    expect(exitSpy).toHaveBeenNthCalledWith(1, 6);
    const message = console.error.mock.calls.map((args) => args.join(' ')).join('\n');
    expect(message).toContain('Environment not found');
    expect(message).not.toContain('Environments not found');
  });

  it('lists every unknown environment name in a single error', async () => {
    const exitSpy = mockExit();

    await expect(
      generate.handler({ output: path.join(outDir, 'x.html'), gitLink: false, envs: 'NopeOne,NopeTwo' })
    ).rejects.toThrow();
    expect(exitSpy).toHaveBeenNthCalledWith(1, 6);
    const message = console.error.mock.calls.map((args) => args.join(' ')).join('\n');
    expect(message).toContain('Environments not found');
    expect(message).toContain('NopeOne');
    expect(message).toContain('NopeTwo');
  });

  it('errors when --exclude-envs names an environment that does not exist', async () => {
    const exitSpy = mockExit();

    await expect(
      generate.handler({ output: path.join(outDir, 'x.html'), gitLink: false, allEnvs: true, excludeEnvs: 'DoesNotExist' })
    ).rejects.toThrow();
    expect(exitSpy).toHaveBeenNthCalledWith(1, 6);
    const message = console.error.mock.calls.map((args) => args.join(' ')).join('\n');
    expect(message).toContain('Environment not found');
    expect(message).toContain('DoesNotExist');
  });
});

describe('bru docs generate: tag filtering', () => {
  let originalCwd;
  let collDir;
  let outDir;

  const writeRequest = (dir, name, tags) => {
    const tagLines = tags && tags.length ? `\n  tags: [\n${tags.map((t) => `    ${t}`).join('\n')}\n  ]` : '';
    fs.writeFileSync(
      path.join(dir, `${name}.bru`),
      `meta {\n  name: ${name}\n  type: http\n  seq: 1${tagLines}\n}\n\nget {\n  url: https://example.com/${name}\n  body: text\n  auth: none\n}\n`
    );
  };

  beforeAll(() => {
    originalCwd = process.cwd();
    collDir = fs.mkdtempSync(path.join(os.tmpdir(), 'bru-docs-tags-'));
    fs.writeFileSync(
      path.join(collDir, 'bruno.json'),
      JSON.stringify({ version: '1', name: 'tagcoll', type: 'collection' })
    );
    writeRequest(collDir, 'SmokeReq', ['smoke']);
    writeRequest(collDir, 'WipReq', ['wip']);
    writeRequest(collDir, 'PlainReq', null);
    outDir = fs.mkdtempSync(path.join(os.tmpdir(), 'bru-docs-tags-out-'));
    process.chdir(collDir);
  });

  afterAll(() => {
    process.chdir(originalCwd);
    removeTmpDir(collDir);
    removeTmpDir(outDir);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('keeps only the requests that have the included tag', async () => {
    const output = path.join(outDir, 'include.html');
    await generate.handler({ output, gitLink: false, tags: 'smoke' });
    const html = fs.readFileSync(output, 'utf8');
    expect(html).toContain('SmokeReq');
    expect(html).not.toContain('PlainReq');
  });

  it('excludes a request whose tag is in both include and exclude without erroring (exclude wins, matches bru run)', async () => {
    const output = path.join(outDir, 'overlap.html');
    await generate.handler({ output, gitLink: false, tags: 'smoke', excludeTags: 'smoke' });
    const html = fs.readFileSync(output, 'utf8');
    expect(html).not.toContain('SmokeReq');
  });

  it('drops the requests that have the excluded tag and keeps the others', async () => {
    const output = path.join(outDir, 'exclude.html');
    await generate.handler({ output, gitLink: false, excludeTags: 'smoke' });
    const html = fs.readFileSync(output, 'utf8');
    expect(html).toContain('PlainReq');
    expect(html).not.toContain('SmokeReq');
  });

  it('keeps requests matching any tag given as a repeated --tags flag', async () => {
    const output = path.join(outDir, 'include-repeat.html');
    await generate.handler({ output, gitLink: false, tags: ['smoke', 'wip'] });
    const html = fs.readFileSync(output, 'utf8');
    expect(html).toContain('SmokeReq');
    expect(html).toContain('WipReq');
    expect(html).not.toContain('PlainReq');
  });

  it('splits comma-separated tags within a repeated --tags flag too', async () => {
    const output = path.join(outDir, 'include-mixed.html');
    await generate.handler({ output, gitLink: false, tags: ['smoke,wip'] });
    const html = fs.readFileSync(output, 'utf8');
    expect(html).toContain('SmokeReq');
    expect(html).toContain('WipReq');
    expect(html).not.toContain('PlainReq');
  });

  it('drops requests matching any tag given as a repeated --exclude-tags flag', async () => {
    const output = path.join(outDir, 'exclude-repeat.html');
    await generate.handler({ output, gitLink: false, excludeTags: ['smoke', 'wip'] });
    const html = fs.readFileSync(output, 'utf8');
    expect(html).toContain('PlainReq');
    expect(html).not.toContain('SmokeReq');
    expect(html).not.toContain('WipReq');
  });

  it('accepts repeated --tags flags each with comma-separated values', async () => {
    const output = path.join(outDir, 'tags-repeat-comma.html');
    await generate.handler({ output, gitLink: false, tags: ['smoke,wip', 'smoke'] });
    const html = fs.readFileSync(output, 'utf8');
    expect(html).toContain('SmokeReq');
    expect(html).toContain('WipReq');
    expect(html).not.toContain('PlainReq');
  });
});

describe('bru docs generate: tag filtering on a yml collection', () => {
  let originalCwd;
  let collDir;
  let outDir;

  const writeYmlRequest = (dir, name, tags) => {
    const tagLines = tags && tags.length ? `\n  tags:\n${tags.map((t) => `    - ${t}`).join('\n')}` : '';
    fs.writeFileSync(
      path.join(dir, `${name}.yml`),
      `info:\n  name: ${name}\n  type: http\n  seq: 1${tagLines}\n\nhttp:\n  method: GET\n  url: https://example.com/${name}\n`
    );
  };

  beforeAll(() => {
    originalCwd = process.cwd();
    collDir = fs.mkdtempSync(path.join(os.tmpdir(), 'bru-docs-yml-tags-'));
    fs.writeFileSync(path.join(collDir, 'opencollection.yml'), 'opencollection: "1.0.0"\ninfo:\n  name: ymltagcoll\n');
    writeYmlRequest(collDir, 'SmokeReq', ['smoke']);
    writeYmlRequest(collDir, 'WipReq', ['wip']);
    outDir = fs.mkdtempSync(path.join(os.tmpdir(), 'bru-docs-yml-tags-out-'));
    process.chdir(collDir);
  });

  afterAll(() => {
    process.chdir(originalCwd);
    removeTmpDir(collDir);
    removeTmpDir(outDir);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('keeps the tagged request instead of dropping every yml request', async () => {
    const output = path.join(outDir, 'yml-include.html');
    await generate.handler({ output, gitLink: false, tags: 'smoke' });
    const html = fs.readFileSync(output, 'utf8');
    expect(html).toContain('SmokeReq');
    expect(html).not.toContain('WipReq');
  });

  it('drops the yml request carrying the excluded tag and keeps the others', async () => {
    const output = path.join(outDir, 'yml-exclude.html');
    await generate.handler({ output, gitLink: false, excludeTags: 'wip' });
    const html = fs.readFileSync(output, 'utf8');
    expect(html).toContain('SmokeReq');
    expect(html).not.toContain('WipReq');
  });
});

describe('bru docs generate: git link', () => {
  let originalCwd;
  let collDir;
  let outDir;

  beforeAll(() => {
    originalCwd = process.cwd();
    collDir = fs.mkdtempSync(path.join(os.tmpdir(), 'bru-docs-git-'));
    fs.cpSync(FIXTURE, collDir, { recursive: true });
    execSync('git init', { cwd: collDir, stdio: 'ignore' });
    execSync('git remote add origin https://example.com/team/repo.git', { cwd: collDir, stdio: 'ignore' });
    outDir = fs.mkdtempSync(path.join(os.tmpdir(), 'bru-docs-git-out-'));
    process.chdir(collDir);
  });

  afterAll(() => {
    process.chdir(originalCwd);
    removeTmpDir(collDir);
    removeTmpDir(outDir);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('includes the git repo url when --git-link is on', async () => {
    const output = path.join(outDir, 'git.html');
    await generate.handler({ output, gitLink: true });
    const html = fs.readFileSync(output, 'utf8');
    expect(html).toContain('gitCollectionUrl');
    expect(html).toContain('https://example.com/team/repo.git');
  });

  it('warns when --git-link is explicitly passed but there is no origin remote', async () => {
    const warnSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    const noOriginDir = fs.mkdtempSync(path.join(os.tmpdir(), 'bru-docs-noorigin-'));
    fs.cpSync(FIXTURE, noOriginDir, { recursive: true });
    execSync('git init', { cwd: noOriginDir, stdio: 'ignore' });
    const prevCwd = process.cwd();
    process.chdir(noOriginDir);
    try {
      const output = path.join(outDir, 'no-origin.html');
      await generate.handler({ output, gitLink: true });
      expect(fs.existsSync(output)).toBe(true);
      const message = warnSpy.mock.calls.map((args) => args.join(' ')).join('\n');
      expect(message).toContain('No git remote \'origin\' found');
    } finally {
      process.chdir(prevCwd);
      removeTmpDir(noOriginDir);
    }
  });

  it('does not warn about the git link when it is on by default (not explicitly passed)', async () => {
    const warnSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    const noOriginDir = fs.mkdtempSync(path.join(os.tmpdir(), 'bru-docs-implicit-'));
    fs.cpSync(FIXTURE, noOriginDir, { recursive: true });
    execSync('git init', { cwd: noOriginDir, stdio: 'ignore' });
    const prevCwd = process.cwd();
    process.chdir(noOriginDir);
    try {
      const output = path.join(outDir, 'implicit.html');
      await generate.handler({ output });
      expect(fs.existsSync(output)).toBe(true);
      const message = warnSpy.mock.calls.map((args) => args.join(' ')).join('\n');
      expect(message).not.toContain('No git remote');
    } finally {
      process.chdir(prevCwd);
      removeTmpDir(noOriginDir);
    }
  });
});

describe('bru docs generate: default output path', () => {
  let originalCwd;
  let collDir;

  beforeAll(() => {
    originalCwd = process.cwd();
    collDir = fs.mkdtempSync(path.join(os.tmpdir(), 'bru-docs-default-'));
    fs.cpSync(FIXTURE, collDir, { recursive: true });
    process.chdir(collDir);
  });

  afterAll(() => {
    process.chdir(originalCwd);
    removeTmpDir(collDir);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('writes <collection-name>-documentation.html to the cwd when --output is not given', async () => {
    await generate.handler({ gitLink: false });
    expect(fs.existsSync(path.join(collDir, 'collection-documentation.html'))).toBe(true);
  });
});

describe('bru docs generate: yml (OpenCollection) collection', () => {
  let originalCwd;
  let collDir;
  let outDir;

  beforeAll(() => {
    originalCwd = process.cwd();
    collDir = copyFixtureToTmpDir(YML_FIXTURE, 'docs-yml');
    outDir = createTmpDir('docs-yml-out');
    process.chdir(collDir);
  });

  afterAll(() => {
    process.chdir(originalCwd);
    removeTmpDir(collDir);
    removeTmpDir(outDir);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('uses the collection name as the document title', async () => {
    const output = path.join(outDir, 'title.html');
    await generate.handler({ output, gitLink: false });
    const html = fs.readFileSync(output, 'utf8');
    expect(html).toContain('<title>ymlcollection - API Documentation</title>');
    expect(html).toContain('new window.OpenCollection');
  });

  it('shows the collection version from the OpenCollection info.version', async () => {
    const output = path.join(outDir, 'yml-version.html');
    await generate.handler({ output, gitLink: false });
    const html = fs.readFileSync(output, 'utf8');
    expect(html).toContain('version: 3.4.0');
  });

  it('documents the top-level requests and folders', async () => {
    const output = path.join(outDir, 'structure.html');
    await generate.handler({ output, gitLink: false });
    const html = fs.readFileSync(output, 'utf8');
    expect(html).toContain('request_1');
    expect(html).toContain('request_2');
    expect(html).toContain('folder_1');
    expect(html).toContain('folder_2');
  });

  it('keeps only the tagged request when filtering by tag', async () => {
    const taggedDir = copyFixtureToTmpDir(YML_FIXTURE, 'docs-yml-tag');
    fs.writeFileSync(
      path.join(taggedDir, 'request_1.yml'),
      'info:\n  name: request_1\n  type: http\n  seq: 1\n  tags:\n    - smoke\n\nhttp:\n  method: GET\n  url: https://api.example.com/one\n'
    );
    const prevCwd = process.cwd();
    process.chdir(taggedDir);
    try {
      const output = path.join(outDir, 'yml-tagged.html');
      await generate.handler({ output, gitLink: false, tags: 'smoke' });
      const html = fs.readFileSync(output, 'utf8');
      expect(html).toContain('request_1');
      expect(html).not.toContain('request_2');
    } finally {
      process.chdir(prevCwd);
      removeTmpDir(taggedDir);
    }
  });

  it('writes <collection-name>-documentation.html to the cwd when --output is not given', async () => {
    await generate.handler({ gitLink: false });
    expect(fs.existsSync(path.join(collDir, 'ymlcollection-documentation.html'))).toBe(true);
  });
});

describe('resolveEnvironments', () => {
  const envs = [{ name: 'Prod' }, { name: 'Dev' }, { name: 'QA' }];
  const opts = (over) => ({ includeEnvs: [], excludeEnvs: [], allEnvs: false, ...over });

  it('selects nothing by default', () => {
    expect(generate.resolveEnvironments(envs, opts())).toEqual({ environments: [] });
  });

  it('selects every environment with allEnvs', () => {
    expect(generate.resolveEnvironments(envs, opts({ allEnvs: true })).environments.map((e) => e.name)).toEqual([
      'Prod',
      'Dev',
      'QA'
    ]);
  });

  it('keeps only the included environments, in the order given', () => {
    const result = generate.resolveEnvironments(envs, opts({ includeEnvs: ['QA', 'Prod'] }));
    expect(result.environments.map((e) => e.name)).toEqual(['QA', 'Prod']);
  });

  it('embeds nothing when only excludeEnvs is given (exclude needs a base)', () => {
    expect(generate.resolveEnvironments(envs, opts({ excludeEnvs: ['Dev'] })).environments).toEqual([]);
  });

  it('with allEnvs, drops the excluded environments from the full set', () => {
    const result = generate.resolveEnvironments(envs, opts({ allEnvs: true, excludeEnvs: ['Dev'] }));
    expect(result.environments.map((e) => e.name)).toEqual(['Prod', 'QA']);
  });

  it('errors on an unknown --exclude-envs name given alongside --envs', () => {
    const result = generate.resolveEnvironments(envs, opts({ includeEnvs: ['Prod', 'Dev', 'QA'], excludeEnvs: ['Nope'] }));
    expect(result.error.exitCode).toBe(EXIT_STATUS.ERROR_ENV_NOT_FOUND);
    expect(result.error.message).toContain('Environment not found');
    expect(result.error.message).toContain('Nope');
  });

  it('errors when an excluded environment does not exist alongside allEnvs', () => {
    const result = generate.resolveEnvironments(envs, opts({ allEnvs: true, excludeEnvs: ['Nope'] }));
    expect(result.error.exitCode).toBe(EXIT_STATUS.ERROR_ENV_NOT_FOUND);
    expect(result.error.message).toContain('Nope');
  });

  it('errors on an unknown --exclude-envs name given on its own, with no --envs or --all-envs base to filter', () => {
    const result = generate.resolveEnvironments(envs, opts({ excludeEnvs: ['Nope'] }));
    expect(result.error.exitCode).toBe(EXIT_STATUS.ERROR_ENV_NOT_FOUND);
    expect(result.error.message).toContain('Nope');
  });

  it('lists every unknown excluded environment name in a single error', () => {
    const result = generate.resolveEnvironments(envs, opts({ allEnvs: true, excludeEnvs: ['NopeOne', 'NopeTwo'] }));
    expect(result.error.exitCode).toBe(EXIT_STATUS.ERROR_ENV_NOT_FOUND);
    expect(result.error.message).toContain('Environments not found');
    expect(result.error.message).toContain('NopeOne');
    expect(result.error.message).toContain('NopeTwo');
  });

  it('lists unknown names from both --envs and --exclude-envs together in a single error', () => {
    const result = generate.resolveEnvironments(envs, opts({ includeEnvs: ['BadInclude'], excludeEnvs: ['BadExclude'] }));
    expect(result.error.exitCode).toBe(EXIT_STATUS.ERROR_ENV_NOT_FOUND);
    expect(result.error.message).toContain('BadInclude');
    expect(result.error.message).toContain('BadExclude');
  });

  it('reports a name passed to both --envs and --exclude-envs only once', () => {
    const result = generate.resolveEnvironments(envs, opts({ includeEnvs: ['Nope'], excludeEnvs: ['Nope'] }));
    expect(result.error.exitCode).toBe(EXIT_STATUS.ERROR_ENV_NOT_FOUND);
    expect(result.error.message).toContain('Environment not found');
    expect(result.error.message).not.toContain('Environments not found');
    expect(result.error.message.match(/Nope/g)).toHaveLength(1);
  });

  it('drops an included environment that is also excluded (exclude wins, no error)', () => {
    const result = generate.resolveEnvironments(envs, opts({ includeEnvs: ['Prod', 'Dev', 'QA'], excludeEnvs: ['Dev'] }));
    expect(result.error).toBeUndefined();
    expect(result.environments.map((e) => e.name)).toEqual(['Prod', 'QA']);
  });

  it('does not error on a valid --exclude-envs name that is absent from the --envs list', () => {
    const result = generate.resolveEnvironments(envs, opts({ includeEnvs: ['Prod'], excludeEnvs: ['Dev'] }));
    expect(result.error).toBeUndefined();
    expect(result.environments.map((e) => e.name)).toEqual(['Prod']);
  });

  it('resolves to zero environments when the only included env is also excluded (exclude wins)', () => {
    const result = generate.resolveEnvironments(envs, opts({ includeEnvs: ['Prod'], excludeEnvs: ['Prod'] }));
    expect(result).toEqual({ environments: [] });
  });

  it('resolves to zero environments when --all-envs excludes every environment (no error)', () => {
    const result = generate.resolveEnvironments(envs, opts({ allEnvs: true, excludeEnvs: ['Prod', 'Dev', 'QA'] }));
    expect(result).toEqual({ environments: [] });
  });

  it('resolves to zero environments when the collection has no environments (empty list), even with --all-envs', () => {
    expect(generate.resolveEnvironments([], opts())).toEqual({ environments: [] });
    expect(generate.resolveEnvironments([], opts({ allEnvs: true }))).toEqual({ environments: [] });
  });

  it('errors when allEnvs is combined with an include list', () => {
    const result = generate.resolveEnvironments(envs, opts({ allEnvs: true, includeEnvs: ['Prod'] }));
    expect(result.error.exitCode).toBe(EXIT_STATUS.ERROR_GENERIC);
    expect(result.error.message).toContain('--all-envs cannot be combined with --envs');
  });

  it('errors with the not-found code when a named environment does not exist', () => {
    const result = generate.resolveEnvironments(envs, opts({ includeEnvs: ['Nope'] }));
    expect(result.error.exitCode).toBe(EXIT_STATUS.ERROR_ENV_NOT_FOUND);
    expect(result.error.message).toContain('Environment not found');
    expect(result.error.message).not.toContain('Environments not found');
  });
});
