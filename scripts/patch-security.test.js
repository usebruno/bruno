const fs = require('fs');
const path = require('path');
const os = require('os');

const { patchSecurityVulnerabilities, buildForceInstallArgs } = require('./patch-security');

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

describe('patchSecurityVulnerabilities', () => {
  test('does not add transitive-dep overrides to root package.json', () => {
    const tmp = makeTmpDir();
    writeJson(tmp, 'package.json', {
      name: 'test-root',
      workspaces: ['packages/foo'],
      overrides: { rollup: '3.30.0' }
    });
    writeJson(tmp, 'packages/foo/package.json', { name: 'foo' });

    patchSecurityVulnerabilities(tmp);

    const root = readJson(tmp, 'package.json');
    // preserves existing overrides
    expect(root.overrides.rollup).toBe('3.30.0');
    // does NOT add transitive-dep overrides (they conflict with force-install)
    expect(root.overrides.tar).toBeUndefined();
    expect(root.overrides.pbkdf2).toBeUndefined();
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

  test('patches rollup-plugin-terser require in non-config JS files within workspace', () => {
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
      'packages/foo/src/sandbox/bundle-libraries.js',
      "const rollup = require('rollup');\nconst { terser } = require('rollup-plugin-terser');\nmodule.exports = {};\n"
    );

    patchSecurityVulnerabilities(tmp);

    const bundler = readFile(tmp, 'packages/foo/src/sandbox/bundle-libraries.js');
    expect(bundler).toContain("const terser = require('@rollup/plugin-terser')");
    expect(bundler).not.toContain('rollup-plugin-terser');
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

describe('patchSecurityVulnerabilities applies override patches to root overrides', () => {
  test('updates vulnerable override versions in root package.json', () => {
    const tmp = makeTmpDir();
    writeJson(tmp, 'package.json', {
      name: 'test-root',
      workspaces: ['packages/foo'],
      overrides: { rollup: '3.29.5' }
    });
    writeJson(tmp, 'packages/foo/package.json', { name: 'foo' });

    patchSecurityVulnerabilities(tmp);

    const root = readJson(tmp, 'package.json');
    expect(root.overrides.rollup).toBe('3.30.0');
  });

  test('preserves unrelated overrides while patching', () => {
    const tmp = makeTmpDir();
    writeJson(tmp, 'package.json', {
      name: 'test-root',
      workspaces: ['packages/foo'],
      overrides: {
        rollup: '3.29.5',
        'electron-store': { conf: { 'json-schema-typed': '8.0.1' } }
      }
    });
    writeJson(tmp, 'packages/foo/package.json', { name: 'foo' });

    patchSecurityVulnerabilities(tmp);

    const root = readJson(tmp, 'package.json');
    expect(root.overrides.rollup).toBe('3.30.0');
    expect(root.overrides['electron-store']).toEqual({ conf: { 'json-schema-typed': '8.0.1' } });
  });

  test('deletes lockfile when overrides change', () => {
    const tmp = makeTmpDir();
    writeJson(tmp, 'package.json', {
      name: 'test-root',
      workspaces: ['packages/foo'],
      overrides: { rollup: '3.29.5' }
    });
    writeJson(tmp, 'packages/foo/package.json', { name: 'foo' });
    fs.writeFileSync(path.join(tmp, 'package-lock.json'), '{"stale": true}');

    patchSecurityVulnerabilities(tmp);

    expect(fs.existsSync(path.join(tmp, 'package-lock.json'))).toBe(false);
  });
});

describe('patchSecurityVulnerabilities pins workspace devDependencies', () => {
  test('updates exact-pinned @rsbuild/plugin-styled-components to caret range', () => {
    const tmp = makeTmpDir();
    writeJson(tmp, 'package.json', {
      name: 'test-root',
      workspaces: ['packages/app']
    });
    writeJson(tmp, 'packages/app/package.json', {
      name: 'app',
      devDependencies: { '@rsbuild/plugin-styled-components': '1.1.0' }
    });

    patchSecurityVulnerabilities(tmp);

    const pkg = readJson(tmp, 'packages/app/package.json');
    expect(pkg.devDependencies['@rsbuild/plugin-styled-components']).toBe('^1.1.0');
  });
});

describe('buildForceInstallArgs', () => {
  test('returns array of pkg@version strings for all force-install targets', () => {
    const args = buildForceInstallArgs();
    expect(Array.isArray(args)).toBe(true);
    expect(args.length).toBeGreaterThan(0);
    for (const arg of args) {
      expect(arg).toMatch(/^[@a-z].*@\d/);
    }
    expect(args).toContain('pbkdf2@3.1.5');
    expect(args).toContain('undici@6.24.1');
    expect(args).toContain('picomatch@2.3.2');
    expect(args).toContain('glob@10.5.0');
  });
});

describe('patchSecurityVulnerabilities adds force-install versions to root devDependencies', () => {
  test('adds FORCE_INSTALL_VERSIONS as root devDependencies for hoisting', () => {
    const tmp = makeTmpDir();
    writeJson(tmp, 'package.json', {
      name: 'test-root',
      workspaces: ['packages/foo'],
      devDependencies: { jest: '^29.2.0' }
    });
    writeJson(tmp, 'packages/foo/package.json', { name: 'foo' });

    patchSecurityVulnerabilities(tmp);

    const root = readJson(tmp, 'package.json');
    expect(root.devDependencies.pbkdf2).toBe('3.1.5');
    expect(root.devDependencies.undici).toBe('6.24.1');
    expect(root.devDependencies['fast-xml-parser']).toBe('5.5.9');
    // preserves existing devDeps
    expect(root.devDependencies.jest).toBe('^29.2.0');
  });

  test('deletes package-lock.json so npm resolves fresh versions', () => {
    const tmp = makeTmpDir();
    writeJson(tmp, 'package.json', {
      name: 'test-root',
      workspaces: ['packages/foo'],
      devDependencies: {}
    });
    writeJson(tmp, 'packages/foo/package.json', { name: 'foo' });
    // Create a stale lockfile
    fs.writeFileSync(path.join(tmp, 'package-lock.json'), '{"stale": true}');

    patchSecurityVulnerabilities(tmp);

    expect(fs.existsSync(path.join(tmp, 'package-lock.json'))).toBe(false);
  });
});