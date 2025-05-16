const path = require('path');
const { startApp } = require('./electron.ts');

async function main() {
  const { app, context } = await startApp();
  let outputFile = process.argv[2]?.trim();
  if (outputFile && !/\.(ts|js)$/.test(outputFile)) {
    outputFile = path.join(__dirname, '../e2e-tests/', outputFile + '.spec.ts');
  }
  await context._enableRecorder({ language: 'playwright-test', mode: 'recording', outputFile });
}

main();
