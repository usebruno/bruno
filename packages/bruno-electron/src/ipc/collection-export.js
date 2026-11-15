const { dialog } = require('electron');
const { sanitizeName, writeFile } = require('../utils/filesystem');

const exportCollectionYaml = async (mainWindow, collectionName, content) => {
  if (typeof content !== 'string') {
    throw new Error('Export content must be a string');
  }

  const { filePath, canceled } = await dialog.showSaveDialog(mainWindow, {
    title: 'Export Collection as YAML',
    defaultPath: `${sanitizeName(collectionName)}.yml`,
    filters: [{ name: 'YAML Files', extensions: ['yml', 'yaml'] }]
  });

  if (canceled || !filePath) {
    return { success: false, canceled: true };
  }

  await writeFile(filePath, content);
  return { success: true, filePath };
};

module.exports = { exportCollectionYaml };
