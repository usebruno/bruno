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

const isPlainObject = (value) => Boolean(value) && typeof value === 'object' && !Array.isArray(value);

const parseAndValidateApiSpec = (content) => {
  let spec;
  try {
    spec = yaml.load(content);
  } catch (err) {
    const detail = err.mark ? `${err.reason} (line ${err.mark.line + 1}, column ${err.mark.column + 1}).` : err.message;
    throw new Error(`API spec is not valid YAML or JSON: ${detail}`);
  }

  const version = isPlainObject(spec) ? spec.openapi || spec.swagger : null;
  if (typeof version !== 'string' || !version.trim() || !isPlainObject(spec.info)) {
    throw new Error('API spec must have an openapi or swagger version and an info object.');
  }

  if (!isPlainObject(spec.paths) || !Object.keys(spec.paths).length) {
    throw new Error('API spec does not define any paths.');
  }

  return spec;
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

const refFilePathsOf = (parser, apiSpecPath) => {
  const root = path.resolve(apiSpecPath);

  return (parser?.$refs.paths('file') ?? [])
    .map((refFilePath) => path.resolve(refFilePath))
    .filter((refFilePath) => refFilePath !== root);
};

const resolveExternalApiSpecRefs = async (json, apiSpecPath) => {
  let parser;
  try {
    if (!containsExternalFileRef(json, path.dirname(apiSpecPath))) {
      return { resolvedJson: null, refFilePaths: [] };
    }
    parser = new $RefParser();
    const resolvedJson = await parser.bundle(apiSpecPath, structuredClone(json), REF_PARSER_OPTIONS);

    return { resolvedJson, refFilePaths: refFilePathsOf(parser, apiSpecPath) };
  } catch {
    return { resolvedJson: parser?.schema ?? null, refFilePaths: refFilePathsOf(parser, apiSpecPath) };
  }
};

module.exports = { parseApiSpecContent, parseAndValidateApiSpec, resolveExternalApiSpecRefs };
