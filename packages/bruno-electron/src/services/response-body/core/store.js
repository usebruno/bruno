const { Readable } = require('node:stream');
const { randomUUID } = require('node:crypto');
const path = require('node:path');
const { SPILL_THRESHOLD_BYTES, STORAGE_MEMORY, STORAGE_FILE } = require('./constants');
const { BodyNotFoundError, BodyTooLargeForScriptsError } = require('./errors');

const defaultIdGen = () => randomUUID();

/**
 * Pure response-body store (no Electron). Hybrid Map / spill-to-file.
 */
const createResponseBodyStore = ({
  fs,
  spillDir,
  idGen = defaultIdGen,
  spillThreshold = SPILL_THRESHOLD_BYTES
} = {}) => {
  if (!fs) {
    throw new Error('createResponseBodyStore requires a FileSystemPort');
  }
  if (!spillDir) {
    throw new Error('createResponseBodyStore requires spillDir');
  }

  /** @type {Map<string, object>} */
  const entries = new Map();
  /** @type {Map<string, string>} */
  const pins = new Map();

  const ensureSpillDir = async () => {
    await fs.mkdirp(spillDir);
  };

  const filePathFor = (bodyRef) => path.join(spillDir, bodyRef);

  const getEntry = (bodyRef) => {
    const entry = entries.get(bodyRef);
    if (!entry) {
      throw new BodyNotFoundError(bodyRef);
    }
    return entry;
  };

  const destroyEntry = async (bodyRef) => {
    const entry = entries.get(bodyRef);
    if (!entry) return;
    entries.delete(bodyRef);
    if (entry.storage === STORAGE_FILE && entry.filePath && fs.existsSync(entry.filePath)) {
      await fs.unlink(entry.filePath);
    }
  };

  /**
   * Ingest a Node Readable. Spills to disk once accumulated size exceeds threshold.
   */
  const ingestStream = async (readable, { contentType, headers } = {}) => {
    if (!readable) {
      throw new Error('ingestStream requires a Readable stream');
    }

    const bodyRef = idGen();
    const chunks = [];
    let size = 0;
    let storage = STORAGE_MEMORY;
    let writeStream = null;
    const destPath = filePathFor(bodyRef);

    const startSpill = async () => {
      await ensureSpillDir();
      writeStream = fs.createWriteStream(destPath);
      for (const chunk of chunks) {
        if (!writeStream.write(chunk)) {
          await new Promise((resolve, reject) => {
            writeStream.once('drain', resolve);
            writeStream.once('error', reject);
          });
        }
      }
      chunks.length = 0;
      storage = STORAGE_FILE;
    };

    try {
      for await (const chunk of readable) {
        const buf = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
        size += buf.length;

        if (storage === STORAGE_MEMORY) {
          chunks.push(buf);
          if (size > spillThreshold) {
            await startSpill();
          }
        } else {
          if (!writeStream.write(buf)) {
            await new Promise((resolve, reject) => {
              writeStream.once('drain', resolve);
              writeStream.once('error', reject);
            });
          }
        }
      }

      if (storage === STORAGE_FILE && writeStream) {
        await new Promise((resolve, reject) => {
          writeStream.end((err) => (err ? reject(err) : resolve()));
        });
        entries.set(bodyRef, {
          storage: STORAGE_FILE,
          filePath: destPath,
          size,
          contentType,
          headers,
          refs: 0
        });
      } else {
        const buffer = Buffer.concat(chunks, size);
        entries.set(bodyRef, {
          storage: STORAGE_MEMORY,
          buffer,
          size,
          contentType,
          headers,
          refs: 0
        });
      }
    } catch (err) {
      if (writeStream) {
        writeStream.destroy();
      }
      if (fs.existsSync(destPath)) {
        try {
          await fs.unlink(destPath);
        } catch (_) {
          /* ignore */
        }
      }
      throw err;
    }

    return {
      bodyRef,
      size,
      storage: entries.get(bodyRef).storage,
      contentType
    };
  };

  const putBuffer = async (buffer, { contentType, headers } = {}) => {
    const bodyRef = idGen();
    const buf = Buffer.isBuffer(buffer) ? buffer : Buffer.from(buffer || []);
    const size = buf.length;

    if (size > spillThreshold) {
      await ensureSpillDir();
      const destPath = filePathFor(bodyRef);
      await fs.writeFile(destPath, buf);
      entries.set(bodyRef, {
        storage: STORAGE_FILE,
        filePath: destPath,
        size,
        contentType,
        headers,
        refs: 0
      });
      return { bodyRef, size, storage: STORAGE_FILE, contentType };
    }

    entries.set(bodyRef, {
      storage: STORAGE_MEMORY,
      buffer: buf,
      size,
      contentType,
      headers,
      refs: 0
    });
    return { bodyRef, size, storage: STORAGE_MEMORY, contentType };
  };

  const getStat = (bodyRef) => {
    const entry = getEntry(bodyRef);
    return {
      size: entry.size,
      storage: entry.storage,
      contentType: entry.contentType
    };
  };

  const readRange = async (bodyRef, offset = 0, length) => {
    const entry = getEntry(bodyRef);
    const start = Math.max(0, offset | 0);
    if (start >= entry.size) {
      return Buffer.alloc(0);
    }
    const maxLen = entry.size - start;
    const len = length == null ? maxLen : Math.min(Math.max(0, length | 0), maxLen);

    if (entry.storage === STORAGE_MEMORY) {
      return entry.buffer.subarray(start, start + len);
    }

    return fs.readFileRange(entry.filePath, { position: start, length: len });
  };

  const openReadStream = (bodyRef) => {
    const entry = getEntry(bodyRef);
    if (entry.storage === STORAGE_MEMORY) {
      return Readable.from(entry.buffer);
    }
    if (typeof fs.createReadStream === 'function') {
      return fs.createReadStream(entry.filePath);
    }
    return Readable.from(
      (async function* () {
        const buf = await fs.readFile(entry.filePath);
        yield buf;
      })()
    );
  };

  const assertScriptAccessible = (bodyRef) => {
    const entry = getEntry(bodyRef);
    if (entry.storage === STORAGE_FILE) {
      throw new BodyTooLargeForScriptsError(bodyRef, entry.size);
    }
  };

  const getBufferForScripts = (bodyRef) => {
    const entry = getEntry(bodyRef);
    assertScriptAccessible(bodyRef);
    return entry.buffer;
  };

  const saveToPath = async (bodyRef, destPath) => {
    const entry = getEntry(bodyRef);
    if (entry.storage === STORAGE_MEMORY) {
      await fs.writeFile(destPath, entry.buffer);
      return;
    }
    await fs.copyFile(entry.filePath, destPath);
  };

  const pin = (bodyRef) => {
    getEntry(bodyRef);
    const pinId = idGen();
    entries.get(bodyRef).refs += 1;
    pins.set(pinId, bodyRef);
    return pinId;
  };

  const release = async (pinIdOrBodyRef) => {
    if (pins.has(pinIdOrBodyRef)) {
      const bodyRef = pins.get(pinIdOrBodyRef);
      pins.delete(pinIdOrBodyRef);
      const entry = entries.get(bodyRef);
      if (!entry) return;
      entry.refs = Math.max(0, entry.refs - 1);
      if (entry.refs === 0) {
        await destroyEntry(bodyRef);
      }
      return;
    }

    const entry = entries.get(pinIdOrBodyRef);
    if (!entry) return;
    if (entry.refs > 0) return;
    await destroyEntry(pinIdOrBodyRef);
  };

  const disposeIfUnpinned = async (bodyRef) => {
    const entry = entries.get(bodyRef);
    if (!entry) return;
    if (entry.refs === 0) {
      await destroyEntry(bodyRef);
    }
  };

  const getFilePath = (bodyRef) => {
    const entry = getEntry(bodyRef);
    return entry.storage === STORAGE_FILE ? entry.filePath : null;
  };

  return {
    ingestStream,
    putBuffer,
    getStat,
    readRange,
    openReadStream,
    getBufferForScripts,
    getFilePath,
    saveToPath,
    pin,
    release,
    disposeIfUnpinned,
    assertScriptAccessible,
    _entries: entries
  };
};

module.exports = {
  createResponseBodyStore
};
