const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const filestore = require('@usebruno/filestore');

const sha256 = (buf) => crypto.createHash('sha256').update(buf).digest('hex');

const LARGE_FILE_REDACT_THRESHOLD = 64 * 1024;

const parseLargeBru = (content, format, type) => {
  const { skeleton, blocks } = filestore.redactLargeBruTextBlocks(content);
  let data;
  switch (type) {
    case 'request':
      data = filestore.parseRequest(skeleton, { format });
      break;
    case 'collection':
      data = filestore.parseCollection(skeleton, { format });
      break;
    case 'folder':
      data = filestore.parseFolder(skeleton, { format });
      break;
    default:
      return null;
  }
  return filestore.restoreRedactedBlocks(data, blocks);
};

const extractBruMeta = (content) => {
  const data = {};
  const match = content.match(/meta\s*\{\s*([\s\S]*?)\s*\}/);
  if (match) {
    for (const line of match[1].replace(/\r\n/g, '\n').split('\n')) {
      const idx = line.indexOf(':');
      if (idx === -1) continue;
      const key = line.slice(0, idx).trim();
      const value = line.slice(idx + 1).trim();
      if (!key || !value) continue;
      data[key] = Number.isNaN(Number(value)) ? value : Number(value);
    }
  }
  if (data.type === 'http') data.type = 'http-request';
  else if (data.type === 'graphql') data.type = 'graphql-request';
  return data;
};

const parseContent = (content, format, type, byteSize) => {
  if (type === 'config' || format === 'json') return JSON.parse(content);
  const options = { format };
  const isLargeBru = format === 'bru' && byteSize >= LARGE_FILE_REDACT_THRESHOLD;
  switch (type) {
    case 'request':
      if (isLargeBru) return parseLargeBru(content, format, type);
      return filestore.parseRequest(content, options);
    case 'collection':
      if (isLargeBru) return parseLargeBru(content, format, type);
      return filestore.parseCollection(content, options);
    case 'folder':
      if (isLargeBru) return parseLargeBru(content, format, type);
      return filestore.parseFolder(content, options);
    case 'environment':
      return filestore.parseEnvironment(content, options);
    default:
      throw new Error(`Unknown type: ${type}`);
  }
};

// `treeFieldsOnly` is the mount path for requests: it parses just the fields a tree node needs and
// returns `byteSize` in place of `raw`, so neither the full parse nor the file's text is paid for.
// Returning `raw` for every file would push the whole collection's bytes back across the worker
// boundary; the cache path still asks for it because it stages `raw`.
const parseFile = ({ collectionPath, relativePath, format, type, treeFieldsOnly = false }) => {
  const absolutePath = path.join(collectionPath, relativePath);
  const buf = fs.readFileSync(absolutePath);
  const stat = fs.statSync(absolutePath, { bigint: true });
  const mtime = stat.mtimeNs;
  const content = buf.toString('utf8');
  const treeFieldsRequest = treeFieldsOnly && type === 'request';
  const hash = treeFieldsRequest ? '' : sha256(buf);
  const payload = treeFieldsRequest ? { byteSize: buf.length } : { raw: content };

  try {
    const data = treeFieldsRequest
      ? filestore.parseRequestTreeFields(content, { format })
      : parseContent(content, format, type, buf.length);
    return { relativePath, mtime, hash, data, format, type, ...payload };
  } catch (err) {
    const data = format === 'bru' && type === 'request' ? extractBruMeta(content) : {};
    return { relativePath, mtime, hash, data, format, type, ...payload, partial: true, error: { message: err.message, stack: err.stack } };
  }
};

module.exports = parseFile;
