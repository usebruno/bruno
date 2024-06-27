const ivm = require('isolated-vm');
const addBruShimToContext = require('./shims/bru');
const addBrunoRequestShimToContext = require('./shims/brunoRequest');
const addConsoleShimToContext = require('./shims/console');
const addBrunoResponseShimToContext = require('./shims/brunoResponse');
const bundleLibraries = require('./utils/bundleLibraries');
const addTestShimToContext = require('./shims/test');
const fs = require('fs');
const addLibraryShimsToContext = require('./shims/lib');

const toNumber = (value) => {
  const num = Number(value);
  return Number.isInteger(num) ? parseInt(value, 10) : parseFloat(value);
};

class IsolatedVMStrict {
  constructor() {
    this.result = null;
    this.init();
  }

  init() {
    this.isolate = new ivm.Isolate();
    this.context = this.isolate.createContextSync();
    this.context.global.setSync('global', this.context.global.derefInto());
    this.context.evalSync(`
      let bru = {};
      let req = {};
      let res = {};
    `);
    this.context.global.setSync('setResult', (arg) => {
      this.result = arg;
    });
  }

  dispose() {
    this.isolate.dispose();
  }

  reset() {
    this.context.evalSync(`
      bru = {};
      req = {};
      res = {};
    `);
  }

  execute({ script: externalScript, context: externalContext, scriptType = 'script' }) {
    if (!isNaN(Number(externalScript))) {
      return toNumber(externalScript);
    }
    try {
      const { bru, req, res } = externalContext;

      bru && addBruShimToContext(this.context, bru);
      req && addBrunoRequestShimToContext(this.context, req);
      res && addBrunoResponseShimToContext(this.context, res);

      const templateLiteralText = `
        global.value = \`${externalScript}\`;
        setResult(global.value);
      `;

      const jsExpressionText = `
        global.value = ${externalScript};
        setResult(global.value);
      `;

      let scriptText = scriptType === 'template-literal' ? templateLiteralText : jsExpressionText;

      const script = this.isolate.compileScriptSync(scriptText);
      script.runSync(this.context);
      this.reset();
      return this.result;
    } catch (error) {
      console.error('Error executing the script!', error);
    }
  }
}

const isolatedVMStrictInstance = new IsolatedVMStrict();

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

class IsolatedVMAsync {
  constructor() {
    this.result;
    this.initPromise = this.init();
  }

  async init() {
    this.isolate = new ivm.Isolate();
    this.context = this.isolate.createContextSync();
    this.context.global.setSync('global', this.context.global.derefInto());

    this.context.evalSync(`
      let bru = {};
      let req = {};
      let res = {};
      let console = {};
      global.requireObject = {};
      global.require = (module) => {
        return global.requireObject[module];
      }
    `);

    this.bundledCode = await bundleLibraries();
    await this.context.eval(this.bundledCode);

    await addLibraryShimsToContext(this.context);

    this.context.global.setSync('setResult', (arg) => {
      this.result = arg;
    });
  }

  dispose() {
    this.isolate.dispose();
  }

  reset() {
    this.context.evalSync(`
      bru = {};
      req = {};
      res = {};
      console = {};
    `);
  }

  async execute({ script: externalScript, context: externalContext, scriptType = 'script' }) {
    await this.initPromise;
    if (!isNaN(Number(externalScript))) {
      return toNumber(externalScript);
    }
    let result;
    try {
      const { bru, req, res, test, __brunoTestResults, console: consoleFn } = externalContext;

      bru && addBruShimToContext(this.context, bru);
      req && addBrunoRequestShimToContext(this.context, req);
      res && addBrunoResponseShimToContext(this.context, res);
      consoleFn && addConsoleShimToContext(this.context, consoleFn);

      test && __brunoTestResults && (await addTestShimToContext(this.context, __brunoTestResults));

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
        global.value = \`${externalScript}\`;
        setResult(global.value);
      `;
      const jsExpressionText = `
        global.value = ${externalScript};
        setResult(global.value);
      `;
      let scriptText =
        scriptType === 'template-literal'
          ? templateLiteralText
          : scriptType === 'expression'
          ? jsExpressionText
          : jsScriptText;
      const script = await this.isolate.compileScript(scriptText);
      await script.run(this.context);
      this.reset();
      return this.result;
    } catch (error) {
      console.error('Error executing the script!', error);
    }
  }
}

const isolatedVMAsyncInstance = new IsolatedVMAsync();

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

    const bundledCode = await bundleLibraries();
    await context.eval(bundledCode);

    const { bru, req, res, test, __brunoTestResults, console: consoleFn } = externalContext;

    bru && addBruShimToContext(context, bru);
    req && addBrunoRequestShimToContext(context, req);
    res && addBrunoResponseShimToContext(context, res);
    consoleFn && addConsoleShimToContext(context, consoleFn);

    await context.eval(
      `
        global.require = (module) => {
            return global.requireObject[module];
        }
      `
    );

    test && __brunoTestResults && (await addTestShimToContext(context, __brunoTestResults));

    context.global.setSync('setResult', function (arg) {
      result = arg;
    });

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
  isolatedVMStrictInstance,
  executeInIsolatedVMAsync,
  isolatedVMAsyncInstance
};
