'use strict';

/**
 * Build bruno-app with remote images rewritten from the local fixture server,
 * then copy dist into packages/bruno-electron/web (production layout).
 *
 * Env:
 *   BRUNO_REMOTE_IMAGE_FIXTURE_PORT (default 9876)
 */

const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const { start, DEFAULT_PORT } = require('./serve-fixture');

const ROOT = path.join(__dirname, '..', '..', '..', '..');
const APP_DIR = path.join(ROOT, 'packages', 'bruno-app');
const CHANGELOG = path.join(APP_DIR, 'src', 'components', 'ChangelogTab', 'CHANGELOG.md');
const DIST = path.join(APP_DIR, 'dist');
const ELECTRON_WEB = path.join(ROOT, 'packages', 'bruno-electron', 'web');

const IMAGE_MARKER_START = '<!-- remote-images-fixture:start -->';
const IMAGE_MARKER_END = '<!-- remote-images-fixture:end -->';

function run(command, args, env) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd: ROOT,
      env: { ...process.env, ...env },
      stdio: 'inherit',
      shell: process.platform === 'win32'
    });
    child.on('error', reject);
    child.on('exit', (code) => {
      if (code === 0) resolve();
      else reject(new Error(`${command} ${args.join(' ')} exited with ${code}`));
    });
  });
}

async function rmrf(target) {
  await fs.promises.rm(target, { recursive: true, force: true });
}

async function copyDir(src, dest) {
  await fs.promises.mkdir(dest, { recursive: true });
  await fs.promises.cp(src, dest, { recursive: true });
}

function stripFixtureBlock(content) {
  const re = new RegExp(
    `\\n*${IMAGE_MARKER_START}[\\s\\S]*?${IMAGE_MARKER_END}\\n*`,
    'g'
  );
  return content.replace(re, '\n');
}

async function withChangelogFixture(port, fn) {
  const original = await fs.promises.readFile(CHANGELOG, 'utf8');
  const cleaned = stripFixtureBlock(original).replace(/\s*$/, '');
  const imageUrl = `http://127.0.0.1:${port}/ai.png`;
  const block = [
    '',
    IMAGE_MARKER_START,
    `![Remote image fixture](${imageUrl})`,
    IMAGE_MARKER_END,
    ''
  ].join('\n');
  await fs.promises.writeFile(CHANGELOG, `${cleaned}\n${block}`);
  try {
    return await fn(imageUrl);
  } finally {
    await fs.promises.writeFile(CHANGELOG, original);
  }
}

async function copyDistToElectronWeb() {
  await rmrf(ELECTRON_WEB);
  await copyDir(DIST, ELECTRON_WEB);

  // Match scripts/build-electron.js: rewrite absolute /static to relative for file://
  const files = await fs.promises.readdir(ELECTRON_WEB);
  for (const file of files) {
    if (!file.endsWith('.html')) continue;
    const filePath = path.join(ELECTRON_WEB, file);
    let content = await fs.promises.readFile(filePath, 'utf8');
    content = content.replace(/\/static/g, './static');
    await fs.promises.writeFile(filePath, content);
  }
}

async function main() {
  const port = Number(process.env.BRUNO_REMOTE_IMAGE_FIXTURE_PORT || DEFAULT_PORT);
  const { server } = await start(port);

  try {
    await withChangelogFixture(port, async (imageUrl) => {
      console.log(`[remote-images] building with fixture ${imageUrl}`);
      await run('npm', ['run', 'build', '--workspace=packages/bruno-app'], {
        BRUNO_REMOTE_IMAGE_DOMAINS: `127.0.0.1:${port}`
      });
    });

    await copyDistToElectronWeb();
    console.log(`[remote-images] copied ${DIST} -> ${ELECTRON_WEB}`);
  } finally {
    server.close();
  }
}

if (require.main === module) {
  main().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}

module.exports = { main, withChangelogFixture, copyDistToElectronWeb, stripFixtureBlock };
