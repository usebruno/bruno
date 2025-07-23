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

    it('should not include variables with persist: false in persistentEnvVariables', async () => {
      const script = `
        bru.setEnvVar('persisted', 'val', {persist: true});
        bru.setEnvVar('notPersisted', 'val2', {persist: false});
        bru.setEnvVar('anotherPersisted', 'val3', {persist: true});
      `;
      const runtime = new ScriptRuntime({ runtime: 'vm2' });
      const result = await runtime.runRequestScript(script, {}, {}, {}, '.', null, process.env);

      expect(result.persistentEnvVariables).toEqual({ 
        persisted: 'val',
        anotherPersisted: 'val3'
      });
      expect(result.persistentEnvVariables.notPersisted).toBeUndefined();
    });

    it('should remove previously persisted variables when set with persist: false', async () => {
      const script = `
        bru.setEnvVar('username', 'john', {persist: true});
        bru.setEnvVar('username', 'tomato', {persist: false});
      `;
      const runtime = new ScriptRuntime({ runtime: 'vm2' });
      const result = await runtime.runRequestScript(script, {}, {}, {}, '.', null, process.env);

      expect(result.persistentEnvVariables).toEqual({});
      expect(result.persistentEnvVariables.username).toBeUndefined();
    });

    it('should throw error when trying to persist non-string values', async () => {
      const script = `
        bru.setEnvVar('number', 42, {persist: true});
      `;
      const runtime = new ScriptRuntime({ runtime: 'vm2' });
      
      await expect(runtime.runRequestScript(script, {}, {}, {}, '.', null, process.env))
        .rejects.toThrow('Persistent environment variables must be strings. Received number for key "number".');
    });

    it('should throw error when trying to persist boolean values', async () => {
      const script = `
        bru.setEnvVar('isActive', true, {persist: true});
      `;
      const runtime = new ScriptRuntime({ runtime: 'vm2' });
      
      await expect(runtime.runRequestScript(script, {}, {}, {}, '.', null, process.env))
        .rejects.toThrow('Persistent environment variables must be strings. Received boolean for key "isActive".');
    });

    it('should throw error when trying to persist object values', async () => {
      const script = `
        bru.setEnvVar('config', {port: 3000}, {persist: true});
      `;
      const runtime = new ScriptRuntime({ runtime: 'vm2' });
      
      await expect(runtime.runRequestScript(script, {}, {}, {}, '.', null, process.env))
        .rejects.toThrow('Persistent environment variables must be strings. Received object for key "config".');
    });

    it('should throw error when trying to persist array values', async () => {
      const script = `
        bru.setEnvVar('items', ['item1', 'item2'], {persist: true});
      `;
      const runtime = new ScriptRuntime({ runtime: 'vm2' });
      
      await expect(runtime.runRequestScript(script, {}, {}, {}, '.', null, process.env))
        .rejects.toThrow('Persistent environment variables must be strings. Received object for key "items".');
    });

    it('should allow non-string values when persist is false', async () => {
      const script = `
        bru.setEnvVar('number', 42);
        bru.setEnvVar('boolean', true);
        bru.setEnvVar('object', {key: 'value'});
        bru.setEnvVar('array', [1, 2, 3]);
      `;
      const runtime = new ScriptRuntime({ runtime: 'vm2' });
      const result = await runtime.runRequestScript(script, {}, {}, {}, '.', null, process.env);

      expect(result.persistentEnvVariables).toEqual({});
      expect(result.envVariables.number).toBe(42);
      expect(result.envVariables.boolean).toBe(true);
      expect(result.envVariables.object).toEqual({key: 'value'});
      expect(result.envVariables.array).toEqual([1, 2, 3]);
    });
  });
});
