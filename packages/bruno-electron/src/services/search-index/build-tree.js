const path = require('node:path');
const { getRequestUid } = require('../../cache/requestUids');

// Not every folder has its own folder.bru/folder.yml — an intermediate directory can exist purely
// as a path segment. This walks every row's own path up to the root, creating an implicit folder
// node for each segment that doesn't already have one, the same way the real mount's
// tree-builder does. `getRequestUid` keeps uids stable across a later real mount of the same path.
const buildFolderTree = (collectionPath, rows) => {
  const folderConfigByItemPath = new Map();
  for (const row of rows) {
    if (row.type === 'folder') folderConfigByItemPath.set(row.itemPath, row);
  }

  const root = { items: [] };
  const foldersByItemPath = new Map([['', root]]);

  const parentOf = (itemPath) => {
    const dirname = path.dirname(itemPath);
    return dirname === '.' ? '' : dirname;
  };

  const ensureFolder = (itemPath) => {
    const existing = foldersByItemPath.get(itemPath);
    if (existing) return existing;

    const parent = ensureFolder(parentOf(itemPath));
    const config = folderConfigByItemPath.get(itemPath);
    const absolutePath = path.join(collectionPath, itemPath);

    const folder = {
      uid: getRequestUid(absolutePath),
      name: config?.name || path.basename(itemPath),
      type: 'folder',
      seq: config?.seq ?? undefined,
      filename: path.basename(itemPath),
      pathname: absolutePath,
      collapsed: true,
      items: []
    };
    parent.items.push(folder);
    foldersByItemPath.set(itemPath, folder);
    return folder;
  };

  for (const row of rows) {
    if (row.type === 'folder') {
      ensureFolder(row.itemPath);
      continue;
    }

    const parent = ensureFolder(row.folderPath || '');
    const absolutePath = path.join(collectionPath, row.itemPath);
    parent.items.push({
      uid: getRequestUid(absolutePath),
      name: row.name,
      type: 'http-request',
      filename: path.basename(row.itemPath),
      pathname: absolutePath,
      request: { method: row.method, url: row.url }
    });
  }

  return root.items;
};

module.exports = { buildFolderTree };
