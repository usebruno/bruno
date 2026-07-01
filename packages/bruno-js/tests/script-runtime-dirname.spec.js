const { describe, it, expect } = require('@jest/globals');
const path = require('node:path');

jest.mock('../src/sandbox/bundle-browser-rollup', () => () => '', { virtual: true });

const Bru = require('../src/bru');
const ScriptRuntime = require('../src/runtime/script-runtime');
const { executeQuickJsVmAsync, loader: quickJsLoader } = require('../src/sandbox/quickjs');

describe('script runtime CommonJS path globals', () => {
  const baseRequest = {
    method: 'GET',
    url: 'http://localhost:3000/',
    headers: {},
    data: undefined
  };

  const makeRequest = () => ({
    ...baseRequest,
    pathname: path.join('folder', 'request.bru')
  });

  const collectionPath = path.join(process.cwd(), 'dirname-collection');
  const script = `
    bru.setVar('dirname', __dirname);
    bru.setVar('filename', __filename);
  `;

  it('should expose __dirname and __filename for request scripts in node-vm', async () => {
    const runtime = new ScriptRuntime({ runtime: 'nodevm' });

    const result = await runtime.runRequestScript(script, makeRequest(), {}, {}, collectionPath, null, process.env);

    expect(result.runtimeVariables.dirname).toBe(path.join(collectionPath, 'folder'));
    expect(result.runtimeVariables.filename).toBe(path.join(collectionPath, 'folder', 'request.bru'));
  });

  it('should expose __dirname and __filename for request scripts in quickjs', async () => {
    await quickJsLoader();
    const runtimeVariables = {};
    const bru = new Bru({
      runtime: 'quickjs',
      envVariables: {},
      runtimeVariables,
      processEnvVars: process.env,
      collectionPath
    });

    await executeQuickJsVmAsync({
      script,
      context: { bru },
      collectionPath,
      scriptPath: makeRequest().pathname
    });

    expect(runtimeVariables.dirname).toBe(path.join(collectionPath, 'folder'));
    expect(runtimeVariables.filename).toBe(path.join(collectionPath, 'folder', 'request.bru'));
  });
});
