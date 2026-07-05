const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const filestore = require('@usebruno/filestore');

const sha256 = (buf) => crypto.createHash('sha256').update(buf).digest('hex');

const parseContent = (content, format, type) => {
  if (type === 'config' || format === 'json') return JSON.parse(content);
  const options = { format };
  switch (type) {
    case 'request':
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
  const content = buf.toString('utf8');
  const data = parseContent(content, format, type);
  return { relativePath, mtime: stat.mtimeNs, hash: sha256(buf), data, format, type };
};

module.exports = parseFile;
