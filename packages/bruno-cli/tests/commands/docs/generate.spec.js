'use strict';
/**
 * packages/bruno-cli/tests/commands/docs/generate.spec.js
 *
 * Tests for the docs/generate command pipeline.
 * Mirrors the test style used in the existing CLI (Jest + in-memory fixtures).
 *
 * Run with:
 *   cd packages/bruno-cli
 *   npx jest tests/commands/docs
 */

const path = require('path');
const fs = require('fs');
const os = require('os');

// ── Module under test ─────────────────────────────────────────────────────────
const { loadCollection } = require('../../../src/docs/load-collection');
const { buildYaml, validateYaml } = require('../../../src/docs/build-yaml');
const { renderHtml } = require('../../../src/docs/render-html');
const { assertCollectionRoot, resolveOutput, ensureDir } = require('../../../src/docs/fs-helpers');

// ── Fixture helpers ───────────────────────────────────────────────────────────

/**
 * Creates a minimal OpenCollection YAML collection in a temp directory.
 * Returns the temp dir path.
 */
function createOcFixture(overrides = {}) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'bruno-docs-test-'));

  fs.writeFileSync(
    path.join(dir, 'opencollection.yml'),
    `info:\n  name: ${overrides.name || 'Test API'}\n  version: '1.0.0'\n`
  );

  fs.mkdirSync(path.join(dir, 'environments'), { recursive: true });
  fs.writeFileSync(
    path.join(dir, 'environments', 'DEV.yml'),
    `name: DEV\nvariables:\n  - name: base_url\n    value: https://api.dev.example.com\n    enabled: true\n`
  );

  fs.mkdirSync(path.join(dir, 'users'), { recursive: true });
  fs.writeFileSync(
    path.join(dir, 'users', 'folder.yml'),
    `meta:\n  name: Users\n  seq: 1\n`
  );
  fs.writeFileSync(
    path.join(dir, 'users', 'list-users.yml'),
    `info:\n  name: List users\n  type: http\n  seq: 1\nhttp:\n  method: GET\n  url: "{{base_url}}/users"\n  headers:\n    - name: Authorization\n      value: "Bearer {{token}}"\ndocs:\n  description: Returns all users.\nexamples:\n  - name: Success\n    response:\n      status: 200\n      body:\n        users: []\n`
  );
  fs.writeFileSync(
    path.join(dir, 'users', 'create-user.yml'),
    `info:\n  name: Create user\n  type: http\n  seq: 2\nhttp:\n  method: POST\n  url: "{{base_url}}/users"\n  headers:\n    - name: Content-Type\n      value: application/json\n  body:\n    type: json\n    data: |-\n      {"name":"Alice","email":"alice@example.com"}\nruntime:\n  scripts:\n    - type: post-response\n      code: |-\n        bru.setEnvVar("userId", res.body.id);\n`
  );

  return dir;
}

afterEach(() => {
  // Cleanup is optional in unit tests; tmp dirs are removed on OS restart.
});

// ── fs-helpers ────────────────────────────────────────────────────────────────

describe('fs-helpers', () => {
  describe('assertCollectionRoot', () => {
    it('accepts a valid OpenCollection directory', () => {
      const dir = createOcFixture();
      expect(() => assertCollectionRoot(dir)).not.toThrow();
    });

    it('throws when the path does not exist', () => {
      expect(() => assertCollectionRoot('/tmp/does-not-exist-bruno-test')).toThrow(
        /does not exist/i
      );
    });

    it('throws when the path is a file, not a directory', () => {
      const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'bruno-file-test-'));
      const file = path.join(tmp, 'file.txt');
      fs.writeFileSync(file, '');
      expect(() => assertCollectionRoot(file)).toThrow(/not a directory/i);
    });

    it('throws when neither opencollection.yml nor bruno.json is present', () => {
      const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'bruno-empty-'));
      expect(() => assertCollectionRoot(tmp)).toThrow(/not a Bruno collection/i);
    });
  });

  describe('resolveOutput', () => {
    it('resolves relative paths against cwd', () => {
      const result = resolveOutput('docs/index.html');
      expect(result).toBe(path.resolve('docs/index.html'));
    });

    it('passes through absolute paths unchanged', () => {
      const abs = path.join(os.tmpdir(), 'my-docs.html');
      expect(resolveOutput(abs)).toBe(abs);
    });
  });

  describe('ensureDir', () => {
    it('creates nested directories that do not exist', () => {
      const target = path.join(os.tmpdir(), `bruno-ensureDir-${Date.now()}`, 'a', 'b', 'c');
      ensureDir(target);
      expect(fs.existsSync(target)).toBe(true);
    });

    it('does not throw when directory already exists', () => {
      const existing = os.tmpdir();
      expect(() => ensureDir(existing)).not.toThrow();
    });
  });
});

// ── load-collection ───────────────────────────────────────────────────────────

