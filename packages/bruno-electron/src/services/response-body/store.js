const { randomUUID } = require('node:crypto');
const path = require('node:path');
const { STORAGE_FILE } = require('./constants');
const { BodyNotFoundError } = require('./errors');

const defaultIdGen = () => randomUUID();

const writeChunk = async (writeStream, buf) => {
  if (!writeStream.write(buf)) {
    await new Promise((resolve, reject) => {
      writeStream.once('drain', resolve);
      writeStream.once('error', reject);
    });
  }
};

/**
 * Pure response-body store (no Electron).
 * Dumb dual multi-writer: every ingest writes to a spill file and to an in-memory buffer.
 */
const createResponseBodyStore = ({
  fs,
  spillDir,
  idGen = defaultIdGen
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
    if (entry.filePath && fs.existsSync(entry.filePath)) {
      await fs.unlink(entry.filePath);
    }
  };

  const finalizeEntry = (bodyRef, { buffer, filePath, size, contentType, headers }) => {
    entries.set(bodyRef, {
      storage: STORAGE_FILE,
      filePath,
      buffer,
      size,
      contentType,
      headers,
      refs: 0
    });
    return {
      bodyRef,
      size,
      storage: STORAGE_FILE,
      contentType
    };
  };

  /**
   * Ingest a Node Readable via dual writers: file + in-memory response buffer.
   * No size / spill / drop logic in the writer.
   */
  const ingestStream = async (readable, { contentType, headers } = {}) => {
    if (!readable) {
      throw new Error('ingestStream requires a Readable stream');
    }

    const bodyRef = idGen();
    const chunks = [];
    let size = 0;
    const destPath = filePathFor(bodyRef);

    await ensureSpillDir();
    const writeStream = fs.createWriteStream(destPath);

    try {
      for await (const chunk of readable) {
        const buf = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
        size += buf.length;
        chunks.push(buf);
        await writeChunk(writeStream, buf);
      }

      await new Promise((resolve, reject) => {
        writeStream.end((err) => (err ? reject(err) : resolve()));
      });

      return finalizeEntry(bodyRef, {
        buffer: Buffer.concat(chunks, size),
        filePath: destPath,
        size,
        contentType,
        headers
      });
    } catch (err) {
      writeStream.destroy();
      if (fs.existsSync(destPath)) {
        try {
          await fs.unlink(destPath);
        } catch (_) {
          /* ignore */
        }
      }
      throw err;
    }
  };

  const putBuffer = async (buffer, { contentType, headers } = {}) => {
    const bodyRef = idGen();
    const buf = Buffer.isBuffer(buffer) ? buffer : Buffer.from(buffer || []);
    const size = buf.length;
    const destPath = filePathFor(bodyRef);

    await ensureSpillDir();
    await fs.writeFile(destPath, buf);

    return finalizeEntry(bodyRef, {
      buffer: buf,
      filePath: destPath,
      size,
      contentType,
      headers
    });
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

    if (entry.buffer) {
      return entry.buffer.subarray(start, start + len);
    }

    return fs.readFileRange(entry.filePath, { position: start, length: len });
  };

  const assertScriptAccessible = (bodyRef) => {
    getEntry(bodyRef);
  };

  const getBufferForScripts = (bodyRef) => {
    const entry = getEntry(bodyRef);
    return entry.buffer;
  };

  const saveToPath = async (bodyRef, destPath) => {
    const entry = getEntry(bodyRef);
    if (entry.filePath && fs.existsSync(entry.filePath)) {
      await fs.copyFile(entry.filePath, destPath);
      return;
    }
    await fs.writeFile(destPath, entry.buffer);
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

  const getFilePath = (bodyRef) => {
    const entry = getEntry(bodyRef);
    return entry.filePath || null;
  };

  return {
    ingestStream,
    putBuffer,
    getStat,
    readRange,
    getBufferForScripts,
    getFilePath,
    saveToPath,
    pin,
    release,
    assertScriptAccessible,
    _entries: entries
  };
};

module.exports = {
  createResponseBodyStore
};
