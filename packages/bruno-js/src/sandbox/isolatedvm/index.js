const ivm = require('isolated-vm');
const addBruShimToContext = require('./shims/bru');
const addBrunoRequestShimToContext = require('./shims/brunoRequest');
const addConsoleShimToContext = require('./shims/console');
const addBrunoResponseShimToContext = require('./shims/brunoResponse');
const bundleLibraries = require('./utils/bundleLibraries');

const executeInIsolatedVM = async ({ script: externalScript, context: externalContext, modules = {} }) => {
  try {
    const isolate = new ivm.Isolate({ memoryLimit: 128 });
    const context = await isolate.createContext();
    await context.global.set('global', context.global.derefInto());

    // const bundledScript = await bundleLibraries(modules);
    // await context.eval(bundledScript);

    const { bru, req, res, console } = externalContext;

    context.evalSync(`
      let bru = {};
      let req = {};
      let res = {};
      let console = {};
    `);

    addBruShimToContext(context, bru);
    addBrunoRequestShimToContext(context, req);
    addBrunoResponseShimToContext(context, res);
    addConsoleShimToContext(context, console);

    const userScript = `
    (async()=>{
        console.debug('isolated-vm:execution-start:');
        ${externalScript}
        console.debug('isolated-vm:execution-end:');
    })();
  `;

    const script = await isolate.compileScript(userScript);
    await script.run(context);
  } catch (error) {
    console.debug('isolated-vm:execution-end:with-error');
    console.error('Error executing the script!', error);
  }
};

module.exports = executeInIsolatedVM;
