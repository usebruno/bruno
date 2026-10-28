const path = require('path');
const { _electron: electron } = require('playwright');

const electronAppPath = path.join(__dirname, '../packages/bruno-electron');
const electronExecutablePath = require('./electron-executable-path.js');

exports.startApp = async () => {
  const app = await electron.launch({
    executablePath: electronExecutablePath,
    args: [electronAppPath]
  });
  const context = await app.context();

  app.process().stdout.on('data', (data) => {
    process.stdout.write(data.toString().replace(/^(?=.)/gm, '[Electron] |'));
  });
  app.process().stderr.on('data', (error) => {
    process.stderr.write(error.toString().replace(/^(?=.)/gm, '[Electron] |'));
  });
  return { app, context };
};
