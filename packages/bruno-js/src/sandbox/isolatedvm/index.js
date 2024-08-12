const ivm = require('isolated-vm');
const addBruShimToContext = require('./shims/bru');
const addBrunoRequestShimToContext = require('./shims/bruno-request');
const addConsoleShimToContext = require('./shims/console');
const addBrunoResponseShimToContext = require('./shims/bruno-response');
const addTestShimToContext = require('./shims/test');
const addLibraryShimsToContext = require('./shims/lib');

// execute `npm run build:isolated-vm:inbuilt-modules` if the below file doesn't exist
const getBundledCode = require('../../bundle-browser-rollup');

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

    try {
      this.bundledCode = getBundledCode?.toString() || '';
      await this.context.eval(`(${this.bundledCode})()`);
    } catch (err) {
      console.debug('Error bundling libraries', err);
    }

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
