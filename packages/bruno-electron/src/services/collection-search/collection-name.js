const path = require('node:path');
const { parseCollection } = require('@usebruno/filestore');
const { readFileStart } = require('./read-file-start');

const CONFIG_BYTES = 1024 * 1024;

const nameFromOpenCollectionYml = (text) => {
  try {
    return parseCollection(text, { format: 'yml' }).brunoConfig.name;
  } catch (error) {
    return null;
  }
};

const nameFromBrunoJson = (text) => {
  try {
    const config = JSON.parse(text);
    return config && typeof config.name === 'string' && config.name.trim() ? config.name.trim() : null;
  } catch (error) {
    const match = text.match(/"name"\s*:\s*"((?:[^"\\]|\\.)*)"/);
    return match ? match[1] : null;
  }
};

const readCollectionName = async (collectionPath) => {
  const ymlText = await readFileStart(path.join(collectionPath, 'opencollection.yml'), CONFIG_BYTES);
  const name = ymlText
    ? nameFromOpenCollectionYml(ymlText)
    : nameFromBrunoJson(await readFileStart(path.join(collectionPath, 'bruno.json'), CONFIG_BYTES));
  return name || path.basename(collectionPath);
};

module.exports = {
  readCollectionName
};
