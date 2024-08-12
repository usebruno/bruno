const ivm = require('isolated-vm');
const addBruShimToContext = require('./shims/bru');
const addBrunoRequestShimToContext = require('./shims/bruno-request');
const addConsoleShimToContext = require('./shims/console');
const addBrunoResponseShimToContext = require('./shims/bruno-response');
const addTestShimToContext = require('./shims/test');
const addLibraryShimsToContext = require('./shims/lib');

// execute `npm run build:isolated-vm:inbuilt-modules` if the below file doesn't exist
const getBundledCode = require('../../bundle-browser-rollup');
const addSleepShimToContext = require('./shims/sleep');

const toNumber = (value) => {
  const num = Number(value);
  return Number.isInteger(num) ? parseInt(value, 10) : parseFloat(value);
};

const executeInIsolatedVMStrict = ({ script: externalScript, context: externalContext, scriptType = 'script' }) => {
  if (!isNaN(Number(externalScript))) {
    return Number(externalScript);
  }
  let result;
  const isolate = new ivm.Isolate();
  try {
    const context = isolate.createContextSync();
    context.global.setSync('global', context.global.derefInto());

    const { bru, req, res } = externalContext;

    context.evalSync(`
      let bru = {};
      let req = {};
      let res = {};
    `);

    bru && addBruShimToContext(context, bru);
    req && addBrunoRequestShimToContext(context, req);
    res && addBrunoResponseShimToContext(context, res);

    context.global.setSync('setResult', function (arg) {
      result = arg;
    });

    const templateLiteralText = `
      let value = \`${externalScript}\`;
      setResult(value);
    `;

    const jsExpressionText = `
      let value = ${externalScript};
      setResult(value);
    `;

    let scriptText = scriptType === 'template-literal' ? templateLiteralText : jsExpressionText;

    const script = isolate.compileScriptSync(scriptText);
    script.runSync(context);
    return result;
  } catch (error) {
    console.error('Error executing the script!', error);
  }
  isolate.dispose();
};

const executeInIsolatedVMAsync = async ({
  script: externalScript,
  context: externalContext,
  modules = {},
  scriptType = 'script'
}) => {
  if (!isNaN(Number(externalScript))) {
    return toNumber(externalScript);
  }
  let result;
  const isolate = new ivm.Isolate();
  try {
    const context = await isolate.createContext();
    await context.global.set('global', context.global.derefInto());

    context.evalSync(`
      let bru = {};
      let req = {};
      let res = {};
      let console = {};
      global.requireObject = {};
    `);

    context.global.setSync('log', function (...args) {
      console.debug(...args);
    });

    try {
      const bundledCode = getBundledCode?.toString() || '';
      await context.eval(`(${bundledCode})()`);
    } catch (err) {
      console.debug('Error bundling libraries', err);
    }

    const { bru, req, res, test, __brunoTestResults, console: consoleFn } = externalContext;

    bru && addBruShimToContext(context, bru);
    req && addBrunoRequestShimToContext(context, req);
    res && addBrunoResponseShimToContext(context, res);
    consoleFn && addConsoleShimToContext(context, consoleFn);
    addSleepShimToContext(context);

    await context.eval(
      `
        global.require = (module) => {
            return global.requireObject[module];
        }
      `
    );

    await addLibraryShimsToContext(context);

    test && __brunoTestResults && (await addTestShimToContext(context, __brunoTestResults));

    context.global.setSync('setResult', function (arg) {
      result = arg;
    });

    const jsScriptText = `
      new Promise(async (resolve, reject) => {
        // modify the setTimeout function with the shim to work-around the callback-function clone issues
        setTimeout = global.setTimeout;
        console?.debug && console.debug('isolated-vm:execution-start:');
        try {
          ${externalScript}
        } catch (error) {
          console?.debug && console.debug('isolated-vm:execution-end:with-error', error?.message);
        }
        console?.debug && console.debug('isolated-vm:execution-end:');
        resolve();
      });
    `;

    const templateLiteralText = `
      let value = \`${externalScript}\`;
      setResult(value);
    `;

    const jsExpressionText = `
      let value = ${externalScript};
      setResult(value);
    `;

    let scriptText =
      scriptType === 'template-literal'
        ? templateLiteralText
        : scriptType === 'expression'
        ? jsExpressionText
        : jsScriptText;

    const script = await isolate.compileScript(scriptText);
    await script.run(context);
    return result;
  } catch (error) {
    console.error('Error executing the script!', error);
  }
  isolate.dispose();
};

module.exports = {
  executeInIsolatedVMStrict,
  executeInIsolatedVMAsync
};
