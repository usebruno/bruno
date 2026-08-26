const path = require('path');
const fs = require('fs');
const os = require('os');
const { execSync } = require('child_process');
const { describe, it, expect, beforeAll, afterAll, afterEach } = require('@jest/globals');
const generate = require('../../src/commands/docs/generate');

const FIXTURE = path.resolve(__dirname, '../runner/fixtures/collection-json-from-pathname/collection');

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
    fs.rmSync(outDir, { recursive: true, force: true });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('uses the collection name as the document title', async () => {
    const output = path.join(outDir, 'a.html');
    await generate.handler({ output, gitLink: false, format: 'html' });

    const html = fs.readFileSync(output, 'utf8');
    expect(html).toContain('<title>collection - API Documentation</title>');
    expect(html).toContain('new window.OpenCollection');
    expect(html).toContain('const collectionData =');
  });

  it('leaves out the git repo url when --no-git-link is used', async () => {
    const output = path.join(outDir, 'b.html');
    await generate.handler({ output, gitLink: false, format: 'html' });
    expect(fs.readFileSync(output, 'utf8')).not.toContain('gitCollectionUrl');
  });

  it('still writes a smaller but valid doc when no request matches the tag filter', async () => {
    const all = path.join(outDir, 'all.html');
    const filtered = path.join(outDir, 'filtered.html');
    await generate.handler({ output: all, gitLink: false, format: 'html' });
    await generate.handler({ output: filtered, gitLink: false, format: 'html', tags: 'nonexistent-tag' });

    const allHtml = fs.readFileSync(all, 'utf8');
    const filteredHtml = fs.readFileSync(filtered, 'utf8');
    expect(filteredHtml.length).toBeLessThan(allHtml.length);
    expect(filteredHtml).toContain('new window.OpenCollection');
  });

  it('creates any missing folders in the output path', async () => {
    const output = path.join(outDir, 'nested', 'deep', 'c.html');
    await generate.handler({ output, gitLink: false, format: 'html' });
    expect(fs.existsSync(output)).toBe(true);
  });

  it('exits with an error when the format is not html', async () => {
    const exitSpy = mockExit();

    await expect(generate.handler({ format: 'pdf' })).rejects.toThrow();
    expect(exitSpy).toHaveBeenNthCalledWith(1, 9);
  });

  it('errors when the same tag is both included and excluded', async () => {
    const exitSpy = mockExit();

    await expect(
      generate.handler({ gitLink: false, format: 'html', tags: 'smoke', excludeTags: 'smoke' })
    ).rejects.toThrow();
    expect(exitSpy).toHaveBeenNthCalledWith(1, 255);
  });

  it('errors when the same environment is both included and excluded', async () => {
    const exitSpy = mockExit();

    await expect(
      generate.handler({ gitLink: false, format: 'html', envs: 'Production', excludeEnvs: 'Production' })
    ).rejects.toThrow();
    expect(exitSpy).toHaveBeenNthCalledWith(1, 255);
  });

  it('exits with the invalid-file code when an environment file cannot be parsed', async () => {
    const exitSpy = mockExit();
    const badDir = fs.mkdtempSync(path.join(os.tmpdir(), 'bru-docs-badenv-'));
    fs.cpSync(FIXTURE, badDir, { recursive: true });
    fs.mkdirSync(path.join(badDir, 'environments'), { recursive: true });
    fs.writeFileSync(path.join(badDir, 'environments', 'Broken.json'), '{ not valid json');
    const prevCwd = process.cwd();
    process.chdir(badDir);
    try {
      await expect(
        generate.handler({ output: path.join(badDir, 'x.html'), gitLink: false, format: 'html' })
      ).rejects.toThrow();
      expect(exitSpy).toHaveBeenNthCalledWith(1, 10);
    } finally {
      process.chdir(prevCwd);
      fs.rmSync(badDir, { recursive: true, force: true });
    }
  });
});

