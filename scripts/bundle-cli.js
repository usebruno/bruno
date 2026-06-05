#!/usr/bin/env node
'use strict';

// pack a self-contained tarball of @usebruno/cli that installs offline
// - npm pack all workspace packages into tarballs/
// - stage cli without node_modules, patch package.json to use local tarballs
// - npm install in stage, then npm pack the whole thing

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');

const ROOT = path.resolve(__dirname, '..');
const CLI_DIR = path.join(ROOT, 'packages', 'bruno-cli');
const OUT_DIR = path.join(ROOT, 'dist', 'cli-bundle');
const TARBALLS = path.join(OUT_DIR, 'tarballs');

const log = msg => process.stdout.write(`> ${msg}\n`);
const run = (cmd, cwd) => execSync(cmd, { cwd, stdio: 'pipe', encoding: 'utf8' }).trim();

function copyDir(src, dst) {
  fs.mkdirSync(dst, { recursive: true });
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    if (entry.name === 'node_modules') continue;
    const s = path.join(src, entry.name);
    const d = path.join(dst, entry.name);
    if (entry.isDirectory()) {
      copyDir(s, d);
    } else {
      fs.copyFileSync(s, d);
      fs.chmodSync(d, fs.statSync(s).mode);
    }
  }
}

const rootPkg = JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8'));

const workspaces = {};
for (const wsPath of rootPkg.workspaces) {
  try {
    const dir = path.join(ROOT, wsPath);
    const pkgFile = path.join(dir, 'package.json');
    if (!fs.existsSync(pkgFile)) continue;
    const pkg = JSON.parse(fs.readFileSync(pkgFile, 'utf8'));
    workspaces[pkg.name] = { dir, version: pkg.version };
  } catch (err) {
    log(`  skip ${wsPath} (${err.message.split('\n')[0]})`);
  }
}

fs.rmSync(OUT_DIR, { recursive: true, force: true });
fs.mkdirSync(TARBALLS, { recursive: true });

log('packing workspace packages...');
const tarballMap = {};

for (const [name, { dir }] of Object.entries(workspaces)) {
  try {
    const { version } = workspaces[name];
    const filename = `${name.replace(/^@/, '').replace('/', '-')}-${version}.tgz`;
    run(`npm pack --pack-destination "${TARBALLS}"`, dir);
    tarballMap[name] = filename;
    log(`  ${name} -> ${filename}`);
  } catch (err) {
    console.error(err);
    log(`  skip ${name} (${err.message.split('\n')[0]})`);
  }
}

log('staging cli...');
const stage = fs.mkdtempSync(path.join(os.tmpdir(), 'bruno-cli-bundle-'));

const cleanup = () => {
  try { fs.rmSync(stage, { recursive: true, force: true }); } catch {}
};
process.on('exit', cleanup);
process.on('SIGINT', () => { cleanup(); process.exit(1); });
process.on('SIGTERM', () => { cleanup(); process.exit(1); });
process.on('uncaughtException', () => { cleanup(); process.exit(1); });
process.on('unhandledRejection', () => { cleanup(); process.exit(1); });

copyDir(CLI_DIR, stage);

const stageTarballs = path.join(stage, 'tarballs');
fs.mkdirSync(stageTarballs, { recursive: true });
for (const tarball of Object.values(tarballMap)) {
  fs.copyFileSync(path.join(TARBALLS, tarball), path.join(stageTarballs, tarball));
}

const pkg = JSON.parse(fs.readFileSync(path.join(stage, 'package.json'), 'utf8'));

for (const dep of Object.keys(pkg.dependencies || {})) {
  if (tarballMap[dep]) {
    pkg.dependencies[dep] = `file:./tarballs/${tarballMap[dep]}`;
  }
}

const tarballOverrides = {};
for (const [name, tarball] of Object.entries(tarballMap)) {
  tarballOverrides[name] = `file:./tarballs/${tarball}`;
}
pkg.overrides = { ...(rootPkg.overrides || {}), ...(pkg.overrides || {}), ...tarballOverrides };

pkg.bundledDependencies = Object.keys(pkg.dependencies || {});
pkg.files = [...(pkg.files || []), 'tarballs', 'node_modules'];

fs.writeFileSync(path.join(stage, 'package.json'), JSON.stringify(pkg, null, 2) + '\n');

log('installing...');
execSync('npm install --ignore-scripts --no-audit --no-fund', {
  cwd: stage,
  stdio: 'inherit',
});

log('packing bundle...');
run(`npm pack --pack-destination "${OUT_DIR}"`, stage);
const packed = fs.readdirSync(OUT_DIR).find(f => f.endsWith('.tgz'));
if (!packed) throw new Error('no .tgz found after npm pack');
const finalPath = path.join(OUT_DIR, packed);

log('');
log(`done: ${finalPath}`);
log(`  npm install -g "${finalPath}"`);
log(`  npm install -g --prefer-offline "${finalPath}"`);
