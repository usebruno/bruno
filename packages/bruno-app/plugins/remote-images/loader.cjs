'use strict';

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const { Readable, Transform } = require('stream');
const { pipeline } = require('stream/promises');
const { findRemoteImageUrls, assetFilenameFromHash, buildModuleSource } = require('./utils');

const CACHE_DIR = path.join(process.cwd(), 'node_modules/.cache/bruno-remote-images');

function cachePathsForUrl(url) {
  const cacheKey = Buffer.from(url).toString('base64url');
  return {
    cacheKey,
    cachePath: path.join(CACHE_DIR, cacheKey),
    hashPath: path.join(CACHE_DIR, `${cacheKey}.hash`)
  };
}

/**
 * Hash a file by streaming it (constant memory).
 * @param {string} filePath
 * @returns {Promise<string>} md5 hex (full)
 */
async function hashFile(filePath) {
  const hash = crypto.createHash('md5');
  for await (const chunk of fs.createReadStream(filePath)) {
    hash.update(chunk);
  }
  return hash.digest('hex');
}

/**
 * Download url to the disk cache via streams. Returns cache path + content hash.
 * Never has the entire file buffer in memory
 *
 * @param {string} url
 * @returns {Promise<{ cachePath: string, hash: string }>}
 */
async function ensureCachedImage(url) {
  const { cachePath, hashPath } = cachePathsForUrl(url);

  try {
    await fs.promises.access(cachePath);
    let hash;
    try {
      hash = (await fs.promises.readFile(hashPath, 'utf8')).trim();
    } catch {
      hash = (await hashFile(cachePath)).slice(0, 16);
      await fs.promises.writeFile(hashPath, hash);
    }
    return { cachePath, hash };
  } catch {
    // cache miss
  }

  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`remote-images: failed to download ${url} (${res.status} ${res.statusText})`);
  }
  if (!res.body) {
    throw new Error(`remote-images: empty body for ${url}`);
  }

  await fs.promises.mkdir(CACHE_DIR, { recursive: true });

  const tmpPath = `${cachePath}.${process.pid}.${crypto.randomBytes(6).toString('hex')}.tmp`;
  const hash = crypto.createHash('md5');

  try {
    await pipeline(
      Readable.fromWeb(res.body),
      new Transform({
        transform(chunk, _enc, cb) {
          hash.update(chunk);
          cb(null, chunk);
        }
      }),
      fs.createWriteStream(tmpPath)
    );

    const shortHash = hash.digest('hex').slice(0, 16);

    try {
      await fs.promises.rename(tmpPath, cachePath);
      await fs.promises.writeFile(hashPath, shortHash);
      return { cachePath, hash: shortHash };
    } catch (err) {
      if (err && (err.code === 'EEXIST' || err.code === 'EPERM')) {
        await fs.promises.rm(tmpPath, { force: true }).catch(() => {});
        let existingHash;
        try {
          existingHash = (await fs.promises.readFile(hashPath, 'utf8')).trim();
        } catch {
          existingHash = (await hashFile(cachePath)).slice(0, 16);
          await fs.promises.writeFile(hashPath, existingHash).catch(() => {});
        }
        return { cachePath, hash: existingHash };
      }
      throw err;
    }
  } catch (err) {
    await fs.promises.rm(tmpPath, { force: true }).catch(() => {});
    throw err;
  }
}

/**
 * rspack emitFile requires string|Buffer — load one cached file at a time.
 * Download path above is fully streamed; this is the unavoidable peak for emit.
 *
 * @param {string} filePath
 * @returns {Promise<Buffer>}
 */
function readCachedFile(filePath) {
  return fs.promises.readFile(filePath);
}

/**
 * Markdown (and other text) loader: download configured-domain image URLs,
 * emit them as rspack assets, rewrite to relative static/media paths.
 *
 * Downloads use Node streams so responses are written straight to disk.
 *
 * @this {import('@rspack/core').LoaderContext}
 * @param {string} source
 */
module.exports = function remoteImagesLoader(source) {
  const callback = this.async();
  const options = this.getOptions() || {};
  const domains = options.domains || [];

  (async () => {
    const urls = findRemoteImageUrls(source, domains);
    if (!urls.length) {
      callback(null, buildModuleSource(source, new Map()));
      return;
    }

    const urlToAssetPath = new Map();
    for (const url of urls) {
      const { cachePath, hash } = await ensureCachedImage(url);
      const filename = assetFilenameFromHash(hash, url);
      // emitFile API needs Buffer; read one file at a time after streaming to disk
      const buffer = await readCachedFile(cachePath);
      this.emitFile(filename, buffer);
      urlToAssetPath.set(url, filename);
      this.addDependency(cachePath);
    }

    callback(null, buildModuleSource(source, urlToAssetPath));
  })().catch((err) => {
    callback(err);
  });
};

module.exports.ensureCachedImage = ensureCachedImage;
module.exports.hashFile = hashFile;
module.exports.CACHE_DIR = CACHE_DIR;
