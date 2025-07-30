const { describe, it, expect } = require('@jest/globals');
const TestRuntime = require('../src/runtime/test-runtime');
const ScriptRuntime = require('../src/runtime/script-runtime');
const Bru = require('../src/bru');
const VarsRuntime = require('../src/runtime/vars-runtime');

describe('runtime', () => {
  describe('test-runtime', () => {
    const baseRequest = {
      method: 'GET',
      url: 'http://localhost:3000/',
      headers: {},
      data: undefined
    };
    const baseResponse = {
      status: 200,
      statusText: 'OK',
      data: [
        {
          id: 1
        },
        {
          id: 2
        },
        {
          id: 3
        }
      ]
    };

    it('should wait async tests', async () => {
      const testFile = `
                await test('async test', ()=> {
                    return new Promise((resolve)=> {
                        setTimeout(()=> {resolve()},200)
                    })
                })
            `;

      const runtime = new TestRuntime({ runtime: 'vm2' });
      const result = await runtime.runTests(
        testFile,
        { ...baseRequest },
        { ...baseResponse },
        {},
        {},
        '.',
        null,
        process.env
      );
      expect(result.results.map((el) => ({ description: el.description, status: el.status }))).toEqual([
        { description: 'async test', status: 'pass' }
      ]);
    });

    it('should have ajv and ajv-formats dependencies available', async () => {
      const testFile = `
                const Ajv = require('ajv');
                const addFormats = require("ajv-formats");
                const ajv = new Ajv();
                addFormats(ajv);
                
                const schema = {
                  type: 'string',
                  format: 'date-time'
                };
                
                const validate = ajv.compile(schema)
                
                test('format valid', () => {
                  const valid = validate(new Date().toISOString())
                  expect(valid).to.be.true;
                })
            `;

      const runtime = new TestRuntime({ runtime: 'vm2' });
      const result = await runtime.runTests(
        testFile,
        { ...baseRequest },
        { ...baseResponse },
        {},
        {},
        '.',
        null,
        process.env
      );
      expect(result.results.map((el) => ({ description: el.description, status: el.status }))).toEqual([
        { description: 'format valid', status: 'pass' }
      ]);
    });
  });

  describe('script-runtime', () => {
    describe('run-request-script', () => {
      const baseRequest = {
        method: 'GET',
        url: 'http://localhost:3000/',
        headers: {},
        data: undefined
      };

      it('should have ajv and ajv-formats dependencies available', async () => {
        const script = `
                  const Ajv = require('ajv');
                  const addFormats = require("ajv-formats");
                  const ajv = new Ajv();
                  addFormats(ajv);
                  
                  const schema = {
                    type: 'string',
                    format: 'date-time'
                  };
                  
                  const validate = ajv.compile(schema)
                  
                  bru.setVar('validation', validate(new Date().toISOString()))
              `;

        const runtime = new ScriptRuntime({ runtime: 'vm2' });
        const result = await runtime.runRequestScript(script, { ...baseRequest }, {}, {}, '.', null, process.env);
        expect(result.runtimeVariables.validation).toBeTruthy();
      });
    });

    describe('run-response-script', () => {
      const baseRequest = {
        method: 'GET',
        url: 'http://localhost:3000/',
        headers: {},
        data: undefined
      };
      const baseResponse = {
        status: 200,
        statusText: 'OK',
        data: [
          {
            id: 1
          },
          {
            id: 2
          },
          {
            id: 3
          }
        ]
      };

      it('should have ajv and ajv-formats dependencies available', async () => {
        const script = `
                  const Ajv = require('ajv');
                  const addFormats = require("ajv-formats");
                  const ajv = new Ajv();
                  addFormats(ajv);
                  
                  const schema = {
                    type: 'string',
                    format: 'date-time'
                  };
                  
                  const validate = ajv.compile(schema)
                  
                  bru.setVar('validation', validate(new Date().toISOString()))
              `;

        const runtime = new ScriptRuntime({ runtime: 'vm2' });
        const result = await runtime.runResponseScript(
          script,
          { ...baseRequest },
          { ...baseResponse },
          {},
          {},
          '.',
          null,
          process.env
        );
        expect(result.runtimeVariables.validation).toBeTruthy();
      });
    });
  });

  describe('persistentEnvVariables integration', () => {
    it('ScriptRuntime: should expose persistentEnvVariables after runRequestScript', async () => {
      const script = `bru.setEnvVar('persisted', 'val', {persist: true})`;
      const runtime = new ScriptRuntime({ runtime: 'vm2' });
      const result = await runtime.runRequestScript(script, {}, {}, {}, '.', null, process.env);

      console.log('runRequestScript result', result.persistentEnvVariables);
      expect(result.persistentEnvVariables).toEqual({ persisted: 'val' });
    });

    it('ScriptRuntime: should expose persistentEnvVariables after runResponseScript', async () => {
      const script = `bru.setEnvVar('persistedRes', 'valRes', {persist: true})`;
      const runtime = new ScriptRuntime({ runtime: 'vm2' });
      const result = await runtime.runResponseScript(script, {}, {}, {}, {}, '.', null, process.env);

      console.log('runResponseScript result', result.persistentEnvVariables);
      expect(result.persistentEnvVariables).toEqual({ persistedRes: 'valRes' });
    });

    it('VarsRuntime: should expose persistentEnvVariables after runPostResponseVars', () => {
      const varsRuntime = new VarsRuntime();
      const postResponseVars = [
        { name: 'foo', value: `bru.setEnvVar('persistedRes', 'valRes', {persist: true})`, enabled: true, local: false }
      ];
      const baseRequest = {
        method: 'GET',
        url: 'http://localhost:3000/',
        headers: {},
        data: undefined
      };

      // Simulate the varsRuntime API
      const result = varsRuntime.runPostResponseVars(
        postResponseVars,
        baseRequest,
        {},
        {},
        {},
        '.',
        {},
      );

      expect(result.persistentEnvVariables).toEqual({ persistedRes: 'valRes' });
    });

    it('TestRuntime: should expose persistentEnvVariables after runTests', async () => {
      const testFile = `bru.setEnvVar('persistedTest', 'valTest', {persist: true})`;
      const runtime = new TestRuntime({ runtime: 'vm2' });
      const result = await runtime.runTests(
        testFile,
        {},
        {},
        {},
        {},
        '.',
        null,
        process.env
      );

      console.log('runTests result', result.persistentEnvVariables);
      expect(result.persistentEnvVariables).toEqual({ persistedTest: 'valTest' });
    });
  });
});
