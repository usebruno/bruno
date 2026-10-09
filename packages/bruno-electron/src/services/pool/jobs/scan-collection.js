const fs = require('node:fs');
const crypto = require('node:crypto');
const { walk } = require('../../../utils/mount');

const sha256 = (buf) => crypto.createHash('sha256').update(buf).digest('hex');

const scanCollection = async ({ collectionPath, denylist, saved }) => {
  const savedByPath = new Map(saved.map((row) => [row.relativePath, row]));
  const files = walk(collectionPath, denylist);

  const results = await Promise.all(files.map(async ({ relativePath, absolutePath }) => {
    const stat = await fs.promises.stat(absolutePath, { bigint: true });
    const mtime = stat.mtimeNs;
    const prior = savedByPath.get(relativePath);

    if (prior && prior.mtime === mtime) return null;
    const hash = sha256(await fs.promises.readFile(absolutePath));
    if (!prior) return { kind: 'added', entry: { relativePath, absolutePath, mtime, hash } };
    if (hash === prior.hash) return null;
    return { kind: 'updated', entry: { relativePath, absolutePath, mtime, hash, prevHash: prior.hash } };
  }));

  const changed = results.filter(Boolean);
  const present = new Set(files.map(({ relativePath }) => relativePath));

  return {
    added: changed.filter(({ kind }) => kind === 'added').map(({ entry }) => entry),
    updated: changed.filter(({ kind }) => kind === 'updated').map(({ entry }) => entry),
    removed: saved
      .filter(({ relativePath }) => !present.has(relativePath))
      .map(({ relativePath, id, hash }) => ({ relativePath, id, hash }))
  };
};

module.exports = scanCollection;
