const { describe, it, expect } = require('@jest/globals');
const TestRuntime = require('../src/runtime/test-runtime');
const ScriptRuntime = require('../src/runtime/script-runtime');
const AssertRuntime = require('../src/runtime/assert-runtime');
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

      const runtime = new TestRuntime({ runtime: 'nodevm' });
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

      const runtime = new TestRuntime({ runtime: 'nodevm' });
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

        const runtime = new ScriptRuntime({ runtime: 'nodevm' });
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

        const runtime = new ScriptRuntime({ runtime: 'nodevm' });
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

  describe('persistent environment variables validation', () => {
    it('should throw error when trying to persist non-string values', async () => {
      const script = `bru.setEnvVar('number', 42, {persist: true});`;
      const runtime = new ScriptRuntime({ runtime: 'nodevm' });

      await expect(runtime.runRequestScript(script, {}, {}, {}, '.', null, process.env))
        .rejects.toThrow('Persistent environment variables must be strings. Received number for key "number".');
    });

    it('should throw error when trying to persist boolean values', async () => {
      const script = `bru.setEnvVar('isActive', true, {persist: true});`;
      const runtime = new ScriptRuntime({ runtime: 'nodevm' });

      await expect(runtime.runRequestScript(script, {}, {}, {}, '.', null, process.env))
        .rejects.toThrow('Persistent environment variables must be strings. Received boolean for key "isActive".');
    });

    it('should throw error when trying to persist object values', async () => {
      const script = `bru.setEnvVar('config', {port: 3000}, {persist: true});`;
      const runtime = new ScriptRuntime({ runtime: 'nodevm' });

      await expect(runtime.runRequestScript(script, {}, {}, {}, '.', null, process.env))
        .rejects.toThrow('Persistent environment variables must be strings. Received object for key "config".');
    });

    it('should throw error when trying to persist array values', async () => {
      const script = `bru.setEnvVar('items', ['item1', 'item2'], {persist: true});`;
      const runtime = new ScriptRuntime({ runtime: 'nodevm' });

      await expect(runtime.runRequestScript(script, {}, {}, {}, '.', null, process.env))
        .rejects.toThrow('Persistent environment variables must be strings. Received object for key "items".');
    });

    it('should allow string values when persist is true', async () => {
      const script = `bru.setEnvVar('api_key', 'abc123', {persist: true});`;
      const runtime = new ScriptRuntime({ runtime: 'nodevm' });

      const result = await runtime.runRequestScript(script, {}, {}, {}, '.', null, process.env);

      expect(result.envVariables.api_key).toBe('abc123');
    });

    it('should allow non-string values when persist is false', async () => {
      const script = `
        bru.setEnvVar('number', 42, {persist: false});
        bru.setEnvVar('boolean', true, {persist: false});
        bru.setEnvVar('object', {key: 'value'}, {persist: false});
        bru.setEnvVar('array', [1, 2, 3], {persist: false});
      `;
      const runtime = new ScriptRuntime({ runtime: 'nodevm' });

      const result = await runtime.runRequestScript(script, {}, {}, {}, '.', null, process.env);

      expect(result.envVariables.number).toBe(42);
      expect(result.envVariables.boolean).toBe(true);
      expect(result.envVariables.object).toEqual({ key: 'value' });
      expect(result.envVariables.array).toEqual([1, 2, 3]);
    });

    it('should allow non-string values when persist is not specified', async () => {
      const script = `bru.setEnvVar('number', 42);`;
      const runtime = new ScriptRuntime({ runtime: 'nodevm' });

      const result = await runtime.runRequestScript(script, {}, {}, {}, '.', null, process.env);

      expect(result.envVariables.number).toBe(42);
    });
  });

  describe('bru.setVar random variable', () => {
    it('should be able to set random variables as values', async () => {
      const script = `bru.setVar('title', '{{$randomFirstName}}')`;

      const runtime = new ScriptRuntime({ runtime: 'nodevm' });

      const result = await runtime.runRequestScript(script, {}, {}, {}, '.', null, process.env);

      expect(result.runtimeVariables.title).toBe('{{$randomFirstName}}');
    });
  });

  describe('assert-runtime', () => {
    const baseRequest = {
      method: 'GET',
      url: 'http://localhost:3000/',
      headers: {},
      data: undefined
    };

    const makeResponse = (data) => ({
      status: 200,
      statusText: 'OK',
      data,
      headers: {}
    });

    const runAssertions = (assertions, response, runtime = 'nodevm') => {
      const assertRuntime = new AssertRuntime({ runtime });
      return assertRuntime.runAssertions(assertions, { ...baseRequest }, response, {}, {}, process.env);
    };

    describe('isJson', () => {
      it('should pass for a plain object', () => {
        const results = runAssertions(
          [{ name: 'res.body', value: 'isJson', enabled: true }],
          makeResponse({ id: 1, name: 'test' })
        );
        expect(results[0].status).toBe('pass');
      });

      it('should pass for a nested object', () => {
        const results = runAssertions(
          [{ name: 'res.body', value: 'isJson', enabled: true }],
          makeResponse({ user: { id: 1, tags: ['a', 'b'] } })
        );
        expect(results[0].status).toBe('pass');
      });

      it('should pass for objects from a different realm (e.g. after res.setBody in node-vm)', async () => {
        const response = makeResponse({ id: 1, name: 'original' });

        // res.setBody() inside node-vm creates a cross-realm object whose
        // constructor is the VM's Object, not the host's Object
        const scriptRuntime = new ScriptRuntime({ runtime: 'nodevm' });
        await scriptRuntime.runResponseScript(
          `res.setBody({ id: 2, name: 'updated' });`,
          { ...baseRequest },
          response,
          {}, {}, '.', null, process.env
        );

        const results = runAssertions(
          [{ name: 'res.body', value: 'isJson', enabled: true }],
          response
        );
        expect(results[0].status).toBe('pass');
      });

      it('should fail for an array', () => {
        const results = runAssertions(
          [{ name: 'res.body', value: 'isJson', enabled: true }],
          makeResponse([1, 2, 3])
        );
        expect(results[0].status).toBe('fail');
      });

      it('should fail for a string', () => {
        const results = runAssertions(
          [{ name: 'res.body', value: 'isJson', enabled: true }],
          makeResponse('hello')
        );
        expect(results[0].status).toBe('fail');
      });

      it('should fail for null', () => {
        const results = runAssertions(
          [{ name: 'res.body', value: 'isJson', enabled: true }],
          makeResponse(null)
        );
        expect(results[0].status).toBe('fail');
      });
    });
  });
});
