const fs = require('fs');
const path = require('path');
const jsyaml = require('js-yaml');
const { app } = require('electron');
const axios = require('axios');
const { parseCollection } = require('@usebruno/filestore');
const { getCollectionFormat } = require('../../utils/filesystem');

const parseSpec = (content) => {
  try {
    return JSON.parse(content);
  } catch {
    return jsyaml.load(content);
  }
};

const isValidHttpUrl = (url) => /^https?:\/\//i.test(url);

const isLocalFilePath = (sourceUrl) => {
  if (!sourceUrl || typeof sourceUrl !== 'string') return false;
  return !isValidHttpUrl(sourceUrl);
};

const resolveSourceUrl = (collectionPath, sourceUrl) => {
  if (!sourceUrl || isValidHttpUrl(sourceUrl)) return sourceUrl;
  return path.resolve(collectionPath, sourceUrl);
};

const getSpecsDir = () => path.join(app.getPath('userData'), 'specs');

const loadSpecMetadata = () => {
  const metadataPath = path.join(getSpecsDir(), 'metadata.json');
  if (!fs.existsSync(metadataPath)) {
    return {};
  }

  try {
    return JSON.parse(fs.readFileSync(metadataPath, 'utf8'));
  } catch {
    return {};
  }
};

const isValidOpenApiSpec = (spec) => {
  if (!spec || typeof spec !== 'object') return false;
  if (spec.swagger) return false;
  return Boolean(spec.openapi && String(spec.openapi).startsWith('3.') && spec.paths);
};

const loadBrunoConfig = (collectionPath) => {
  const format = getCollectionFormat(collectionPath);

  if (format === 'yml') {
    const configFilePath = path.join(collectionPath, 'opencollection.yml');
    if (!fs.existsSync(configFilePath)) {
      return null;
    }

    const content = fs.readFileSync(configFilePath, 'utf8');
    const parsed = parseCollection(content, { format });
    return parsed.brunoConfig || null;
  }

  const brunoJsonPath = path.join(collectionPath, 'bruno.json');
  if (!fs.existsSync(brunoJsonPath)) {
    return null;
  }

  return JSON.parse(fs.readFileSync(brunoJsonPath, 'utf8'));
};

const readStoredSpec = (collectionPath) => {
  const metadata = loadSpecMetadata();
  const entry = (metadata[collectionPath] || [])[0];
  if (!entry?.filename) return null;

  const specPath = path.join(getSpecsDir(), entry.filename);
  if (!fs.existsSync(specPath)) return null;

  return fs.readFileSync(specPath, 'utf8');
};

const fetchRemoteSpec = async (sourceUrl) => {
  const response = await axios.get(sourceUrl, {
    timeout: 15000,
    responseType: 'text',
    validateStatus: (status) => status >= 200 && status < 300
  });

  return response.data;
};

const loadCollectionOpenApiSpec = async (collectionPath, brunoConfigInput = null) => {
  const brunoConfig = brunoConfigInput || loadBrunoConfig(collectionPath);
  const sourceUrl = brunoConfig?.openapi?.[0]?.sourceUrl;
  if (!sourceUrl) {
    return null;
  }

  const resolvedSourceUrl = resolveSourceUrl(collectionPath, sourceUrl);
  let content = null;

  try {
    content = readStoredSpec(collectionPath);
  } catch {
    content = null;
  }

  if (!content && isLocalFilePath(resolvedSourceUrl) && fs.existsSync(resolvedSourceUrl)) {
    content = fs.readFileSync(resolvedSourceUrl, 'utf8');
  }

  if (!content && isValidHttpUrl(resolvedSourceUrl)) {
    try {
      content = await fetchRemoteSpec(resolvedSourceUrl);
    } catch (err) {
      console.warn(`[MockServer] Failed to fetch OpenAPI spec: ${err.message}`);
    }
  }

  if (!content) {
    return null;
  }

  const spec = parseSpec(content);
  return isValidOpenApiSpec(spec) ? spec : null;
};

module.exports = {
  loadBrunoConfig,
  loadCollectionOpenApiSpec,
  parseSpec,
  isValidOpenApiSpec
};
