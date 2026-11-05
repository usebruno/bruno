const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { Readable, Transform } = require('stream');
const { pipeline } = require('stream/promises');
const { app } = require('electron');
const tar = require('tar');

const SDK_PACKAGE_NAME = '@github/copilot-sdk';
const REGISTRY_URL = 'https://registry.npmjs.org';
const DOWNLOAD_TIMEOUT_MS = 10 * 60 * 1000;

const RUNTIME_INTEGRITY = {
  '1.0.28': {
    'darwin-arm64': 'sha512-R15W4SUS12DyGiWEX/hxsSWTtvyo+Cxrn4SAbU0NeB1kBb+IzkvKmc85gOefh7QzuRZnSn2Wnch7oOmfoYMuPQ==',
    'darwin-x64': 'sha512-b4haZ9J0G1BDg2gtNHW8yAEyddulrUZkGcnP7Dm7Ue1uNiO35qAqS+Q5jdadYj+cwhlBnNqXscO5l19tpaPyrw==',
    'win32-arm64': 'sha512-jG18fJN20P5fm8pWkpvKcFzH8XupSj8cPo0ZULFJkmYDnV4UcMceGAJrIA8L/iNFu9vabfIP3cmOmWDPNyMP+A==',
    'win32-x64': 'sha512-pzlzyuBHcF3TrgBue0w9cypmZ+1BpCKL1VdVO98SlXqOhOBJ2aHXAY42gI0ZVbZuCfkv4T+EUHAriyv0PJIidw==',
    'linux-arm64': 'sha512-41G/pQajhEz6rCeUSDOooFPrKSpgE8aOetH0y4a3zIJNKybr+1QfJJkia9O49LQpzQBAgn0AkEF/h6qrYdUnQQ==',
    'linux-x64': 'sha512-yAsoTZfP//a1oirpdXc4oIX1m69ePP4ef3Yasmm3iT+hM7mpQLTxWWaDD6C2vuIJk1tPZLK0jndFVoFYr/d7yw=='
  }
};

const RM_OPTIONS = { recursive: true, force: true, maxRetries: 3, retryDelay: 200 };

const platformKey = () => `${process.platform}-${process.arch}`;

const sdkVersion = () => {
  const packageRoot = (require.resolve.paths(SDK_PACKAGE_NAME) || [])
    .map((base) => path.join(base, ...SDK_PACKAGE_NAME.split('/')))
    .find((candidate) => fs.existsSync(path.join(candidate, 'package.json')));
  if (!packageRoot) throw new Error(`${SDK_PACKAGE_NAME} is not installed.`);
  return JSON.parse(fs.readFileSync(path.join(packageRoot, 'package.json'), 'utf8')).version;
};

const runtimesDirectory = () => path.join(app.getPath('userData'), 'copilot-sdk', 'runtime');

const runtimeFiles = (directory, platform) => {
  const prebuilds = path.join(directory, 'prebuilds', platform);
  return {
    wrapper: path.join(prebuilds, platform.startsWith('win32') ? 'copilot-runtime.exe' : 'copilot-runtime'),
    library: path.join(prebuilds, 'runtime.node')
  };
};

const resolveRuntime = () => {
  const platform = platformKey();
  const version = sdkVersion();
  const pinned = RUNTIME_INTEGRITY[version];
  if (!pinned) throw new Error(`No pinned GitHub Copilot runtime for ${SDK_PACKAGE_NAME} ${version}.`);
  const integrity = pinned[platform];
  if (!integrity) throw new Error(`GitHub Copilot isn't available on ${platform}.`);
  const name = `${version}-${platform}`;
  const directory = path.join(runtimesDirectory(), name);
  return { platform, version, integrity, name, directory, files: runtimeFiles(directory, platform) };
};

const isInstalled = ({ files }) => fs.existsSync(files.wrapper) && fs.existsSync(files.library);

const isCopilotRuntimeInstalled = () => isInstalled(resolveRuntime());

const downloadVerified = async ({ platform, version, integrity }, destination) => {
  const url = `${REGISTRY_URL}/@github/copilot-sdk-${platform}/-/copilot-sdk-${platform}-${version}.tgz`;
  const response = await fetch(url, { signal: AbortSignal.timeout(DOWNLOAD_TIMEOUT_MS) });
  if (!response.ok || !response.body) throw new Error(`the server responded with HTTP ${response.status}`);

  const hash = crypto.createHash('sha512');
  const hashing = new Transform({
    transform(chunk, _encoding, callback) {
      hash.update(chunk);
      callback(null, chunk);
    }
  });
  await pipeline(Readable.fromWeb(response.body), hashing, fs.createWriteStream(destination));

  if (`sha512-${hash.digest('base64')}` !== integrity) {
    throw new Error('the downloaded file did not match the expected checksum');
  }
};

const removeOtherRuntimes = async (keep) => {
  const entries = await fs.promises.readdir(runtimesDirectory()).catch(() => []);
  await Promise.all(entries
    .filter((entry) => entry !== keep)
    .map((entry) => fs.promises.rm(path.join(runtimesDirectory(), entry), RM_OPTIONS).catch(() => {})));
};

const install = async (runtime) => {
  const staging = path.join(runtimesDirectory(), `.staging-${process.pid}-${Date.now()}`);
  const archive = `${staging}.tgz`;
  await fs.promises.mkdir(staging, { recursive: true });
  try {
    await downloadVerified(runtime, archive);
    await tar.x({ file: archive, cwd: staging, strip: 1 });
    const staged = runtimeFiles(staging, runtime.platform);
    if (!fs.existsSync(staged.wrapper) || !fs.existsSync(staged.library)) {
      throw new Error('the download is missing the runtime files');
    }
    if (process.platform !== 'win32') await fs.promises.chmod(staged.wrapper, 0o755);
    await fs.promises.rm(runtime.directory, RM_OPTIONS);
    await fs.promises.rename(staging, runtime.directory);
  } catch (err) {
    await fs.promises.rm(staging, RM_OPTIONS).catch(() => {});
    throw new Error(`Couldn't download the GitHub Copilot runtime: ${err.message}. Check your internet connection and try again.`);
  } finally {
    await fs.promises.rm(archive, { force: true }).catch(() => {});
  }
  await removeOtherRuntimes(runtime.name);
};

let pendingInstall = null;

const installCopilotRuntime = async () => {
  const runtime = resolveRuntime();
  if (isInstalled(runtime)) return runtime.files.wrapper;
  if (!pendingInstall) {
    pendingInstall = install(runtime).finally(() => {
      pendingInstall = null;
    });
  }
  await pendingInstall;
  return runtime.files.wrapper;
};

module.exports = {
  isCopilotRuntimeInstalled,
  installCopilotRuntime
};
