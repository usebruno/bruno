const fs = require('fs');
const path = require('path');

// ── Patch tables ────────────────────────────────────────────────────────────
// Keep these current. Each entry is idempotent: re-running is safe.

const REPLACE_DEV_DEPS = {
  // deprecated rollup-plugin-terser ships serialize-javascript <=7.0.4 (RCE)
  'rollup-plugin-terser': { pkg: '@rollup/plugin-terser', version: '^1.0.0' }
};

const PIN_DEPS = {
  '@aws-sdk/credential-providers': '3.1019.0'
};

const ROOT_OVERRIDES = {
  tar: '>=7.5.11',
  undici: '>=6.24.0',
  'serialize-javascript': '>=7.0.5',
  svgo: '>=2.8.1',
  'fast-xml-parser': '>=5.5.7',
  flatted: '>=3.4.2',
  'form-data': '>=4.0.5',
  immutable: '>=5.1.5',
  minimatch: '>=3.1.4',
  'path-to-regexp': '>=0.1.13',
  pbkdf2: '>=3.1.3',
  picomatch: '>=2.3.2',
  glob: '>=10.4.6'
};

const ROLLUP_TERSER_RE = /const\s*\{\s*terser\s*\}\s*=\s*require\(['"]rollup-plugin-terser['"]\)/g;
const ROLLUP_TERSER_NEW = "const terser = require('@rollup/plugin-terser')";

// ── Helpers ─────────────────────────────────────────────────────────────────

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function writeJson(filePath, obj) {
  fs.writeFileSync(filePath, JSON.stringify(obj, null, 2) + '\n');
}

function findWorkspacePackageJsons(rootDir) {
  const root = readJson(path.join(rootDir, 'package.json'));
  const results = [];
  for (const ws of root.workspaces || []) {
    const pkgPath = path.join(rootDir, ws, 'package.json');
    if (fs.existsSync(pkgPath)) {
      results.push(pkgPath);
    }
  }
  return results;
}

// ── Main ────────────────────────────────────────────────────────────────────

function patchSecurityVulnerabilities(rootDir) {
  rootDir = rootDir || process.cwd();

  // 1. Root overrides
  const rootPkgPath = path.join(rootDir, 'package.json');
  const rootPkg = readJson(rootPkgPath);
  let rootChanged = false;
  rootPkg.overrides = rootPkg.overrides || {};
  for (const [dep, ver] of Object.entries(ROOT_OVERRIDES)) {
    if (rootPkg.overrides[dep] !== ver) {
      rootPkg.overrides[dep] = ver;
      rootChanged = true;
    }
  }
  if (rootChanged) {
    writeJson(rootPkgPath, rootPkg);
  }

  // 2. Workspace packages
  const workspacePkgs = findWorkspacePackageJsons(rootDir);
  for (const pkgPath of workspacePkgs) {
    const pkg = readJson(pkgPath);
    let changed = false;

    for (const section of ['dependencies', 'devDependencies']) {
      const deps = pkg[section];
      if (!deps) continue;

      // Replace deprecated packages
      for (const [oldName, { pkg: newPkg, version }] of Object.entries(REPLACE_DEV_DEPS)) {
        if (deps[oldName] !== undefined) {
          delete deps[oldName];
          deps[newPkg] = version;
          changed = true;
        }
      }

      // Update exact pins
      for (const [dep, newVer] of Object.entries(PIN_DEPS)) {
        if (deps[dep] !== undefined && deps[dep] !== newVer) {
          deps[dep] = newVer;
          changed = true;
        }
      }
    }

    if (changed) {
      writeJson(pkgPath, pkg);
    }

    // 3. Patch rollup.config.js in the same directory
    const rollupConfig = path.join(path.dirname(pkgPath), 'rollup.config.js');
    if (fs.existsSync(rollupConfig)) {
      const src = fs.readFileSync(rollupConfig, 'utf8');
      ROLLUP_TERSER_RE.lastIndex = 0;
      if (ROLLUP_TERSER_RE.test(src)) {
        ROLLUP_TERSER_RE.lastIndex = 0;
        fs.writeFileSync(rollupConfig, src.replace(ROLLUP_TERSER_RE, ROLLUP_TERSER_NEW));
      }
    }
  }
}

module.exports = { patchSecurityVulnerabilities, ROOT_OVERRIDES, REPLACE_DEV_DEPS, PIN_DEPS };