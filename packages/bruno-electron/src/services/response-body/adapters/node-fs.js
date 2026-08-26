const fs = require('node:fs');
const fsp = require('node:fs/promises');
const path = require('node:path');

/**
 * Real filesystem FileSystemPort for ResponseBodyStore.
 */
const createNodeFileSystem = () => ({
  async mkdirp(dir) {
    await fsp.mkdir(dir, { recursive: true });
  },

  async writeFile(filePath, data) {
    await fsp.mkdir(path.dirname(filePath), { recursive: true });
    await fsp.writeFile(filePath, data);
  },

  createWriteStream(filePath) {
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    return fs.createWriteStream(filePath);
  },

  createReadStream(filePath) {
    return fs.createReadStream(filePath);
  },

  async readFileRange(filePath, { position = 0, length } = {}) {
    const fh = await fsp.open(filePath, 'r');
    try {
      const stat = await fh.stat();
      const size = length == null ? Math.max(0, stat.size - position) : length;
      const buf = Buffer.alloc(Math.max(0, size));
      if (buf.length === 0) return buf;
      const { bytesRead } = await fh.read(buf, 0, buf.length, position);
      return bytesRead === buf.length ? buf : buf.subarray(0, bytesRead);
    } finally {
      await fh.close();
    }
  },

  async readFile(filePath) {
    return fsp.readFile(filePath);
  },

  async copyFile(src, dest) {
    await fsp.mkdir(path.dirname(dest), { recursive: true });
    await fsp.copyFile(src, dest);
  },

  async unlink(filePath) {
    await fsp.unlink(filePath);
  },

  existsSync(filePath) {
    return fs.existsSync(filePath);
  }
});

module.exports = {
  createNodeFileSystem
};
