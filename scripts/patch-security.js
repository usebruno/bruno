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

// Exact versions to force-install after `npm install`, bypassing broken
// npm-overrides-in-workspaces.  Each key is a package name; each value is the
// exact safe version to install.  setup.js runs:
//   npm install --no-save <pkg>@<ver> ...
const FORCE_INSTALL_VERSIONS = {
  '@aws-sdk/client-sts': '3.1019.0',
  'fast-xml-parser':    '5.5.9',
  flatted:              '3.4.2',
  'form-data':          '4.0.5',
  glob:                 '10.5.0',
  immutable:            '5.1.5',
  minimatch:            '3.1.5',
  'path-to-regexp':     '0.1.13',
  pbkdf2:               '3.1.5',
  picomatch:            '2.3.2',
  svgo:                 '2.8.2',
  tar:                  '7.5.13',
  undici:               '6.24.1'
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

  // Add force-install versions as root devDependencies so npm hoists
  // the safe version and updates the lockfile
  const rootPkgPath = path.join(rootDir, 'package.json');
  const rootPkg = readJson(rootPkgPath);
  let rootChanged = false;
  rootPkg.devDependencies = rootPkg.devDependencies || {};
  for (const [dep, ver] of Object.entries(FORCE_INSTALL_VERSIONS)) {
    if (rootPkg.devDependencies[dep] !== ver) {
      rootPkg.devDependencies[dep] = ver;
      rootChanged = true;
    }
  }
  if (rootChanged) {
    writeJson(rootPkgPath, rootPkg);
  }

  // Workspace packages
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

    // 3. Patch any .js file in the workspace package that requires rollup-plugin-terser
    patchJsFilesRecursive(path.dirname(pkgPath));
  }
}

function patchJsFilesRecursive(dir) {
  if (!fs.existsSync(dir)) return;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === 'node_modules' || entry.name === 'dist') continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      patchJsFilesRecursive(full);
    } else if (entry.name.endsWith('.js')) {
      const src = fs.readFileSync(full, 'utf8');
      ROLLUP_TERSER_RE.lastIndex = 0;
      if (ROLLUP_TERSER_RE.test(src)) {
        ROLLUP_TERSER_RE.lastIndex = 0;
        fs.writeFileSync(full, src.replace(ROLLUP_TERSER_RE, ROLLUP_TERSER_NEW));
      }
    }
  }
}

function buildForceInstallArgs() {
  return Object.entries(FORCE_INSTALL_VERSIONS).map(([pkg, ver]) => `${pkg}@${ver}`);
}

module.exports = { patchSecurityVulnerabilities, buildForceInstallArgs, REPLACE_DEV_DEPS, PIN_DEPS, FORCE_INSTALL_VERSIONS };