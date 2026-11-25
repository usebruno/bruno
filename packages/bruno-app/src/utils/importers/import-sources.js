import jsyaml from 'js-yaml';
import { callIpc } from 'utils/common/ipc';
import { isValidUrl } from 'utils/url/index';
import { isBrunoCollection } from './bruno-collection';
import { fetchAndValidateApiSpecFromUrl, getFetchErrorMessage } from './common';
import { parseFileText } from './file-reader';
import { isInsomniaCollection } from './insomnia-collection';
import { isOpenCollection } from './opencollection';
import { isOpenApiSpec, isSwagger2Spec } from './openapi-collection';
import { isPostmanCollection } from './postman-collection';
import { isWSDLCollection } from './wsdl-collection';

const UNSUPPORTED_FORMAT = 'Unsupported collection format';
const WORKSPACE_FILE = 'This is a Bruno workspace file, not a collection. Choose its folder to open the workspace.';
const ZIP_FILE = /\.zip$/i;
export const HTTP_URL = /^https?:\/\//i;

const isWorkspaceFile = (data) => data?.info?.type === 'workspace';

const isOpenCollectionExport = (data) => isOpenCollection(data) && data.bundled !== false && !isWorkspaceFile(data);

const IMPORT_FORMATS = [
  ['openapi', isOpenApiSpec],
  ['wsdl', isWSDLCollection],
  ['postman', isPostmanCollection],
  ['insomnia', isInsomniaCollection],
  ['opencollection', isOpenCollectionExport],
  ['bruno', isBrunoCollection]
];

const detectImportFormat = (data) => IMPORT_FORMATS.find(([, matches]) => matches(data))?.[0];

const unsupportedFormatError = (data) => new Error(isWorkspaceFile(data) ? WORKSPACE_FILE : UNSUPPORTED_FORMAT);

const readImportableText = (filePath) => callIpc('renderer:collection-search:read-importable-file', { path: filePath });

const describeFileOnDisk = (name) => ({ name, type: /\.json$/i.test(name) ? 'application/json' : '' });

const readZip = async (zipFilePath, fileName) => {
  if (await callIpc('renderer:is-bruno-workspace-zip', zipFilePath)) {
    return { type: 'workspace-zip', file: { name: fileName, path: zipFilePath } };
  }
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
    throw unsupportedFormatError(data);
  }
  if (type === 'openapi') {
    return { rawData: data, type, filePath, rawContent: text };
  }
  return type === 'wsdl' ? { rawData: data, type, filePath } : { rawData: data, type };
};

const parseFileForBulkImport = (text, file, filePath) => {
  const data = parseFileText(text, file);
  const type = detectImportFormat(data);
  return type
    ? { file, data, type, filePath, rawContent: type === 'openapi' && !isSwagger2Spec(data) ? text : undefined }
    : null;
};

const readSeveralFiles = async (files, readFileForBulkImport) => {
  const results = await Promise.all(files.map(async (file) => {
    try {
      return await readFileForBulkImport(file);
    } catch (error) {
      console.warn(`Failed to process file ${file.name}:`, error);
      return null;
    }
  }));
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
    return readZip(window.ipcRenderer.getFilePath(zipFiles[0]), zipFiles[0].name);
  }
  if (files.length > 1) {
    return readSeveralFiles(files, async (file) => parseFileForBulkImport(await file.text(), file, window.ipcRenderer.getFilePath(file)));
  }
  const [file] = files;
  return parseImportFile(await file.text(), file, window.ipcRenderer.getFilePath(file));
};

const readImportableFile = async ({ path, name }) => {
  if (ZIP_FILE.test(name)) {
    return readZip(path, name);
  }
  return parseImportFile(await readImportableText(path), describeFileOnDisk(name), path);
};

export const readImportableFiles = (files) => {
  if (files.length === 1) {
    return readImportableFile(files[0]);
  }
  return readSeveralFiles(files, async ({ path, name }) => parseFileForBulkImport(await readImportableText(path), describeFileOnDisk(name), path));
};

const readImportUrl = async (url) => {
  if (!isValidUrl(url)) {
    throw new Error('Please enter a valid URL');
  }
  let fetched;
  try {
    fetched = await fetchAndValidateApiSpecFromUrl({ url });
  } catch (error) {
    throw new Error(getFetchErrorMessage(error, url));
  }
  const type = fetched.data !== null && typeof fetched.data === 'object' && detectImportFormat(fetched.data);
  if (!type) {
    throw unsupportedFormatError(fetched.data);
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
    throw unsupportedFormatError(data);
  }
  return { rawData: data, type };
};

export const readImportText = (value) => {
  const text = value.trim();
  return HTTP_URL.test(text) ? readImportUrl(text) : readRawText(text);
};
