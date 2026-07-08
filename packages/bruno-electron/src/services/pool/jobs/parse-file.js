const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const filestore = require('@usebruno/filestore');

const sha256 = (buf) => crypto.createHash('sha256').update(buf).digest('hex');

const REDACT_BODY_THRESHOLD = 512 * 1024;

const parseLargeBruRequest = (content, format) => {
  const { bruFileStringWithRedactedBody, extractedBodyContent } = filestore.parseRequestAndRedactBody(content, { format });
  const data = filestore.parseRequest(bruFileStringWithRedactedBody, { format });
  data.request = data.request || {};
  data.request.body = data.request.body || {};
  const body = extractedBodyContent || {};
  if (body.json) data.request.body.json = body.json;
  if (body.text) data.request.body.text = body.text;
  if (body.xml) data.request.body.xml = body.xml;
  if (body.sparql) data.request.body.sparql = body.sparql;
  if (body.graphql) {
    data.request.body.graphql = data.request.body.graphql || {};
    data.request.body.graphql.query = body.graphql;
  }
  return data;
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
  switch (type) {
    case 'request':
      if (format === 'bru' && byteSize >= REDACT_BODY_THRESHOLD) return parseLargeBruRequest(content, format);
      return filestore.parseRequest(content, options);
    case 'collection':
      return filestore.parseCollection(content, options);
    case 'folder':
      return filestore.parseFolder(content, options);
    case 'environment':
      return filestore.parseEnvironment(content, options);
    default:
      throw new Error(`Unknown type: ${type}`);
  }
};

const parseFile = ({ collectionPath, relativePath, format, type }) => {
  const absolutePath = path.join(collectionPath, relativePath);
  const buf = fs.readFileSync(absolutePath);
  const stat = fs.statSync(absolutePath, { bigint: true });
  const mtime = stat.mtimeNs;
  const hash = sha256(buf);
  const content = buf.toString('utf8');
  try {
    const data = parseContent(content, format, type, buf.length);
    return { relativePath, mtime, hash, data, format, type };
  } catch (err) {
    const data = format === 'bru' && type === 'request' ? extractBruMeta(content) : {};
    return { relativePath, mtime, hash, data, format, type, partial: true, error: { message: err.message, stack: err.stack } };
  }
};

module.exports = parseFile;
