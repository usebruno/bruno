const { evaluateJsExpression, internalExpressionCache: cache } = require("../src/utils");

describe("utils", () => {
  describe("expression evaluation", () => {
    const context = {
      res: {
        data: { pets: ["bruno", "max"] }
      }
    };

    afterEach(() => cache.clear());

    it("should evaluate expression", () => {
      let result;

      result = evaluateJsExpression("res.data.pets", context);
      expect(result).toEqual(["bruno", "max"]);

      result = evaluateJsExpression("res.data.pets[0].toUpperCase()", context);
      expect(result).toEqual("BRUNO");
    });

    it("should cache expression", () => {
      expect(cache.size).toBe(0);
      evaluateJsExpression("res.data.pets", context);
      expect(cache.size).toBe(1);
    });

    it("should identify top level variables", () => {
      const expr = "res.data.pets[0].toUpperCase()";
      evaluateJsExpression(expr, context);
      expect(cache.get(expr).toString()).toContain("const { res } = context;");
    });

    it("should not duplicate variables", () => {
      const expr = "res.data.pets[0] + res.data.pets[1]";
      evaluateJsExpression(expr, context);
      expect(cache.get(expr).toString()).toContain("const { res } = context;");
    });

    it("should exclude js keywords like true false from vars", () => {
      const expr = "res.data.pets.length > 0 ? true : false";
      evaluateJsExpression(expr, context);
      expect(cache.get(expr).toString()).toContain("const { res } = context;");
    });

    it("should exclude numbers from vars", () => {
      const expr = "res.data.pets.length + 10";
      evaluateJsExpression(expr, context);
      expect(cache.get(expr).toString()).toContain("const { res } = context;");
    });

    it("should pick variables from complex expressions", () => {
      const expr = "res.data.pets.map(pet => pet.length)";
      const result = evaluateJsExpression(expr, context);
      expect(result).toEqual([5, 3]);
      expect(cache.get(expr).toString()).toContain("const { res, pet } = context;");
    });

    it("should be ok picking extra vars from strings", () => {
      const expr = "'hello' + ' ' + res.data.pets[0]";
      const result = evaluateJsExpression(expr, context);
      expect(result).toBe("hello bruno");
      // extra var hello is harmless
      expect(cache.get(expr).toString()).toContain("const { hello, res } = context;");
    });
  });
});