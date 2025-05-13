const path = require('path');
const { _electron: electron } = require('playwright');

const electronAppPath = path.join(__dirname, '../packages/bruno-electron');

exports.startApp = async () => {
  const app = await electron.launch({ args: [electronAppPath] });
  const context = await app.context();

  app.process().stdout.on('data', (data) => console.log(data.toString()));
  app.process().stderr.on('data', (error) => console.error(error.toString()));
  return { app, context };
};
