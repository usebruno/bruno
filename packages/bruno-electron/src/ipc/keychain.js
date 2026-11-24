const { ipcMain } = require('electron');
const { listGenericPasswordKeychains } = require('../utils/macos-keychain');
const { refreshKeychainUserExpression } = require('../utils/collection');

const registerKeychainIpc = () => {
  ipcMain.handle('renderer:list-keychain-passwords', async () => listGenericPasswordKeychains());
  ipcMain.handle('renderer:refresh-keychain-expression', async (_event, expression) => {
    await refreshKeychainUserExpression(expression);
    return { success: true };
  });
};

module.exports = registerKeychainIpc;
