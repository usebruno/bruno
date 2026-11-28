const path = require('node:path');
const { toPathKey } = require('../collection-search/walk');

const FOLDER_CHECKED_KINDS = new Set(['default-location', 'documents', 'workspace']);

const isAbsolutePath = (value) => typeof value === 'string' && path.isAbsolute(value);

const buildScanLocations = async ({ preferences, documentsPath, defaultWorkspacePath, lastOpenedWorkspacePaths, homePath, systemRoot, isFolder }) => {
  const { searchFolders, searchWholeComputer } = preferences.openCollection;
  const candidates = [
    { kind: 'default-location', path: preferences.general.defaultLocation },
    { kind: 'documents', path: path.join(documentsPath, 'bruno') },
    ...[defaultWorkspacePath, ...lastOpenedWorkspacePaths].map((workspacePath) => ({ kind: 'workspace', path: workspacePath })),
    ...searchFolders.map((folderPath) => ({ kind: 'user', path: folderPath })),
    ...(searchWholeComputer ? [{ kind: 'home', path: homePath }] : [])
  ].filter((candidate) => isAbsolutePath(candidate.path));

  const isKept = await Promise.all(candidates.map((candidate) => !FOLDER_CHECKED_KINDS.has(candidate.kind) || isFolder(candidate.path)));

  const locations = new Map();
  candidates
    .filter((_candidate, index) => isKept[index])
    .forEach((candidate) => {
      const resolvedPath = path.resolve(candidate.path);
      const id = toPathKey(resolvedPath);
      if (!locations.has(id)) {
        locations.set(id, { id, path: resolvedPath, kind: candidate.kind });
      }
    });
  const computer = searchWholeComputer ? [{ id: 'computer', path: systemRoot, kind: 'computer' }] : [];
  return [...locations.values(), ...computer];
};

module.exports = {
  buildScanLocations
};
