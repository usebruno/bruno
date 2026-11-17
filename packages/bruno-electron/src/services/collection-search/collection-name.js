const path = require('node:path');
const yaml = require('js-yaml');
const { readFileStart } = require('./read-file-start');

const NAME_BYTES = 16 * 1024;

const parseYamlValue = (value) => {
  const trimmed = value.trim();
  try {
    const parsed = yaml.load(`value: ${trimmed}`).value;
    return typeof parsed === 'string' ? parsed : trimmed;
  } catch (error) {
    return trimmed;
  }
};

const nameFromOpenCollectionYml = (text) => {
  const infoBlock = text.match(/^info:\s*\n((?:[ \t]+.*\n?)+)/m);
  const infoName = infoBlock && infoBlock[1].match(/^[ \t]+name:(.+)$/m);
  if (infoName) {
    return parseYamlValue(infoName[1]);
  }
  const topLevelName = text.match(/^name:(.+)$/m);
  return topLevelName ? parseYamlValue(topLevelName[1]) : null;
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
  const ymlText = await readFileStart(path.join(collectionPath, 'opencollection.yml'), NAME_BYTES);
  const name = ymlText
    ? nameFromOpenCollectionYml(ymlText.replace(/\r\n?/g, '\n'))
    : nameFromBrunoJson(await readFileStart(path.join(collectionPath, 'bruno.json'), NAME_BYTES));
  return name || path.basename(collectionPath);
};

module.exports = {
  readCollectionName
};
