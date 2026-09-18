const fs = require('fs');
const path = require('path');

const {
  stringifyRequest,
  stringifyCollection,
  stringifyEnvironment,
  DEFAULT_COLLECTION_FORMAT
} = require('@usebruno/filestore');

const { sanitizeName, validateName } = require('@usebruno/cli/filesystem');
const { getCollectionFormat } = require('@usebruno/cli/collection');

const DEFAULT_GITIGNORE = 'node_modules\n';

const FORMAT_EXT = { yml: '.yml', bru: '.bru' };

const assertSafeFolder = (folder) => {
  if (!folder) return;
  if (path.isAbsolute(folder)) {
    throw new Error(`folder must be a relative path inside the collection, got absolute: ${folder}`);
  }
  const segments = folder.split(/[/\\]/);
  if (segments.some((s) => s === '..')) {
    throw new Error(`folder must not contain '..' traversal: ${folder}`);
  }
};

const createCollection = async ({ name, outputPath, format = DEFAULT_COLLECTION_FORMAT }) => {
  if (!name) throw new Error('name is required');
  if (!outputPath) throw new Error('outputPath is required');
  if (!FORMAT_EXT[format]) throw new Error(`format must be 'yml' or 'bru', got: ${format}`);

  const folderName = sanitizeName(name);
  if (!validateName(folderName)) {
    throw new Error(`invalid collection name after sanitization: ${folderName}`);
  }

  const collectionPath = path.resolve(outputPath, folderName);

  if (fs.existsSync(collectionPath)) {
    const files = fs.readdirSync(collectionPath);
    if (files.length > 0) {
      throw new Error(`target path is not empty: ${collectionPath}`);
    }
  } else {
    fs.mkdirSync(collectionPath, { recursive: true });
  }

  if (format === 'yml') {
    const brunoConfig = {
      opencollection: '1.0.0',
      name,
      type: 'collection',
      ignore: ['node_modules', '.git']
    };
    const collectionRoot = { meta: { name } };
    const content = stringifyCollection(collectionRoot, brunoConfig, { format });
    fs.writeFileSync(path.join(collectionPath, 'opencollection.yml'), content);
  } else {
    const brunoConfig = {
      version: '1',
      name,
      type: 'collection',
      ignore: ['node_modules', '.git']
    };
    fs.writeFileSync(path.join(collectionPath, 'bruno.json'), JSON.stringify(brunoConfig, null, 2) + '\n');
  }

  fs.mkdirSync(path.join(collectionPath, 'environments'), { recursive: true });
  fs.writeFileSync(path.join(collectionPath, '.gitignore'), DEFAULT_GITIGNORE);

  return { collectionPath, format };
};

const createRequest = async ({
  collectionPath,
  name,
  method = 'GET',
  url,
  folder = null,
  headers = [],
  body = { mode: 'none' },
  auth = { mode: 'none' },
  seq = 1
}) => {
  if (!collectionPath) throw new Error('collectionPath is required');
  if (!name) throw new Error('name is required');
  if (!url) throw new Error('url is required');

  const format = getCollectionFormat(collectionPath);
  if (!format) {
    throw new Error(`not a Bruno collection (no bruno.json or opencollection.yml): ${collectionPath}`);
  }

  const filename = sanitizeName(name);
  if (!validateName(filename)) {
    throw new Error(`invalid request name after sanitization: ${filename}`);
  }

  assertSafeFolder(folder);
  const targetDir = folder ? path.resolve(collectionPath, folder) : collectionPath;
  if (!targetDir.startsWith(path.resolve(collectionPath))) {
    throw new Error(`resolved folder escapes collection: ${targetDir}`);
  }
  fs.mkdirSync(targetDir, { recursive: true });

  const filePath = path.join(targetDir, `${filename}${FORMAT_EXT[format]}`);
  if (fs.existsSync(filePath)) {
    throw new Error(`request file already exists: ${filePath}`);
  }

  const requestObj = {
    type: 'http-request',
    name: filename,
    seq,
    settings: {},
    tags: [],
    request: {
      method: method.toUpperCase(),
      url,
      headers: Array.isArray(headers) ? headers : [],
      auth,
      body,
      script: {},
      vars: {},
      assertions: [],
      tests: '',
      docs: '',
      params: []
    },
    examples: []
  };

  const content = stringifyRequest(requestObj, { format });
  fs.writeFileSync(filePath, content);

  return {
    requestPath: filePath,
    relativePath: path.relative(collectionPath, filePath),
    format
  };
};

const createEnvironment = async ({ collectionPath, name, variables = {} }) => {
  if (!collectionPath) throw new Error('collectionPath is required');
  if (!name) throw new Error('name is required');

  const format = getCollectionFormat(collectionPath);
  if (!format) {
    throw new Error(`not a Bruno collection (no bruno.json or opencollection.yml): ${collectionPath}`);
  }

  const envName = sanitizeName(name);
  if (!validateName(envName)) {
    throw new Error(`invalid environment name after sanitization: ${envName}`);
  }

  const envDir = path.join(collectionPath, 'environments');
  fs.mkdirSync(envDir, { recursive: true });

  const filePath = path.join(envDir, `${envName}${FORMAT_EXT[format]}`);
  if (fs.existsSync(filePath)) {
    throw new Error(`environment file already exists: ${filePath}`);
  }

  const envObj = {
    variables: Object.entries(variables).map(([k, v]) => ({
      name: k,
      value: String(v),
      enabled: true,
      secret: false,
      type: 'text'
    }))
  };

  const content = stringifyEnvironment(envObj, { format });
  fs.writeFileSync(filePath, content);

  return { environmentPath: filePath, format };
};

module.exports = {
  createCollection,
  createRequest,
  createEnvironment
};
