const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const { app } = require('electron');

const getTransientDirectoryBase = () => {
  return path.join(app.getPath('userData'), 'tmp', 'transient');
};

const hashIdentity = (identity) => {
  return crypto.createHash('sha256').update(identity).digest('hex').slice(0, 16);
};

const ensureDirectory = (dirname, metadata) => {
  fs.mkdirSync(dirname, { recursive: true });
  fs.writeFileSync(path.join(dirname, 'metadata.json'), JSON.stringify(metadata));
  return dirname;
};

const ensureCollectionTransientDirectory = (collectionPath) => {
  const resolvedCollectionPath = path.resolve(collectionPath);
  const dirname = path.join(
    getTransientDirectoryBase(),
    `bruno-${hashIdentity(resolvedCollectionPath)}`
  );

  return ensureDirectory(dirname, { collectionPath: resolvedCollectionPath });
};

const ensureScratchTransientDirectory = ({ workspaceUid, workspacePath }) => {
  const identity = workspacePath || workspaceUid;
  const dirname = path.join(
    getTransientDirectoryBase(),
    `bruno-scratch-${hashIdentity(identity)}`
  );

  return ensureDirectory(dirname, {
    workspaceUid,
    workspacePath,
    type: 'scratch'
  });
};

module.exports = {
  ensureCollectionTransientDirectory,
  ensureScratchTransientDirectory,
  getTransientDirectoryBase
};