describe('bru docs generate: environment selection', () => {
  let originalCwd;
  let collDir;
  let outDir;

  const writeEnv = (dir, name, host) =>
    fs.writeFileSync(
      path.join(dir, `${name}.json`),
      JSON.stringify({ name, variables: [{ name: 'BASE_URL', value: host, enabled: true }] })
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
    fs.rmSync(collDir, { recursive: true, force: true });
    fs.rmSync(outDir, { recursive: true, force: true });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('includes only the environments listed in --envs', async () => {
    const output = path.join(outDir, 'envs.html');
    await generate.handler({ output, gitLink: false, format: 'html', envs: 'Production' });
    const html = fs.readFileSync(output, 'utf8');
    expect(html).toContain('Production');
    expect(html).not.toContain('Staging');
  });

  it('embeds the environments in the order given to --envs', async () => {
    const output = path.join(outDir, 'order.html');
    await generate.handler({ output, gitLink: false, format: 'html', envs: 'Staging,Production' });
    const html = fs.readFileSync(output, 'utf8');
    expect(html.indexOf('Staging')).toBeLessThan(html.indexOf('Production'));
  });

  it('embeds an environment once even when --envs repeats it', async () => {
    const output = path.join(outDir, 'dup.html');
    await generate.handler({ output, gitLink: false, format: 'html', envs: 'Production,Production' });
    const html = fs.readFileSync(output, 'utf8');
    expect((html.match(/name: Production/g) || []).length).toBe(1);
  });

  it('includes every environment except the ones in --exclude-envs', async () => {
    const output = path.join(outDir, 'exclude.html');
    await generate.handler({ output, gitLink: false, format: 'html', excludeEnvs: 'Production' });
    const html = fs.readFileSync(output, 'utf8');
    expect(html).toContain('Staging');
    expect(html).not.toContain('Production');
  });

  it('errors when --envs names an environment that does not exist', async () => {
    const exitSpy = mockExit();

    await expect(
      generate.handler({ output: path.join(outDir, 'x.html'), gitLink: false, format: 'html', envs: 'DoesNotExist' })
    ).rejects.toThrow();
    expect(exitSpy).toHaveBeenNthCalledWith(1, 6);
  });

  it('lists every unknown environment name in a single error', async () => {
    const exitSpy = mockExit();

    await expect(
      generate.handler({ output: path.join(outDir, 'x.html'), gitLink: false, format: 'html', envs: 'NopeOne,NopeTwo' })
    ).rejects.toThrow();
    expect(exitSpy).toHaveBeenNthCalledWith(1, 6);
    const message = console.error.mock.calls.map((args) => args.join(' ')).join('\n');
    expect(message).toContain('NopeOne');
    expect(message).toContain('NopeTwo');
  });

  it('errors when --exclude-envs names an environment that does not exist', async () => {
    const exitSpy = mockExit();

    await expect(
      generate.handler({ output: path.join(outDir, 'y.html'), gitLink: false, format: 'html', excludeEnvs: 'DoesNotExist' })
    ).rejects.toThrow();
    expect(exitSpy).toHaveBeenNthCalledWith(1, 6);
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
    writeRequest(collDir, 'PlainReq', null);
    outDir = fs.mkdtempSync(path.join(os.tmpdir(), 'bru-docs-tags-out-'));
    process.chdir(collDir);
  });

  afterAll(() => {
    process.chdir(originalCwd);
    fs.rmSync(collDir, { recursive: true, force: true });
    fs.rmSync(outDir, { recursive: true, force: true });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('keeps only the requests that have the included tag', async () => {
    const output = path.join(outDir, 'include.html');
    await generate.handler({ output, gitLink: false, format: 'html', tags: 'smoke' });
    const html = fs.readFileSync(output, 'utf8');
    expect(html).toContain('SmokeReq');
    expect(html).not.toContain('PlainReq');
  });

  it('drops the requests that have the excluded tag and keeps the others', async () => {
    const output = path.join(outDir, 'exclude.html');
    await generate.handler({ output, gitLink: false, format: 'html', excludeTags: 'smoke' });
    const html = fs.readFileSync(output, 'utf8');
    expect(html).toContain('PlainReq');
    expect(html).not.toContain('SmokeReq');
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
    fs.rmSync(collDir, { recursive: true, force: true });
    fs.rmSync(outDir, { recursive: true, force: true });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('includes the git repo url when --git-link is on', async () => {
    const output = path.join(outDir, 'git.html');
    await generate.handler({ output, gitLink: true, format: 'html' });
    const html = fs.readFileSync(output, 'utf8');
    expect(html).toContain('gitCollectionUrl');
    expect(html).toContain('https://example.com/team/repo.git');
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
    fs.rmSync(collDir, { recursive: true, force: true });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('writes <collection-name>-documentation.html to the cwd when --output is not given', async () => {
    await generate.handler({ gitLink: false, format: 'html' });
    expect(fs.existsSync(path.join(collDir, 'collection-documentation.html'))).toBe(true);
  });
});
