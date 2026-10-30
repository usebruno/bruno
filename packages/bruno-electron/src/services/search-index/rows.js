const path = require('node:path');
const { defaultClassify } = require('../../utils/mount');

const folderInfo = (relativePath) => {
  const dir = path.dirname(relativePath);
  return dir === '.' || dir === '' ? { folderPath: null, folderName: null } : { folderPath: dir, folderName: path.basename(dir) };
};

const isSeqValid = (seq) => Number.isInteger(seq) && seq > 0;

const metaFrom = (type, data) => {
  if (type === 'folder') {
    const meta = data?.meta || data?.info || {};
    return { name: meta.name || null, seq: isSeqValid(meta.seq) ? meta.seq : null };
  }
  const config = type === 'collection' ? data?.brunoConfig : data;
  return { name: typeof config?.name === 'string' && config.name ? config.name : null, seq: null };
};

const toRow = (collectionPath, collectionName, { relativePath, mtime, hash, data, error }) => ({
  collectionPath,
  collectionName,
  ...folderInfo(relativePath),
  requestPath: relativePath,
  requestName: data?.name || path.basename(relativePath),
  requestType: data?.request?.method || null,
  requestUrl: data?.request?.url || null,
  requestProtocol: data?.type || 'http-request',
  requestSeq: Number.isFinite(data?.seq) ? data.seq : null,
  requestError: error ? String(error.message ?? error) : null,
  mtime,
  hash
});

const toMetaRow = (collectionPath, { relativePath, mtime, hash, data }) => {
  const type = defaultClassify(relativePath)?.type;
  if (type !== 'config' && type !== 'collection' && type !== 'folder') return null;
  const folderPath = type === 'folder' ? path.dirname(relativePath) : '';
  if (type === 'folder' && folderPath === '.') return null;
  return { collectionPath, relativePath, entity: type === 'folder' ? 'folder' : 'collection', folderPath, ...metaFrom(type, data), mtime, hash };
};

module.exports = { toRow, toMetaRow };
