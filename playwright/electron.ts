const path = require('path');
const { _electron: electron } = require('playwright');

const electronAppPath = path.join(__dirname, '../packages/bruno-electron');

exports.startApp = async () => {
  const app = await electron.launch({ 
    args: [electronAppPath, '--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--disable-gpu']
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
