const fs = require('node:fs/promises');
const path = require('node:path');
const { readFileStart } = require('./read-file-start');
const { isRealFile } = require('./entry-kind');

const SNIFF_BYTES = 64 * 1024;

const detectJsonFormat = (start) => {
  if (/"(?:openapi|swagger)"\s*:\s*"\d/.test(start)) {
    return 'openapi';
  }
  if (/"_type"\s*:\s*"export"|"__export_format"|"type"\s*:\s*"collection\.insomnia\.rest\/5/.test(start)) {
    return 'insomnia';
  }
  if (/_postman_id|schema\.getpostman\.com/.test(start)) {
    return 'postman';
  }
  return null;
};

const detectYamlFormat = (fileStart) => {
  const start = fileStart.replace(/^\uFEFF/, '');
  if (/^(?:openapi|swagger)[ \t]*:/m.test(start)) {
    return 'openapi';
  }
  if (/^_type[ \t]*:[ \t]*["']?export|^__export_format[ \t]*:|^type[ \t]*:[ \t]*["']?collection\.insomnia\.rest\/5/m.test(start)) {
    return 'insomnia';
  }
  return null;
};

const detectFormat = async (filePath, name) => {
  const lowerName = name.toLowerCase();
  if (lowerName.endsWith('.zip')) {
    return 'zip';
  }
  if (lowerName.endsWith('.postman_collection.json')) {
    return 'postman';
  }
  if (lowerName.endsWith('.json')) {
    return detectJsonFormat(await readFileStart(filePath, SNIFF_BYTES));
  }
  if (lowerName.endsWith('.yaml') || lowerName.endsWith('.yml')) {
    return detectYamlFormat(await readFileStart(filePath, SNIFF_BYTES));
  }
  return null;
};

const findImportableFiles = async (folderPath) => {
  let entries;
  try {
    entries = await fs.readdir(folderPath, { withFileTypes: true });
  } catch (error) {
    return [];
  }

  const importableFiles = [];
  for (const entry of entries) {
    const filePath = path.join(folderPath, entry.name);
    const format = await isRealFile(entry, filePath) && await detectFormat(filePath, entry.name);
    if (format) {
      importableFiles.push({ path: filePath, name: entry.name, format });
    }
  }
  return importableFiles;
};

module.exports = {
  findImportableFiles
};
