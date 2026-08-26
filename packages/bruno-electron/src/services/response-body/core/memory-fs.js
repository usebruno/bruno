const fs = require('node:fs');
const path = require('node:path');

/**
 * In-memory + optional disk FileSystemPort for unit tests.
 * When `rootDir` is set, file ops use the real filesystem under that root.
 */
const createMemoryFileSystem = (rootDir) => {
  const memFiles = new Map();

  const resolve = (filePath) => {
    if (!rootDir) return filePath;
    return path.isAbsolute(filePath) ? filePath : path.join(rootDir, filePath);
  };

  return {
    async mkdirp(dir) {
      if (rootDir) {
        await fs.promises.mkdir(resolve(dir), { recursive: true });
      }
    },

    async writeFile(filePath, data) {
      const p = resolve(filePath);
      const buf = Buffer.isBuffer(data) ? data : Buffer.from(data);
      if (rootDir) {
        await fs.promises.mkdir(path.dirname(p), { recursive: true });
        await fs.promises.writeFile(p, buf);
      } else {
        memFiles.set(p, buf);
      }
    },

    createWriteStream(filePath) {
      const p = resolve(filePath);
      if (rootDir) {
        fs.mkdirSync(path.dirname(p), { recursive: true });
        return fs.createWriteStream(p);
      }

      const chunks = [];
      const { Writable } = require('node:stream');
      const stream = new Writable({
        write(chunk, _enc, cb) {
          chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
          cb();
        },
        final(cb) {
          memFiles.set(p, Buffer.concat(chunks));
          cb();
        }
      });
      return stream;
    },

    createReadStream(filePath) {
      const p = resolve(filePath);
      if (rootDir) {
        return fs.createReadStream(p);
      }
      const { Readable } = require('node:stream');
      const buf = memFiles.get(p) || Buffer.alloc(0);
      return Readable.from(buf);
    },

    async readFileRange(filePath, { position = 0, length } = {}) {
      const p = resolve(filePath);
      let buf;
      if (rootDir) {
        const fh = await fs.promises.open(p, 'r');
        try {
          const size = length ?? (await fh.stat()).size - position;
          buf = Buffer.alloc(Math.max(0, size));
          await fh.read(buf, 0, buf.length, position);
        } finally {
          await fh.close();
        }
      } else {
        const full = memFiles.get(p) || Buffer.alloc(0);
        const len = length ?? full.length - position;
        buf = full.subarray(position, position + Math.max(0, len));
      }
      return buf;
    },

    async readFile(filePath) {
      const p = resolve(filePath);
      if (rootDir) {
        return fs.promises.readFile(p);
      }
      return memFiles.get(p) || Buffer.alloc(0);
    },

    async copyFile(src, dest) {
      const s = resolve(src);
      const d = resolve(dest);
      if (rootDir) {
        await fs.promises.copyFile(s, d);
        return;
      }
      memFiles.set(d, Buffer.from(memFiles.get(s) || []));
    },

    async unlink(filePath) {
      const p = resolve(filePath);
      if (rootDir) {
        await fs.promises.unlink(p);
        return;
      }
      memFiles.delete(p);
    },

    existsSync(filePath) {
      const p = resolve(filePath);
      if (rootDir) {
        return fs.existsSync(p);
      }
      return memFiles.has(p);
    },

    _memFiles: memFiles
  };
};

module.exports = {
  createMemoryFileSystem
};
