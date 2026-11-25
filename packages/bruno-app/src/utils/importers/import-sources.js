import { callIpc } from 'utils/common/ipc';
import { isValidUrl } from 'utils/url/index';
import { isBrunoCollection } from './bruno-collection';
import { fetchAndValidateApiSpecFromUrl } from './common';
import { parseFileText } from './file-reader';
import { isInsomniaCollection } from './insomnia-collection';
import { isOpenCollection } from './opencollection';
import { isOpenApiSpec, isSwagger2Spec } from './openapi-collection';
import { isPostmanCollection } from './postman-collection';
import { isWSDLCollection } from './wsdl-collection';

const UNSUPPORTED_FORMAT = 'Unsupported collection format';
const ZIP_FILE = /\.zip$/i;
export const HTTP_URL = /^https?:\/\//i;

const isOpenCollectionExport = (data) => isOpenCollection(data) && data.bundled !== false;

const IMPORT_FORMATS = [
  ['openapi', isOpenApiSpec],
  ['wsdl', isWSDLCollection],
  ['postman', isPostmanCollection],
  ['insomnia', isInsomniaCollection],
  ['opencollection', isOpenCollectionExport],
  ['bruno', isBrunoCollection]
];

const detectImportFormat = (data) => IMPORT_FORMATS.find(([, matches]) => matches(data))?.[0];

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
      ? { file, data, type, filePath: window.ipcRenderer.getFilePath(file), rawContent: type === 'openapi' && !isSwagger2Spec(data) ? text : undefined }
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
    return readBrunoZip(window.ipcRenderer.getFilePath(zipFiles[0]), zipFiles[0].name);
  }
  if (files.length > 1) {
    return readSeveralFiles(files);
  }
  const [file] = files;
  return parseImportFile(await file.text(), file, window.ipcRenderer.getFilePath(file));
};

export const readImportableFile = async ({ path, name }) => {
  if (ZIP_FILE.test(name)) {
    return readBrunoZip(path, name);
  }
  const text = await callIpc('renderer:collection-search:read-importable-file', { path });
  return parseImportFile(text, { name, type: /\.json$/i.test(name) ? 'application/json' : '' }, path);
};

export const readImportUrl = async (value) => {
  const url = value.trim();
  if (!HTTP_URL.test(url) || !isValidUrl(url)) {
    throw new Error('Please enter a valid URL');
  }
  let fetched;
  try {
    fetched = await fetchAndValidateApiSpecFromUrl({ url });
  } catch (error) {
    throw new Error('URL import failed. Please check the URL and try again.');
  }
  const type = fetched.data !== null && typeof fetched.data === 'object' && detectImportFormat(fetched.data);
  if (!type) {
    throw new Error(UNSUPPORTED_FORMAT);
  }
  return { rawData: fetched.data, type, sourceUrl: url, rawContent: fetched.rawContent };
};