describe('load-collection', () => {
  it('returns a collection with correct info', () => {
    const dir = createOcFixture({ name: 'My API' });
    const col = loadCollection(dir);
    expect(col.info.name).toBe('My API');
    expect(col.opencollection).toBe('1.0.0');
  });

  it('respects titleOverride', () => {
    const dir = createOcFixture({ name: 'My API' });
    const col = loadCollection(dir, { titleOverride: 'Overridden Title' });
    expect(col.info.name).toBe('Overridden Title');
  });

  it('loads environments', () => {
    const dir = createOcFixture();
    const col = loadCollection(dir);
    expect(col.environments).toHaveLength(1);
    expect(col.environments[0].name).toBe('DEV');
    expect(col.environments[0].variables[0].name).toBe('base_url');
  });

  it('loads folders and requests recursively', () => {
    const dir = createOcFixture();
    const col = loadCollection(dir);
    expect(col.items).toHaveLength(1); // 1 folder: users
    expect(col.items[0].type).toBe('folder');
    expect(col.items[0].name).toBe('Users');
    expect(col.items[0].items).toHaveLength(2); // 2 requests
  });

  it('parses request fields: method, url, headers, body, runtime', () => {
    const dir = createOcFixture();
    const col = loadCollection(dir);
    const folder = col.items[0];
    const create = folder.items.find((r) => r.info.name === 'Create user');

    expect(create.http.method).toBe('POST');
    expect(create.http.url).toMatch(/{{base_url}}\/users/);
    expect(create.http.body.type).toBe('json');
    expect(create.runtime.scripts).toHaveLength(1);
    expect(create.runtime.scripts[0].type).toBe('post-response');
  });

  it('preserves {{variable}} placeholders in values', () => {
    const dir = createOcFixture();
    const col = loadCollection(dir);
    const list = col.items[0].items.find((r) => r.info.name === 'List users');
    const authH = list.http.headers.find((h) => h.name === 'Authorization');
    expect(authH.value).toBe('Bearer {{token}}');
  });

  it('maintains seq ordering within folders', () => {
    const dir = createOcFixture();
    const col = loadCollection(dir);
    const reqs = col.items[0].items;
    expect(reqs[0].info.seq).toBeLessThanOrEqual(reqs[1].info.seq);
  });
});

// ── build-yaml ────────────────────────────────────────────────────────────────

describe('build-yaml', () => {
  it('produces valid YAML', () => {
    const dir = createOcFixture();
    const col = loadCollection(dir);
    const str = buildYaml(col);
    expect(validateYaml(str)).toEqual({ valid: true });
  });

  it('round-trips: parsed YAML contains expected fields', () => {
    const yaml = require('js-yaml');
    const dir = createOcFixture({ name: 'Round-trip API' });
    const col = loadCollection(dir);
    const str = buildYaml(col);
    const parsed = yaml.load(str);

    expect(parsed.opencollection).toBe('1.0.0');
    expect(parsed.info.name).toBe('Round-trip API');
    expect(parsed.environments[0].name).toBe('DEV');
    expect(parsed.items[0].type).toBe('folder');
  });

  it('preserves multiline body data in the YAML output', () => {
    const dir = createOcFixture();
    const col = loadCollection(dir);
    const str = buildYaml(col);
    // The body data field should appear in the YAML output
    expect(str).toContain('data:');
    expect(str).toContain('alice@example.com');
  });

  it('preserves {{variable}} placeholders in the YAML', () => {
    const dir = createOcFixture();
    const col = loadCollection(dir);
    const str = buildYaml(col);
    expect(str).toContain('{{base_url}}');
    expect(str).toContain('{{token}}');
  });

  it('serializes post-response scripts', () => {
    const dir = createOcFixture();
    const col = loadCollection(dir);
    const str = buildYaml(col);
    expect(str).toContain('post-response');
    expect(str).toContain('bru.setEnvVar');
  });
});

// ── render-html ───────────────────────────────────────────────────────────────

describe('render-html', () => {
  it('produces valid HTML with expected CDN links', () => {
    const html = renderHtml({
      title: 'Test API',
      yamlString: 'opencollection: "1.0.0"\n',
      theme: 'dark',
      gitUrl: ''
    });

    expect(html).toContain('<!DOCTYPE html>');
    expect(html).toContain('cdn.opencollection.com/docs.css');
    expect(html).toContain('cdn.opencollection.com/docs.js');
  });

  it('embeds title in <title> tag', () => {
    const html = renderHtml({ title: 'My <API>', yamlString: '', theme: 'light', gitUrl: '' });
    expect(html).toContain('<title>My &lt;API&gt; - API Documentation</title>');
  });

  it('embeds YAML as JSON-escaped JS string', () => {
    const yaml = 'key: "hello\\nworld"';
    const html = renderHtml({ title: 'X', yamlString: yaml, theme: 'light', gitUrl: '' });
    expect(html).toContain(JSON.stringify(yaml));
  });

  it('includes gitCollectionUrl when provided', () => {
    const html = renderHtml({
      title: 'X',
      yamlString: '',
      theme: 'light',
      gitUrl: 'https://github.com/org/repo'
    });
    expect(html).toContain('https://github.com/org/repo');
  });

  it('does not include gitCollectionUrl when empty', () => {
    const html = renderHtml({ title: 'X', yamlString: '', theme: 'light', gitUrl: '' });
    // The guard var is "" (empty), so the conditional spread produces {}
    expect(html).toContain('gitCollectionUrl = "";');
    expect(html).toContain('gitCollectionUrl ?');
  });

  it('passes the correct theme to the component', () => {
    const dark = renderHtml({ title: 'X', yamlString: '', theme: 'dark', gitUrl: '' });
    const light = renderHtml({ title: 'X', yamlString: '', theme: 'light', gitUrl: '' });
    expect(dark).toContain('"dark"');
    expect(light).toContain('"light"');
  });
});
