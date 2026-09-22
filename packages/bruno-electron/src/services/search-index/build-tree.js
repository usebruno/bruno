const path = require('node:path');
const { getRequestUid } = require('../../cache/requestUids');

const buildFolderTree = (collectionPath, rows) => {
  const root = { items: [] };
  const foldersByPath = new Map([['', root]]);

  const parentOf = (relativePath) => {
    const dirname = path.dirname(relativePath);
    return dirname === '.' ? '' : dirname;
  };

  const ensureFolder = (relativePath) => {
    const existing = foldersByPath.get(relativePath);
    if (existing) return existing;

    const parent = ensureFolder(parentOf(relativePath));
    const absolutePath = path.join(collectionPath, relativePath);

    const folder = {
      uid: getRequestUid(absolutePath),
      name: path.basename(relativePath),
      type: 'folder',
      filename: path.basename(relativePath),
      pathname: absolutePath,
      collapsed: true,
      items: []
    };
    parent.items.push(folder);
    foldersByPath.set(relativePath, folder);
    return folder;
  };

  for (const row of rows) {
    const parent = ensureFolder(row.folderPath || '');
    const absolutePath = path.join(collectionPath, row.requestPath);
    parent.items.push({
      uid: getRequestUid(absolutePath),
      name: row.requestName,
      type: row.requestProtocol || 'http-request',
      filename: path.basename(row.requestPath),
      pathname: absolutePath,
      request: { method: row.requestType, url: row.requestUrl }
    });
  }

  return root.items;
};

module.exports = { buildFolderTree };
