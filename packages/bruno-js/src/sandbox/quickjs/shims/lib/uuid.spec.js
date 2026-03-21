const { describe, it, expect, beforeAll, beforeEach, afterEach, afterAll } = require('@jest/globals');
const { newQuickJSWASMModule } = require('quickjs-emscripten');
const addUuidShimToContext = require('./uuid');
const { addRequireShimToContext } = require('../require');
const { createEvalHelper } = require('../../utils');

describe('uuid shim tests', () => {
  let vm, module, evalAndDump;

  beforeAll(async () => {
    module = await newQuickJSWASMModule();
  });

  beforeEach(async () => {
    vm = module.newContext();
    evalAndDump = createEvalHelper(vm);
    await addUuidShimToContext(vm);
    addRequireShimToContext(vm, { enableLocalModules: false });
  });

  afterEach(() => {
    if (vm) {
      try {
        vm.dispose();
      } catch (err) {
        // Ignore disposal errors
      }
      vm = null;
    }
  });

  afterAll(() => {
    if (module) {
      try {
        module.dispose();
      } catch (err) {
        // Ignore disposal errors
      }
      module = null;
    }
  });

  /**
   * Regex pattern for validating UUID format with specific version
   */
  function uuidPattern(version) {
    return new RegExp(`^[0-9a-f]{8}-[0-9a-f]{4}-${version}[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$`, 'i');
  }

  describe('uuid version functions', () => {
    const versionTests = [
      { fn: 'v1', version: 1 },
      { fn: 'v4', version: 4 },
      { fn: 'v6', version: 6, note: 'RFC 9562' },
      { fn: 'v7', version: 7, note: 'RFC 9562' }
    ];

    it.each(versionTests)('$fn should generate valid uuid and be accessible via require', ({ fn, version }) => {
      // Test direct access
      const directUuid = evalAndDump(`globalThis.uuid.${fn}()`);
      expect(directUuid).toMatch(uuidPattern(version));

      // Test require with destructuring
      const requireUuid = evalAndDump(`const { ${fn} } = require('uuid'); ${fn}()`);
      expect(requireUuid).toMatch(uuidPattern(version));
    });

    it('v7 should be accessible with alias pattern (v7: uuidv7) - issue #7333', () => {
      const uuid = evalAndDump(`
        const { v7: uuidv7 } = require('uuid');
        uuidv7();
      `);
      expect(uuid).toMatch(uuidPattern(7));
    });

    it('v7 should generate time-ordered uuids', () => {
      const [uuid1, uuid2] = evalAndDump(`
        const { v7 } = require('uuid');
        [v7(), v7()];
      `);
      expect(uuid1 <= uuid2).toBe(true);
    });
  });

  describe('name-based uuid functions (v3, v5)', () => {
    const DNS_NAMESPACE = '6ba7b810-9dad-11d1-80b4-00c04fd430c8';

    it.each([
      { fn: 'v3', version: 3 },
      { fn: 'v5', version: 5 }
    ])('$fn should generate valid uuid with namespace', ({ fn, version }) => {
      const uuid = evalAndDump(`
        const { ${fn} } = require('uuid');
        ${fn}('example.com', '${DNS_NAMESPACE}');
      `);
      expect(uuid).toMatch(uuidPattern(version));
    });
  });

  describe('conversion functions', () => {
    it('should convert between v1 and v6 using v1ToV6 and v6ToV1', () => {
      const [v1Uuid, v6FromV1, v6Uuid, v1FromV6] = evalAndDump(`
        const { v1, v6, v1ToV6, v6ToV1 } = require('uuid');
        const v1Uuid = v1();
        const v6Uuid = v6();
        [v1Uuid, v1ToV6(v1Uuid), v6Uuid, v6ToV1(v6Uuid)];
      `);

      expect(v1Uuid).toMatch(uuidPattern(1));
      expect(v6FromV1).toMatch(uuidPattern(6));
      expect(v6Uuid).toMatch(uuidPattern(6));
      expect(v1FromV6).toMatch(uuidPattern(1));
    });
  });

  describe('utility functions', () => {
    it('should validate uuids correctly', () => {
      const [isValid, isInvalid] = evalAndDump(`
        const { v4, validate } = require('uuid');
        [validate(v4()), validate('not-a-uuid')];
      `);
      expect(isValid).toBe(true);
      expect(isInvalid).toBe(false);
    });

    it('should detect uuid version correctly', () => {
      const [v4Version, v7Version] = evalAndDump(`
        const { v4, v7, version } = require('uuid');
        [version(v4()), version(v7())];
      `);
      expect(v4Version).toBe(4);
      expect(v7Version).toBe(7);
    });

    it('should parse and stringify uuid', () => {
      const [original, stringified, isObject, length] = evalAndDump(`
        const { v4, parse, stringify } = require('uuid');
        const original = v4();
        const parsed = parse(original);
        [original, stringify(parsed), typeof parsed === 'object', Object.keys(parsed).length];
      `);
      expect(original).toBe(stringified);
      expect(isObject).toBe(true);
      expect(length).toBe(16);
    });
  });

  describe('issue #7333 regression test', () => {
    it('should work with the exact pattern from the bug report', () => {
      const [typeOfFn, id1, id2] = evalAndDump(`
        const { v7: uuidv7 } = require('uuid');
        const id1 = uuidv7();
        const id2 = uuidv7();
        [typeof uuidv7, id1, id2];
      `);

      expect(typeOfFn).toBe('function');
      expect(id1).toMatch(uuidPattern(7));
      expect(id2).toMatch(uuidPattern(7));
      expect(id1).not.toBe(id2);
    });
  });
});
