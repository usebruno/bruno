const fs = require('node:fs/promises');
const path = require('node:path');
const AdmZip = require('adm-zip');
const yaml = require('js-yaml');
const { isGitMetadataName } = require('./filesystem');
const { getUnopenableWorkspaceCollections, getWorkspaceCollections, validateWorkspaceConfig } = require('./workspace-config');

const WORKSPACE_FILE_NAME = 'workspace.yml';

const isWorkspaceFolder = async (folderPath) => {
  try {
    return validateWorkspaceConfig(yaml.load(await fs.readFile(path.join(folderPath, WORKSPACE_FILE_NAME), 'utf8')));
  } catch (error) {
    return false;
  }
};

const readWorkspaceCollections = async (folderPath) => {
  if (!(await isWorkspaceFolder(folderPath))) {
    return null;
  }
  try {
    const workspaceCollections = getWorkspaceCollections(folderPath);
    const collectionPaths = workspaceCollections.filter((collection) => !collection.notFoundLocally).map((collection) => collection.path);
    const notClonedCount = workspaceCollections.length - collectionPaths.length;
    return { collectionPaths, missingCollectionCount: notClonedCount + getUnopenableWorkspaceCollections(folderPath).length };
  } catch (error) {
    return { collectionPaths: [], missingCollectionCount: 0 };
  }
};

const findWorkspaceFileEntry = (entries) => {
  const contentEntries = entries.filter((entry) => !isGitMetadataName(entry.entryName.split('/')[0]));
  const topLevelNames = new Set(contentEntries.map((entry) => entry.entryName.split('/')[0]));
  const [onlyTopLevelName] = topLevelNames;
  const isInOneFolder = topLevelNames.size === 1 && contentEntries.some((entry) => entry.entryName.startsWith(`${onlyTopLevelName}/`));
  const workspaceFilePath = isInOneFolder ? `${onlyTopLevelName}/${WORKSPACE_FILE_NAME}` : WORKSPACE_FILE_NAME;
  return contentEntries.find((entry) => entry.entryName === workspaceFilePath);
};

const isWorkspaceExport = (zip) => {
  try {
    const workspaceFileEntry = findWorkspaceFileEntry(zip.getEntries());
    return Boolean(workspaceFileEntry) && validateWorkspaceConfig(yaml.load(zip.readAsText(workspaceFileEntry)));
  } catch (error) {
    return false;
  }
};

const isWorkspaceZip = (zipFilePath) => {
  try {
    return isWorkspaceExport(new AdmZip(zipFilePath));
  } catch (error) {
    return false;
  }
};

module.exports = {
  readWorkspaceCollections,
  isWorkspaceExport,
  isWorkspaceZip
};
