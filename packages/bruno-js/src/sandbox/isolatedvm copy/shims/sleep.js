const ivm = require('isolated-vm');
const addSleepShimToContext = (context, console) => {
  context.evalClosureSync(
    `
      global.sleep = (...args) => $0.applySyncPromise(undefined, args?.map(arg=>JSON.stringify(arg)));
  `,
    [
      async (...argStrings) => {
        await new Promise((resolve) => {
          const timer = Number(argStrings?.[0]);
          if (!Number.isInteger(timer) || timer < 0) {
            resolve();
          }
          setTimeout(() => {
            resolve();
          }, timer);
        });
        return new ivm.ExternalCopy('done').copyInto({ release: true });
      }
    ],
    { arguments: { reference: true } }
  );

  context.evalSync(`
    global.setTimeout = async (fn, timer) => {
      await sleep(timer);
      await fn.apply();
    }
  `);
};

module.exports = addSleepShimToContext;
