const fs = require('fs');
const path = require('path');
const os = require('os');

// The module under test — doesn't exist yet
const { patchSecurityVulnerabilities } = require('./patch-security');

function makeTmpDir() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'bruno-patch-test-'));
}

function writeJson(dir, relPath, obj) {
  const full = path.join(dir, relPath);
  fs.mkdirSync(path.dirname(full), { recursive: true });
  fs.writeFileSync(full, JSON.stringify(obj, null, 2) + '\n');
}

function readJson(dir, relPath) {
  return JSON.parse(fs.readFileSync(path.join(dir, relPath), 'utf8'));
}

function writeFile(dir, relPath, content) {
  const full = path.join(dir, relPath);
  fs.mkdirSync(path.dirname(full), { recursive: true });
  fs.writeFileSync(full, content);
}

function readFile(dir, relPath) {
  return fs.readFileSync(path.join(dir, relPath), 'utf8');
}

afterEach(() => {
  // cleanup handled by OS tmpdir
});

describe('patchSecurityVulnerabilities', () => {
  test('adds security overrides to root package.json', () => {
    const tmp = makeTmpDir();
    writeJson(tmp, 'package.json', {
      name: 'test-root',
      workspaces: ['packages/foo'],
      overrides: { rollup: '3.30.0' }
    });
    writeJson(tmp, 'packages/foo/package.json', { name: 'foo' });

    patchSecurityVulnerabilities(tmp);

    const root = readJson(tmp, 'package.json');
    expect(root.overrides.tar).toBe('>=7.5.11');
    expect(root.overrides.undici).toBe('>=6.24.0');
    expect(root.overrides['fast-xml-parser']).toBe('>=5.5.7');
    expect(root.overrides.pbkdf2).toBe('>=3.1.3');
    // preserves existing overrides
    expect(root.overrides.rollup).toBe('3.30.0');
  });

  test('replaces rollup-plugin-terser with @rollup/plugin-terser in devDependencies', () => {
    const tmp = makeTmpDir();
    writeJson(tmp, 'package.json', {
      name: 'test-root',
      workspaces: ['packages/foo'],
      overrides: {}
    });
    writeJson(tmp, 'packages/foo/package.json', {
      name: 'foo',
      devDependencies: {
        '@rollup/plugin-commonjs': '^23.0.2',
        'rollup-plugin-terser': '^7.0.2'
      }
    });

    patchSecurityVulnerabilities(tmp);

    const pkg = readJson(tmp, 'packages/foo/package.json');
    expect(pkg.devDependencies['rollup-plugin-terser']).toBeUndefined();
    expect(pkg.devDependencies['@rollup/plugin-terser']).toBe('^1.0.0');
    // leaves other deps alone
    expect(pkg.devDependencies['@rollup/plugin-commonjs']).toBe('^23.0.2');
  });

  test('patches rollup.config.js require statement', () => {
    const tmp = makeTmpDir();
    writeJson(tmp, 'package.json', {
      name: 'test-root',
      workspaces: ['packages/foo'],
      overrides: {}
    });
    writeJson(tmp, 'packages/foo/package.json', {
      name: 'foo',
      devDependencies: { 'rollup-plugin-terser': '^7.0.2' }
    });
    writeFile(
      tmp,
      'packages/foo/rollup.config.js',
      "const { terser } = require('rollup-plugin-terser');\nmodule.exports = { plugins: [terser()] };\n"
    );

    patchSecurityVulnerabilities(tmp);

    const config = readFile(tmp, 'packages/foo/rollup.config.js');
    expect(config).toContain("const terser = require('@rollup/plugin-terser')");
    expect(config).not.toContain('rollup-plugin-terser');
  });

  test('updates pinned @aws-sdk/credential-providers version', () => {
    const tmp = makeTmpDir();
    writeJson(tmp, 'package.json', {
      name: 'test-root',
      workspaces: ['packages/foo'],
      overrides: {}
    });
    writeJson(tmp, 'packages/foo/package.json', {
      name: 'foo',
      dependencies: { '@aws-sdk/credential-providers': '3.1017.0' }
    });

    patchSecurityVulnerabilities(tmp);

    const pkg = readJson(tmp, 'packages/foo/package.json');
    expect(pkg.dependencies['@aws-sdk/credential-providers']).toBe('3.1019.0');
  });

  test('is idempotent — running twice produces the same result', () => {
    const tmp = makeTmpDir();
    writeJson(tmp, 'package.json', {
      name: 'test-root',
      workspaces: ['packages/foo'],
      overrides: { rollup: '3.30.0' }
    });
    writeJson(tmp, 'packages/foo/package.json', {
      name: 'foo',
      devDependencies: { 'rollup-plugin-terser': '^7.0.2' },
      dependencies: { '@aws-sdk/credential-providers': '3.1017.0' }
    });
    writeFile(
      tmp,
      'packages/foo/rollup.config.js',
      "const { terser } = require('rollup-plugin-terser');\n"
    );

    patchSecurityVulnerabilities(tmp);
    const afterFirst = readJson(tmp, 'packages/foo/package.json');
    const rootAfterFirst = readJson(tmp, 'package.json');
    const configAfterFirst = readFile(tmp, 'packages/foo/rollup.config.js');

    patchSecurityVulnerabilities(tmp);
    const afterSecond = readJson(tmp, 'packages/foo/package.json');
    const rootAfterSecond = readJson(tmp, 'package.json');
    const configAfterSecond = readFile(tmp, 'packages/foo/rollup.config.js');

    expect(afterSecond).toEqual(afterFirst);
    expect(rootAfterSecond).toEqual(rootAfterFirst);
    expect(configAfterSecond).toBe(configAfterFirst);
  });

  test('handles double-quoted require in rollup config', () => {
    const tmp = makeTmpDir();
    writeJson(tmp, 'package.json', {
      name: 'test-root',
      workspaces: ['packages/foo'],
      overrides: {}
    });
    writeJson(tmp, 'packages/foo/package.json', {
      name: 'foo',
      devDependencies: { 'rollup-plugin-terser': '^7.0.2' }
    });
    writeFile(
      tmp,
      'packages/foo/rollup.config.js',
      'const { terser } = require("rollup-plugin-terser");\n'
    );

    patchSecurityVulnerabilities(tmp);

    const config = readFile(tmp, 'packages/foo/rollup.config.js');
    expect(config).toContain("const terser = require('@rollup/plugin-terser')");
    expect(config).not.toContain('rollup-plugin-terser');
  });

  test('skips packages without vulnerable deps', () => {
    const tmp = makeTmpDir();
    writeJson(tmp, 'package.json', {
      name: 'test-root',
      workspaces: ['packages/clean'],
      overrides: {}
    });
    const original = {
      name: 'clean',
      dependencies: { lodash: '^4.17.21' }
    };
    writeJson(tmp, 'packages/clean/package.json', original);

    patchSecurityVulnerabilities(tmp);

    const pkg = readJson(tmp, 'packages/clean/package.json');
    expect(pkg).toEqual(original);
  });
});