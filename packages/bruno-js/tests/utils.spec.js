const { describe, it, expect } = require('@jest/globals');
const {
  evaluateJsExpression,
  evaluateJsTemplateLiteral,
  internalExpressionCache: cache,
  createResponseParser,
  cleanJson,
  cleanCircularJson
} = require('../src/utils');

describe('utils', () => {
  describe('expression evaluation', () => {
    const context = {
      res: {
        data: { pets: ['bruno', 'max'] },
        context: 'testContext',
        __bruno__functionInnerContext: 0
      }
    };

    beforeEach(() => cache.clear());
    afterEach(() => cache.clear());

    it('should evaluate expression', () => {
      let result;

      result = evaluateJsExpression('res.data.pets', context);
      expect(result).toEqual(['bruno', 'max']);

      result = evaluateJsExpression('res.data.pets[0].toUpperCase()', context);
      expect(result).toEqual('BRUNO');
    });

    it('should cache expression', () => {
      expect(cache.size).toBe(0);
      evaluateJsExpression('res.data.pets', context);
      expect(cache.size).toBe(1);
    });

    it('should use cached expression', () => {
      const expr = 'res.data.pets';

      evaluateJsExpression(expr, context);

      const fn = cache.get(expr);
      expect(fn).toBeDefined();

      evaluateJsExpression(expr, context);

      // cache should not be overwritten
      expect(cache.get(expr)).toBe(fn);
    });

    it('should identify top level variables', () => {
      const expr = 'res.data.pets[0].toUpperCase()';
      evaluateJsExpression(expr, context);
      expect(cache.get(expr).toString()).toContain('let { res } = __bruno__functionInnerContext;');
    });

    it('should not duplicate variables', () => {
      const expr = 'res.data.pets[0] + res.data.pets[1]';
      evaluateJsExpression(expr, context);
      expect(cache.get(expr).toString()).toContain('let { res } = __bruno__functionInnerContext;');
    });

    it('should exclude js keywords like true false from vars', () => {
      const expr = 'res.data.pets.length > 0 ? true : false';
      evaluateJsExpression(expr, context);
      expect(cache.get(expr).toString()).toContain('let { res } = __bruno__functionInnerContext;');
    });

    it('should exclude numbers from vars', () => {
      const expr = 'res.data.pets.length + 10';
      evaluateJsExpression(expr, context);
      expect(cache.get(expr).toString()).toContain('let { res } = __bruno__functionInnerContext;');
    });

    it('should pick variables from complex expressions', () => {
      const expr = 'res.data.pets.map(pet => pet.length)';
      const result = evaluateJsExpression(expr, context);
      expect(result).toEqual([5, 3]);
      expect(cache.get(expr).toString()).toContain('let { res, pet } = __bruno__functionInnerContext;');
    });

    it('should be ok picking extra vars from strings', () => {
      const expr = '\'hello\' + \' \' + res.data.pets[0]';
      const result = evaluateJsExpression(expr, context);
      expect(result).toBe('hello bruno');
      // extra var hello is harmless
      expect(cache.get(expr).toString()).toContain('let { hello, res } = __bruno__functionInnerContext;');
    });

    it('should evaluate expressions referencing globals', () => {
      const startTime = new Date('2022-02-01').getTime();
      const currentTime = new Date('2022-02-02').getTime();

      jest.useFakeTimers({ now: currentTime });

      const expr = 'Math.max(Date.now(), startTime)';
      const result = evaluateJsExpression(expr, { startTime });

      expect(result).toBe(currentTime);

      expect(cache.get(expr).toString()).toContain('Math = Math ?? globalThis.Math;');
      expect(cache.get(expr).toString()).toContain('Date = Date ?? globalThis.Date;');
    });

    it('should use global overridden in context', () => {
      const startTime = new Date('2022-02-01').getTime();
      const currentTime = new Date('2022-02-02').getTime();

      jest.useFakeTimers({ now: currentTime });

      const context = {
        Date: { now: () => new Date('2022-01-31').getTime() },
        startTime
      };

      const expr = 'Math.max(Date.now(), startTime)';
      const result = evaluateJsExpression(expr, context);

      expect(result).toBe(startTime);
    });

    it('should allow "context" as a var name', () => {
      const expr = 'res["context"].toUpperCase()';
      evaluateJsExpression(expr, context);
      expect(cache.get(expr).toString()).toContain('let { res, context } = __bruno__functionInnerContext;');
    });

    it('should throw an error when we use "__bruno__functionInnerContext" as a var name', () => {
      const expr = 'res["__bruno__functionInnerContext"].toUpperCase()';
      expect(() => evaluateJsExpression(expr, context)).toThrow(SyntaxError);
      expect(() => evaluateJsExpression(expr, context)).toThrow(
        'Identifier \'__bruno__functionInnerContext\' has already been declared'
      );
    });
  });

  describe('response parser', () => {
    const res = createResponseParser({
      status: 200,
      data: {
        order: {
          items: [
            { id: 1, amount: 10 },
            { id: 2, amount: 20 }
          ]
        }
      }
    });

    it('should default to bruno query', () => {
      const value = res('..items[?].amount[0]', (i) => i.amount > 10);
      expect(value).toBe(20);
    });

    it('should allow json-query', () => {
      const value = res.jq('order.items[amount > 10].amount');
      expect(value).toBe(20);
    });
  });

  describe('cleanJson', () => {
    it('primitives should be kept as is', () => {
      const input = {
        number: 1,
        string: 'hello world',
        booleanFalse: false,
        booleanTrue: true,
        float: 2.1,
        floatDeep: 2.2222222
      };
      expect(cleanJson(input)).toEqual(input);
    });

    it('functions are lost', () => {
      const func = function (x, y) {
        return x + y;
      };

      const input = {
        func,
        number: 1
      };

      expect(cleanJson(input)).toEqual({
        number: 1
      });
    });

    it('dates are serialized', () => {
      const date = new Date();
      const str = date.toISOString();

      const input = {
        date
      };

      expect(cleanJson(input)).toEqual({
        date: str
      });
    });

    it('typed arrays should be kept as is', () => {
      const input = {
        Int8Array: Int8Array.from(Buffer.from('hello world').toString()),
        Uint8Array: Uint8Array.from(Buffer.from('hello world').toString()),
        Uint8ClampedArray: Uint8ClampedArray.from(Buffer.from('hello world').toString()),
        Int16Array: Int16Array.from(Buffer.from('hello world').toString()),
        Uint16Array: Uint16Array.from(Buffer.from('hello world').toString()),
        Int32Array: Int32Array.from(Buffer.from('hello world').toString()),
        Uint32Array: Uint32Array.from(Buffer.from('hello world').toString()),
        Float32Array: Float32Array.from(Buffer.from('hello world').toString()),
        Float64Array: Float64Array.from(Buffer.from('hello world').toString()),
        BigInt64Array: BigInt64Array.from(Buffer.from('123').toString()),
        BigUint64Array: BigUint64Array.from(Buffer.from('234').toString())
      };

      expect(cleanJson(input)).toEqual(input);
    });

    it('replaces circular references with [Circular Reference]', () => {
      const obj = { a: 1 };
      obj.self = obj;
      expect(cleanJson(obj)).toEqual({ a: 1, self: '[Circular Reference]' });
    });

    it('serializes Error instances with all own properties', () => {
      const err = new Error('oops');
      const out = cleanJson(err);
      expect(out).toMatchObject({ message: 'oops', name: 'Error' });
      expect(typeof out.stack).toBe('string');
    });

    it('serializes Error with extra own properties (code, cause)', () => {
      const err = new Error('failed');
      err.code = 'ERR_FAILED';
      err.cause = new Error('root cause');
      const out = cleanJson(err);
      expect(out.message).toBe('failed');
      expect(out.code).toBe('ERR_FAILED');
      expect(out.cause).toMatchObject({ message: 'root cause', name: 'Error' });
      expect(typeof out.cause.stack).toBe('string');
    });

    it('serializes Error subclasses', () => {
      const err = new TypeError('type oops');
      const out = cleanJson(err);
      expect(out).toMatchObject({ message: 'type oops', name: 'TypeError' });
      expect(typeof out.stack).toBe('string');
    });

    it('serializes duck-typed error-like objects (message + stack strings)', () => {
      const fake = { message: 'fake', stack: 'at line 1' };
      const out = cleanJson(fake);
      expect(out).toEqual(fake);
    });

    it('does not treat plain objects with non-string message/stack as errors', () => {
      const notError = { message: 123, stack: 'at line 1' };
      const out = cleanJson(notError);
      expect(out).toEqual(notError);
      const notError2 = { message: 'ok', stack: 456 };
      const out2 = cleanJson(notError2);
      expect(out2).toEqual(notError2);
    });

    it('serializes nested Error inside object', () => {
      const input = { err: new Error('nested'), id: 1 };
      const out = cleanJson(input);
      expect(out.id).toBe(1);
      expect(out.err).toMatchObject({ message: 'nested', name: 'Error' });
      expect(typeof out.err.stack).toBe('string');
    });

    it('handles circular ref and Error in same structure', () => {
      const err = new Error('cycle');
      const obj = { err, ref: null };
      obj.ref = obj;
      const out = cleanJson(obj);
      expect(out.err).toMatchObject({ message: 'cycle' });
      expect(out.ref).toBe('[Circular Reference]');
    });
  });

  describe('cleanCircularJson', () => {
    it('returns primitives and plain objects as-is', () => {
      expect(cleanCircularJson(1)).toBe(1);
      expect(cleanCircularJson('x')).toBe('x');
      expect(cleanCircularJson({ a: 1 })).toEqual({ a: 1 });
    });

    it('replaces circular references with [Circular Reference]', () => {
      const obj = { a: 1 };
      obj.self = obj;
      expect(cleanCircularJson(obj)).toEqual({ a: 1, self: '[Circular Reference]' });
    });

    it('handles deeply nested circular ref', () => {
      const obj = { level: 1, child: null };
      obj.child = { level: 2, back: obj };
      const out = cleanCircularJson(obj);
      expect(out.level).toBe(1);
      expect(out.child.level).toBe(2);
      expect(out.child.back).toBe('[Circular Reference]');
    });
  });

  describe('evaluateJsTemplateLiteral', () => {
    it('returns non-string or empty input as-is', () => {
      expect(evaluateJsTemplateLiteral(null)).toBe(null);
      expect(evaluateJsTemplateLiteral('')).toBe('');
      expect(evaluateJsTemplateLiteral(42)).toBe(42);
    });

    it('parses boolean and null literals', () => {
      expect(evaluateJsTemplateLiteral('true')).toBe(true);
      expect(evaluateJsTemplateLiteral('false')).toBe(false);
      expect(evaluateJsTemplateLiteral('null')).toBe(null);
      expect(evaluateJsTemplateLiteral('undefined')).toBe(undefined);
    });

    it('parses quoted strings', () => {
      expect(evaluateJsTemplateLiteral('"hello"')).toBe('hello');
      expect(evaluateJsTemplateLiteral('\'world\'')).toBe('world');
    });

    it('parses numbers', () => {
      expect(evaluateJsTemplateLiteral('42')).toBe(42);
      expect(evaluateJsTemplateLiteral('3.14')).toBe(3.14);
    });

    it('evaluates template literal with context', () => {
      const context = { res: { data: { name: 'Bruno' } } };
      expect(evaluateJsTemplateLiteral('${res.data.name}', context)).toBe('Bruno');
    });

    it('keeps large numbers as string (safe integer limit)', () => {
      const big = '9007199254740993';
      expect(evaluateJsTemplateLiteral(big)).toBe(big);
    });
  });
});
