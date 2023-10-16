const path = require('path');

const fileExistsWithCase = (newFilePath, oldFilePath) => {
  const newFileName = path.basename(newFilePath);
  const oldFileName = path.basename(oldFilePath);
  if (newFileName.toLowerCase() === oldFileName.toLowerCase()) {
    return false;
  }
  return fs.existsSync(newFilePath);
};

module.exports = { fileExistsWithCase };
