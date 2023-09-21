const {
  bruToEnvJson: bruToEnvJsonV1,
  bruToJson: bruToJsonV1,

  jsonToBruV2,
  envJsonToBruV2
} = require('@usebruno/lang');
const _ = require('lodash');

const { writeFile } = require('../utils/filesystem');

const isLegacyEnvFile = (bruContent = '') => {
  bruContent = bruContent.trim();
  let regex = /^vars[\s\S]*\/vars$/;

  return regex.test(bruContent);
};

const migrateLegacyEnvFile = async (bruContent, pathname) => {
  const envJson = bruToEnvJsonV1(bruContent);
  const newBruContent = envJsonToBruV2(envJson);

  await writeFile(pathname, newBruContent);

  return newBruContent;
};

const isLegacyBruFile = (bruContent = '') => {
  bruContent = bruContent.trim();
  let lines = bruContent.split(/\r?\n/);
  let hasName = false;
  let hasMethod = false;
  let hasUrl = false;

  for (let line of lines) {
    line = line.trim();
    if (line.startsWith('name')) {
      hasName = true;
    } else if (line.startsWith('method')) {
      hasMethod = true;
    } else if (line.startsWith('url')) {
      hasUrl = true;
    }
  }

  return hasName && hasMethod && hasUrl;
};

const migrateLegacyBruFile = async (bruContent, pathname) => {
  const json = bruToJsonV1(bruContent);

  let type = _.get(json, 'type');
  if (type === 'http-request') {
    type = 'http';
  } else if (type === 'graphql-request') {
    type = 'graphql';
  } else {
    type = 'http';
  }

  let script = {};
  let legacyScript = _.get(json, 'request.script');
  if (legacyScript && legacyScript.trim().length > 0) {
    script = {
      res: legacyScript
    };
  }

  const bruJson = {
    meta: {
      name: _.get(json, 'name'),
      type: type,
      seq: _.get(json, 'seq')
    },
    http: {
      method: _.lowerCase(_.get(json, 'request.method')),
      url: _.get(json, 'request.url'),
      body: _.get(json, 'request.body.mode', 'none')
    },
    query: _.get(json, 'request.params', []),
    headers: _.get(json, 'request.headers', []),
    body: _.get(json, 'request.body', {}),
    script: script,
    tests: _.get(json, 'request.tests', '')
  };

  const newBruContent = jsonToBruV2(bruJson);

  await writeFile(pathname, newBruContent);

  return newBruContent;
};

module.exports = {
  isLegacyEnvFile,
  migrateLegacyEnvFile,
  isLegacyBruFile,
  migrateLegacyBruFile
};
