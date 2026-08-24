const path = require('path');
const fs = require('fs');
const os = require('os');
const { describe, it, expect, beforeAll, afterAll } = require('@jest/globals');
const generate = require('../../src/commands/docs/generate');

const FIXTURE = path.resolve(__dirname, '../runner/fixtures/collection-json-from-pathname/collection');

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

  it('generates a standalone HTML doc titled with the collection name (not "Untitled")', async () => {
    const output = path.join(outDir, 'a.html');
    await generate.handler({ output, gitLink: false, format: 'html' });

    const html = fs.readFileSync(output, 'utf8');
    expect(html).toContain('<title>collection - API Documentation</title>');
    expect(html).toContain('new window.OpenCollection');
    expect(html).toContain('const collectionData =');
  });

  it('omits gitCollectionUrl when --no-git-link is passed', async () => {
    const output = path.join(outDir, 'b.html');
    await generate.handler({ output, gitLink: false, format: 'html' });
    expect(fs.readFileSync(output, 'utf8')).not.toContain('gitCollectionUrl');
  });

  it('drops requests that do not match an include tag, keeping a valid document', async () => {
    const all = path.join(outDir, 'all.html');
    const filtered = path.join(outDir, 'filtered.html');
    await generate.handler({ output: all, gitLink: false, format: 'html' });
    await generate.handler({ output: filtered, gitLink: false, format: 'html', tags: 'nonexistent-tag' });

    const allHtml = fs.readFileSync(all, 'utf8');
    const filteredHtml = fs.readFileSync(filtered, 'utf8');
    expect(filteredHtml.length).toBeLessThan(allHtml.length);
    expect(filteredHtml).toContain('new window.OpenCollection');
  });

  it('creates parent directories for the output path', async () => {
    const output = path.join(outDir, 'nested', 'deep', 'c.html');
    await generate.handler({ output, gitLink: false, format: 'html' });
    expect(fs.existsSync(output)).toBe(true);
  });

  it('rejects an unsupported --format with the incorrect-output-format exit code', async () => {
    const exitSpy = jest.spyOn(process, 'exit').mockImplementation((code) => {
      throw new Error(`exit:${code}`);
    });
    const errSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

    await expect(generate.handler({ format: 'pdf' })).rejects.toThrow();
    expect(exitSpy).toHaveBeenNthCalledWith(1, 9);

    exitSpy.mockRestore();
    errSpy.mockRestore();
  });

  it('writes <collection-name>-documentation.html to the cwd when --output is omitted', async () => {
    const expected = path.join(FIXTURE, 'collection-documentation.html');
    try {
      await generate.handler({ gitLink: false, format: 'html' });
      expect(fs.existsSync(expected)).toBe(true);
    } finally {
      fs.rmSync(expected, { force: true });
    }
  });

  it('errors when a tag is passed to both --tags and --exclude-tags', async () => {
    const exitSpy = jest.spyOn(process, 'exit').mockImplementation((code) => {
      throw new Error(`exit:${code}`);
    });
    const errSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

    await expect(
      generate.handler({ gitLink: false, format: 'html', tags: 'smoke', excludeTags: 'smoke' })
    ).rejects.toThrow();
    expect(exitSpy).toHaveBeenNthCalledWith(1, 255);

    exitSpy.mockRestore();
    errSpy.mockRestore();
  });

  it('errors when an environment is passed to both --envs and --exclude-envs', async () => {
    const exitSpy = jest.spyOn(process, 'exit').mockImplementation((code) => {
      throw new Error(`exit:${code}`);
    });
    const errSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

    await expect(
      generate.handler({ gitLink: false, format: 'html', envs: 'Production', excludeEnvs: 'Production' })
    ).rejects.toThrow();
    expect(exitSpy).toHaveBeenNthCalledWith(1, 255);

    exitSpy.mockRestore();
    errSpy.mockRestore();
  });
});

describe('bru docs generate — environment selection', () => {
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

  it('embeds only the environments named by --envs', async () => {
    const output = path.join(outDir, 'envs.html');
    await generate.handler({ output, gitLink: false, format: 'html', envs: 'Production' });
    const html = fs.readFileSync(output, 'utf8');
    expect(html).toContain('Production');
    expect(html).not.toContain('Staging');
  });

  it('treats --exclude-envs on its own as all-but-excluded', async () => {
    const output = path.join(outDir, 'exclude.html');
    await generate.handler({ output, gitLink: false, format: 'html', excludeEnvs: 'Production' });
    const html = fs.readFileSync(output, 'utf8');
    expect(html).toContain('Staging');
    expect(html).not.toContain('Production');
  });

  it('exits with the environment-not-found code for an unknown --envs name', async () => {
    const exitSpy = jest.spyOn(process, 'exit').mockImplementation((code) => {
      throw new Error(`exit:${code}`);
    });
    const errSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

    await expect(
      generate.handler({ output: path.join(outDir, 'x.html'), gitLink: false, format: 'html', envs: 'DoesNotExist' })
    ).rejects.toThrow();
    expect(exitSpy).toHaveBeenNthCalledWith(1, 6);

    exitSpy.mockRestore();
    errSpy.mockRestore();
  });
});
