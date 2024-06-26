const ivm = require('isolated-vm');
const addBruShimToContext = require('./shims/bru');
const addBrunoRequestShimToContext = require('./shims/brunoRequest');
const addConsoleShimToContext = require('./shims/console');
const addBrunoResponseShimToContext = require('./shims/brunoResponse');
const bundleLibraries = require('./utils/bundleLibraries');
const addTestShimToContext = require('./shims/test');
const fs = require('fs');
const addLibraryShimsToContext = require('./shims/lib');

const executeInIsolatedVM = ({
  script: externalScript,
  context: externalContext,
  modules = {},
  scriptType = 'script'
}) => {
  if (!isNaN(Number(externalScript))) {
    return Number(externalScript);
  }
  const isolate = new ivm.Isolate();
  try {
    const context = isolate.createContextSync();
    context.global.setSync('global', context.global.derefInto());

    const { bru, req, res, test, __brunoTestResults, expect, assert, console: consoleFn, ...rest } = externalContext;

    context.evalSync(`
      let bru = {};
      let req = {};
      let res = {};
      let console = {};
    `);

    bru && addBruShimToContext(context, bru);
    req && addBrunoRequestShimToContext(context, req);
    res && addBrunoResponseShimToContext(context, res);
    consoleFn && addConsoleShimToContext(context, consoleFn);

    const jsScriptText = `
      (async()=>{
          console?.info && console.info('isolated-vm:execution-start:');
          try {
              ${externalScript}
          }
          catch(error) {
            console?.info && console.info('isolated-vm:execution-end:with-error', error?.message);
          }
          console?.info && console.info('isolated-vm:execution-end:');
      })();
    `;

    const templateLiteralText = `
      let value = \`${externalScript}\`;
      value;
    `;

    const jsExpressionText = `
      let value = ${externalScript};
      value;
    `;

    let scriptText =
      scriptType === 'template-literal'
        ? templateLiteralText
        : scriptType === 'expression'
        ? jsExpressionText
        : jsScriptText;

    const script = isolate.compileScriptSync(scriptText);
    const result = script.runSync(context);
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
    return Number(externalScript);
  }
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

    const bundledCode = await bundleLibraries();
    await context.eval(bundledCode);

    const { bru, req, res, test, __brunoTestResults, expect, assert, console: consoleFn, ...rest } = externalContext;

    bru && addBruShimToContext(context, bru);
    req && addBrunoRequestShimToContext(context, req);
    res && addBrunoResponseShimToContext(context, res);
    consoleFn && addConsoleShimToContext(context, consoleFn);
    await addLibraryShimsToContext(context);

    await context.eval(
      `
        global.require = (module) => {
            return global.requireObject[module];
        }
      `
    );

    test && (await addTestShimToContext(context, __brunoTestResults));

    const jsScriptText = `
      new Promise(async (resolve, reject) => {
        console?.info && console.info('isolated-vm:execution-start:');
        try {
          ${externalScript}
        } catch (error) {
          console?.info && console.info('isolated-vm:execution-end:with-error', error?.message);
        }
        console?.info && console.info('isolated-vm:execution-end:');
        resolve();
      });
    `;

    const templateLiteralText = `
      let value = \`${externalScript}\`;
      value;
    `;

    const jsExpressionText = `
      let value = ${externalScript};
      value;
    `;

    let scriptText =
      scriptType === 'template-literal'
        ? templateLiteralText
        : scriptType === 'expression'
        ? jsExpressionText
        : jsScriptText;

    const script = await isolate.compileScript(scriptText);
    const result = await script.run(context);
    return result;
  } catch (error) {
    console.error('Error executing the script!', error);
  }
  isolate.dispose();
};

module.exports = {
  executeInIsolatedVM,
  executeInIsolatedVMAsync
};
