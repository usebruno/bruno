const path = require('path');

let lastResponseSaveDirectory;

const getResponseSaveDefaultPath = (requestPathname, fileName) => {
  const defaultDirectory = lastResponseSaveDirectory || path.dirname(requestPathname);
  return path.join(defaultDirectory, fileName);
};

const rememberResponseSavePath = (filePath) => {
  if (!filePath) {
    return;
  }

  lastResponseSaveDirectory = path.dirname(filePath);
};

const resetResponseSaveDirectory = () => {
  lastResponseSaveDirectory = undefined;
};

module.exports = {
  getResponseSaveDefaultPath,
  rememberResponseSavePath,
  resetResponseSaveDirectory
};
