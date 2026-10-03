const fs = require('node:fs/promises');
const path = require('node:path');
const { parseRequest, stringifyRequest } = require('@usebruno/filestore');
const { writeFileUnique, validateName } = require('./filesystem');
const { REQUEST_TYPES } = require('./constants');

const importRequestFile = async (sourcePath, targetDirname, format, seq) => {
  if (path.extname(sourcePath).toLowerCase() !== '.bru') {
    throw new Error('Select a .bru request file');
  }

  const basename = path.basename(sourcePath, path.extname(sourcePath));
  if (!validateName(basename)) {
    throw new Error(`${basename} is not a valid filename`);
  }

  const content = await fs.readFile(sourcePath, 'utf8');
  const request = parseRequest(content, { format: 'bru' });
  if (!REQUEST_TYPES.includes(request.type) || !request.name || typeof request.request?.url !== 'string') {
    throw new Error('Select a Bruno request file, not a collection, folder or environment file');
  }

  request.seq = seq;
  return writeFileUnique(targetDirname, basename, format, stringifyRequest(request, { format }));
};

const exportRequestFile = async (filePath, request) => {
  if (!REQUEST_TYPES.includes(request.type)) {
    throw new Error('Only requests can be exported');
  }
  await fs.writeFile(filePath, stringifyRequest(request, { format: 'bru' }), 'utf8');
};

module.exports = { importRequestFile, exportRequestFile };
