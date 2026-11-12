const fs = require('node:fs/promises');
const path = require('node:path');
const { parseCollection } = require('@usebruno/filestore');
const { validateSchema } = require('../../app/collections');

const CONFIG_FILES = [
  { name: 'opencollection.yml', maxBytes: 64 * 1024, parse: (text) => parseCollection(text, { format: 'yml' }).brunoConfig },
  { name: 'bruno.json', maxBytes: 1024 * 1024, parse: JSON.parse }
];

const findConfigFile = async (collectionPath) => {
  for (const configFile of CONFIG_FILES) {
    const filePath = path.join(collectionPath, configFile.name);
    const stats = await fs.stat(filePath).catch(() => null);
    if (stats) {
      return { ...configFile, filePath, stats };
    }
  }
  throw new Error(`No collection config in ${collectionPath}`);
};

const readCollectionConfig = async (collectionPath) => {
  const folderName = path.basename(collectionPath);
  try {
    const { filePath, stats, maxBytes, parse } = await findConfigFile(collectionPath);
    if (!stats.isFile()) {
      return { name: folderName, isBroken: true };
    }
    if (stats.size > maxBytes) {
      return { name: folderName, isBroken: false };
    }
    const config = parse(await fs.readFile(filePath, 'utf8'));
    await validateSchema(config);
    return { name: String(config.name), isBroken: false };
  } catch (error) {
    return { name: folderName, isBroken: true };
  }
};

module.exports = {
  readCollectionConfig
};
