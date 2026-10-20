const fs = require('node:fs');
const path = require('node:path');
const filestore = require('@usebruno/filestore');
const { readBruMetaFromFile } = require('./bru');
const { readYmlMetaFromFile } = require('./yml');

const readMetaFromFile = async (absolutePath, { format, type }) => {
  if (format === 'json' && type === 'config') {
    const raw = await fs.promises.readFile(absolutePath, 'utf8');
    return JSON.parse(raw);
  }

  if (type === 'environment') {
    const raw = await fs.promises.readFile(absolutePath, 'utf8');
    return filestore.parseEnvironment(raw, { format });
  }

  if (format === 'bru') {
    return readBruMetaFromFile(absolutePath, type);
  }

  if (format === 'yml') {
    return readYmlMetaFromFile(absolutePath, type);
  }

  throw new Error(`Unsupported format for meta stream: ${format}`);
};

const readMetaForRelativePath = async (collectionPath, relativePath, cls) =>
  readMetaFromFile(path.join(collectionPath, relativePath), cls);

module.exports = {
  readMetaFromFile,
  readMetaForRelativePath
};
