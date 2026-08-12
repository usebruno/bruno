const fs = require('node:fs');
const path = require('node:path');
const yaml = require('js-yaml');
const { $RefParser } = require('@apidevtools/json-schema-ref-parser');

const REF_PARSER_OPTIONS = {
  resolve: { external: true, http: false },
  continueOnError: true
};

const URI_SCHEME_REGEX = /^[a-z][a-z\d+\-.]+:/i;

const parseApiSpecContent = (content, extension) => {
  const ext = (extension || '').toLowerCase();

  try {
    if (ext === '.yaml' || ext === '.yml') {
      return yaml.load(content);
    } else if (ext === '.json') {
      return JSON.parse(content);
    }
  } catch {
    return null;
  }

  return null;
};

const externalRefTarget = (ref, specDir) => {
  if (typeof ref !== 'string') return null;

  const [filePath] = ref.split('#');
  if (!filePath || URI_SCHEME_REGEX.test(filePath)) return null;

  return path.resolve(specDir, filePath);
};

const containsExternalFileRef = (node, specDir, visited = new Set()) => {
  if (!node || typeof node !== 'object' || visited.has(node)) return false;
  visited.add(node);

  const refTarget = externalRefTarget(node.$ref, specDir);
  if (refTarget && fs.existsSync(refTarget)) return true;

  return Object.values(node).some((value) => containsExternalFileRef(value, specDir, visited));
};

const resolveExternalApiSpecRefs = async (json, apiSpecPath) => {
  if (!containsExternalFileRef(json, path.dirname(apiSpecPath))) return null;

  const parser = new $RefParser();
  try {
    return await parser.bundle(apiSpecPath, structuredClone(json), REF_PARSER_OPTIONS);
  } catch {
    return parser.schema ?? null;
  }
};

module.exports = { parseApiSpecContent, resolveExternalApiSpecRefs };
