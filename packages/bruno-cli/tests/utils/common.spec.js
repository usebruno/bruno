const { describe, it, expect } = require('@jest/globals');
const { hasValidTests } = require('../../src/utils/common');

describe('hasValidTests', () => {
  describe('should return true for valid test() calls', () => {
    it('should detect basic test calls', () => {
      const script = `
        test("should work", function() {
          expect(true).to.be.true;
        });
      `;
      expect(hasValidTests(script)).toBe(true);
    });

    it('should detect indented test calls', () => {
      const script = `
        if (true) {
          test("indented test", function() {
            expect(1).to.equal(1);
          });
        }
      `;
      expect(hasValidTests(script)).toBe(true);
    });

    it('should detect test calls with extra whitespace', () => {
      const script = `test   ("with spaces", function() { });`;
      expect(hasValidTests(script)).toBe(true);
    });

    it('should detect test calls after assignments', () => {
      const script = `
        const result = test("assignment test", function() {
          expect("hello").to.be.a("string");
        });
      `;
      expect(hasValidTests(script)).toBe(true);
    });

    it('should detect test calls in conditionals', () => {
      const script = `
        if (condition) {
          test("conditional test", function() {
            expect(true).to.be.true;
          });
        }
      `;
      expect(hasValidTests(script)).toBe(true);
    });

    it('should detect test calls in arrays', () => {
      const script = `
        const tests = [
          test("array test", function() {
            expect(Array.isArray([])).to.be.true;
          })
        ];
      `;
      expect(hasValidTests(script)).toBe(true);
    });

    it('should detect test calls in ternary operators', () => {
      const script = `
        const result = condition ? test("ternary test", function() {
          expect(true).to.be.true;
        }) : null;
      `;
      expect(hasValidTests(script)).toBe(true);
    });

    it('should detect test calls after semicolons', () => {
      const script = `
        const data = res.data; test("after semicolon", function() {
          expect(data).to.be.an("object");
        });
      `;
      expect(hasValidTests(script)).toBe(true);
    });

    it('should detect test calls in object values', () => {
      const script = `
        const config = {
          validation: test("object value test", function() {
            expect(true).to.be.true;
          })
        };
      `;
      expect(hasValidTests(script)).toBe(true);
    });

    it('should detect multiple test calls', () => {
      const script = `
        test("first test", function() {
          expect(1).to.equal(1);
        });
        
        test("second test", function() {
          expect(2).to.equal(2);
        });
      `;
      expect(hasValidTests(script)).toBe(true);
    });

    it('should detect test calls at start of script', () => {
      const script = `test("at start", function() { expect(true).to.be.true; });`;
      expect(hasValidTests(script)).toBe(true);
    });
  });

  describe('should return false for invalid test() calls', () => {
    it('should ignore commented out test calls with //', () => {
      const script = `
        // test("commented test", function() {
        //   expect(true).to.be.true;
        // });
        console.log("no real tests here");
      `;
      expect(hasValidTests(script)).toBe(false);
    });

    it('should ignore commented out test calls with /* */', () => {
      const script = `
        /* test("block commented test", function() {
           expect(true).to.be.true;
         }); */
        console.log("no real tests here");
      `;
      expect(hasValidTests(script)).toBe(false);
    });

    it('should ignore test() in double-quoted strings', () => {
      const script = `
        console.log("This contains test() but should not match");
        console.log("Remember to test() your API");
      `;
      expect(hasValidTests(script)).toBe(false);
    });

    it('should ignore test() in single-quoted strings', () => {
      const script = `
        console.log('Single quote test() should not match');
        const message = 'Use test() for validation';
      `;
      expect(hasValidTests(script)).toBe(false);
    });

    it('should ignore test() in template literals', () => {
      const script = `
        console.log(\`Template literal test() should not match\`);
        const message = \`Remember to test() your code\`;
      `;
      expect(hasValidTests(script)).toBe(false);
    });

    it('should ignore object method calls', () => {
      const script = `
        const obj = { test: function() { return "not a real test"; } };
        obj.test("This is a method call");
      `;
      expect(hasValidTests(script)).toBe(false);
    });

    it('should ignore this.test() calls', () => {
      const script = `
        this.test("Another method call");
        this.test();
      `;
      expect(hasValidTests(script)).toBe(false);
    });

    it('should ignore complex object chain calls', () => {
      const script = `
        api.client.test("Should not match");
        user.test.endpoint("Chained method");
        window.test("Should not match");
      `;
      expect(hasValidTests(script)).toBe(false);
    });

    it('should ignore object methods in variables', () => {
      const script = `
        const validator = {
          test: function(value) { return value > 0; }
        };
        validator.test(42);
        
        const tester = { test: () => "mock" };
        tester.test("method call");
      `;
      expect(hasValidTests(script)).toBe(false);
    });

    it('should return false for empty scripts', () => {
      expect(hasValidTests('')).toBe(false);
      expect(hasValidTests(null)).toBe(false);
      expect(hasValidTests(undefined)).toBe(false);
    });

    it('should return false for scripts with no test calls', () => {
      const script = `
        bru.setVar("userId", "12345");
        console.log("Setting up request");
        const data = res.data;
        bru.setVar("responseData", data);
      `;
      expect(hasValidTests(script)).toBe(false);
    });

    it('should return false when test is part of other words', () => {
      const script = `
        const testing = "value";
        const protest = "demo";
        const fastest = "speed";
        console.log("contest results");
      `;
      expect(hasValidTests(script)).toBe(false);
    });
  });

  describe('should handle mixed scenarios correctly', () => {
    it('should return true when valid test exists among invalid ones', () => {
      const script = `
        // test("commented out");
        console.log("test() in string");
        obj.test("method call");
        
        test("real test", function() {
          expect(true).to.be.true;
        });
        
        api.client.test("another method");
      `;
      expect(hasValidTests(script)).toBe(true);
    });

    it('should return false when only invalid tests exist', () => {
      const script = `
        // test("commented out test", function() {
        //   expect(true).to.be.true;
        // });
        
        console.log("test() inside string");
        console.log('test() in single quotes');
        console.log(\`test() in template\`);
        
        const obj = { test: () => "mock" };
        obj.test("method call");
        this.test("another method");
        api.client.test("chained method");
        
        bru.setVar("test", "variable name");
      `;
      expect(hasValidTests(script)).toBe(false);
    });

    it('should handle complex nested quotes correctly', () => {
      const script = `
        console.log("String with 'nested quotes' and test() call");
        console.log('String with "nested quotes" and test() call');
        
        test("real test with \\"escaped quotes\\"", function() {
          expect(true).to.be.true;
        });
      `;
      expect(hasValidTests(script)).toBe(true);
    });

    it('should handle multi-line comments correctly', () => {
      const script = `
        /*
         * This is a multi-line comment with
         * test("commented test", function() {
         *   expect(true).to.be.true;
         * });
         */
        
        test("real test", function() {
          expect(true).to.be.true;
        });
      `;
      expect(hasValidTests(script)).toBe(true);
    });

    it('should handle inline comments correctly', () => {
      const script = `
        const data = res.data; // test("inline comment")
        test("real test", function() { // this is a real test
          expect(data).to.be.an("object");
        });
      `;
      expect(hasValidTests(script)).toBe(true);
    });
  });

  describe('edge cases', () => {
    it('should handle test calls immediately after dots (edge case)', () => {
      const script = `
        // This should not match because it's after a dot
        console.test("should not match");
        
        // But this should match because there's a space
        console. test("should match due to space");
      `;
      // Note: Our current implementation would consider the second one valid
      // because there's a space between the dot and test
      expect(hasValidTests(script)).toBe(true);
    });
  });
}); 