import jsyaml from 'js-yaml';
import { callIpc } from 'utils/common/ipc';
import { isBrunoCollection } from 'utils/importers/bruno-collection';
import { fetchAndValidateApiSpecFromUrl } from 'utils/importers/common';
import { parseFileText } from 'utils/importers/file-reader';
import { isInsomniaCollection } from 'utils/importers/insomnia-collection';
import { isOpenCollection } from 'utils/importers/opencollection';
import { isOpenApiSpec, isSwagger2Spec } from 'utils/importers/openapi-collection';
import { isPostmanCollection } from 'utils/importers/postman-collection';
import { isWSDLCollection } from 'utils/importers/wsdl-collection';
import { isValidUrl } from 'utils/url/index';

const UNSUPPORTED_FORMAT = 'Unsupported collection format';
const ZIP_FILE = /\.zip$/i;
const HTTP_URL = /^https?:\/\//i;

const IMPORT_FORMATS = [
  ['openapi', isOpenApiSpec],
  ['wsdl', isWSDLCollection],
  ['postman', isPostmanCollection],
  ['insomnia', isInsomniaCollection],
  ['opencollection', isOpenCollection],
  ['bruno', isBrunoCollection]
];

const detectImportFormat = (data) => IMPORT_FORMATS.find(([, matches]) => matches(data))?.[0];

const getFilePath = (file) => window.ipcRenderer.getFilePath(file);

const readBrunoZip = async (zipFilePath, fileName) => {
  if (!(await callIpc('renderer:is-bruno-collection-zip', zipFilePath))) {
    throw new Error('The ZIP file is not a valid Bruno collection');
  }
  return { rawData: { zipFilePath, collectionName: fileName.replace(ZIP_FILE, '') }, type: 'bruno-zip' };
};

const parseImportFile = (text, file, filePath) => {
  const data = parseFileText(text, file);
  if (!data) {
    throw new Error('Failed to parse file content');
  }
  const type = detectImportFormat(data);
  if (!type) {
    throw new Error(UNSUPPORTED_FORMAT);
  }
  if (type === 'openapi') {
    return { rawData: data, type, filePath, rawContent: text };
  }
  return type === 'wsdl' ? { rawData: data, type, filePath } : { rawData: data, type };
};

const readFileForBulkImport = async (file) => {
  try {
    const text = await file.text();
    const data = parseFileText(text, file);
    const type = detectImportFormat(data);
    return type
      ? { file, data, type, filePath: getFilePath(file), rawContent: type === 'openapi' && !isSwagger2Spec(data) ? text : undefined }
      : null;
  } catch (error) {
    console.warn(`Failed to process file ${file.name}:`, error);
    return null;
  }
};

const readSeveralFiles = async (files) => {
  const results = await Promise.all(files.map(readFileForBulkImport));
  const filesData = results.filter(Boolean);
  if (filesData.length === 0) {
    throw new Error('No valid collections found in the selected files');
  }
  const skippedFileNames = files.filter((file, index) => !results[index]).map((file) => file.name);
  return { filesData, type: 'multiple', skippedFileNames };
};

export const readImportFiles = async (files) => {
  const zipFiles = files.filter((file) => ZIP_FILE.test(file.name));
  if (zipFiles.length > 0 && zipFiles.length < files.length) {
    throw new Error('Cannot mix ZIP files with other file types. Please select either a single ZIP file OR collection files (JSON/YAML)');
  }
  if (zipFiles.length > 1) {
    throw new Error('Multiple ZIP files selected. Please select only one ZIP file at a time for import.');
  }
  if (zipFiles.length === 1) {
    return readBrunoZip(getFilePath(zipFiles[0]), zipFiles[0].name);
  }
  if (files.length > 1) {
    return readSeveralFiles(files);
  }
  const [file] = files;
  return parseImportFile(await file.text(), file, getFilePath(file));
};

export const readImportableFile = async ({ path, name }) => {
  if (ZIP_FILE.test(name)) {
    return readBrunoZip(path, name);
  }
  const text = await callIpc('renderer:collection-search:read-importable-file', { path });
  return parseImportFile(text, { name }, path);
};

const readImportUrl = async (url) => {
  if (!isValidUrl(url)) {
    throw new Error('Please enter a valid URL');
  }
  let fetched;
  try {
    fetched = await fetchAndValidateApiSpecFromUrl({ url });
  } catch (error) {
    throw new Error('URL import failed. Please check the URL and try again.');
  }
  const type = typeof fetched.data === 'object' && detectImportFormat(fetched.data);
  if (!type) {
    throw new Error(UNSUPPORTED_FORMAT);
  }
  return { rawData: fetched.data, type, sourceUrl: url, rawContent: fetched.rawContent };
};

const parseRawText = (text) => {
  let data = null;
  try {
    data = JSON.parse(text);
  } catch (jsonError) {
    try {
      data = jsyaml.load(text, { schema: jsyaml.JSON_SCHEMA });
    } catch (yamlError) {
      data = null;
    }
  }
  if (!data || typeof data !== 'object') {
    throw new Error('Could not parse the text as JSON or YAML');
  }
  return data;
};

const readRawText = async (text) => {
  const data = parseRawText(text);
  const type = detectImportFormat(data);
  if (!type) {
    throw new Error(UNSUPPORTED_FORMAT);
  }
  return { rawData: data, type, rawContent: text };
};

export const readImportText = (value) => {
  const text = value.trim();
  return HTTP_URL.test(text) ? readImportUrl(text) : readRawText(text);
};

export const describeImportText = (text) => {
  if (!HTTP_URL.test(text)) {
    return { text: 'Raw text · Bruno detects the format' };
  }
  if (/\.zip(\?.*)?$/i.test(text)) {
    return { isWarning: true, text: 'Bruno collection (.zip) from a URL · not supported yet. Download it and drop it here.' };
  }
  if (/\.ya?ml(\?.*)?$/i.test(text)) {
    return { text: 'YAML from a URL · a Bruno collection is unpacked, an OpenAPI spec is converted' };
  }
  if (/\.json(\?.*)?$/i.test(text)) {
    return { text: 'JSON from a URL · Bruno detects Postman, Insomnia or OpenAPI' };
  }
  return { text: 'URL · Bruno fetches it and detects the format' };
};
