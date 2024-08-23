const { describe, it, expect } = require('@jest/globals');
const {
  evaluateJsExpression,
  internalExpressionCache: cache,
  createResponseParser,
  appendAwaitToTestFunc
} = require('../src/utils');

describe('utils', () => {
  describe('expression evaluation', () => {
    const context = {
      res: {
        data: { pets: ['bruno', 'max'] }
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
      expect(cache.get(expr).toString()).toContain('let { res } = context;');
    });

    it('should not duplicate variables', () => {
      const expr = 'res.data.pets[0] + res.data.pets[1]';
      evaluateJsExpression(expr, context);
      expect(cache.get(expr).toString()).toContain('let { res } = context;');
    });

    it('should exclude js keywords like true false from vars', () => {
      const expr = 'res.data.pets.length > 0 ? true : false';
      evaluateJsExpression(expr, context);
      expect(cache.get(expr).toString()).toContain('let { res } = context;');
    });

    it('should exclude numbers from vars', () => {
      const expr = 'res.data.pets.length + 10';
      evaluateJsExpression(expr, context);
      expect(cache.get(expr).toString()).toContain('let { res } = context;');
    });

    it('should pick variables from complex expressions', () => {
      const expr = 'res.data.pets.map(pet => pet.length)';
      const result = evaluateJsExpression(expr, context);
      expect(result).toEqual([5, 3]);
      expect(cache.get(expr).toString()).toContain('let { res, pet } = context;');
    });

    it('should be ok picking extra vars from strings', () => {
      const expr = "'hello' + ' ' + res.data.pets[0]";
      const result = evaluateJsExpression(expr, context);
      expect(result).toBe('hello bruno');
      // extra var hello is harmless
      expect(cache.get(expr).toString()).toContain('let { hello, res } = context;');
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

  describe('appendAwaitToTestFunc function', () => {
    it('example 1', () => {
      const inputTestsString = `
        test("should return json", function() {
          const data = res.getBody();
          expect(res.getBody()).to.eql({
            "hello": "bruno"
          });
        });
      `;
      const ouutputTestsString = appendAwaitToTestFunc(inputTestsString);
      expect(ouutputTestsString).toBe(`
        await test("should return json", function() {
          const data = res.getBody();
          expect(res.getBody()).to.eql({
            "hello": "bruno"
          });
        });
      `);
    });

    it('example 2', () => {
      const inputTestsString = `
        await test("should return json", function() {
          const data = res.getBody();
          expect(res.getBody()).to.eql({
            "hello": "bruno"
          });
        });
        test("should return json", function() {
          const data = res.getBody();
          expect(res.getBody()).to.eql({
            "hello": "bruno"
          });
        });
        test("should return json", function() {
          const data = res.getBody();
          expect(res.getBody()).to.eql({
            "hello": "bruno"
          });
        });
      `;
      const ouutputTestsString = appendAwaitToTestFunc(inputTestsString);
      expect(ouutputTestsString).toBe(`
        await test("should return json", function() {
          const data = res.getBody();
          expect(res.getBody()).to.eql({
            "hello": "bruno"
          });
        });
        await test("should return json", function() {
          const data = res.getBody();
          expect(res.getBody()).to.eql({
            "hello": "bruno"
          });
        });
        await test("should return json", function() {
          const data = res.getBody();
          expect(res.getBody()).to.eql({
            "hello": "bruno"
          });
        });
      `);
    });
  });
});
