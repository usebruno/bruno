const path = require('path');
const timer = require('node:timers/promises');
const { _electron: electron } = require('playwright');

const electronAppPath = path.join(__dirname, '../packages/bruno-electron');

(async () => {
  const browser = await electron.launch({ args: [electronAppPath] });
  const context = await browser.context();
  await context.route('**/*', (route) => route.continue());

  while (true) {
    if(browser.windows().length) break;
    await timer.setTimeout(200);
  }
  await browser.windows()[0].pause();
})();
