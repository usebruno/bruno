const fs = require('fs');
const path = require('path');
const bruToJson = require('../../src/bruToJson');
const jsonToBru = require('../../src/jsonToBru');

describe('Custom Method Conversion Tests', () => {
  const fixturesDir = path.join(__dirname, 'fixtures');

  describe('parse (BRU to JSON)', () => {
    it('should parse FETCH custom method from BRU to JSON', () => {
      const input = fs.readFileSync(path.join(fixturesDir, 'custom-method.bru'), 'utf8');
      const expected = require(path.join(fixturesDir, 'custom-method.json'));
      const output = bruToJson(input);

      expect(output).toEqual(expected);
    });

    it('should parse X-CUSTOM method from BRU to JSON', () => {
      const input = fs.readFileSync(path.join(fixturesDir, 'custom-method-x-custom.bru'), 'utf8');
      const expected = require(path.join(fixturesDir, 'custom-method-x-custom.json'));
      const output = bruToJson(input);

      expect(output).toEqual(expected);
    });

    it('should parse custom method with special characters from BRU to JSON', () => {
      const input = fs.readFileSync(path.join(fixturesDir, 'custom-method-with-special-chars.bru'), 'utf8');
      const expected = require(path.join(fixturesDir, 'custom-method-with-special-chars.json'));
      const output = bruToJson(input);

      expect(output).toEqual(expected);
    });
  });

  describe('stringify (JSON to BRU)', () => {
    it('should stringify FETCH custom method from JSON to BRU', () => {
      const input = require(path.join(fixturesDir, 'custom-method.json'));
      const expected = fs.readFileSync(path.join(fixturesDir, 'custom-method.bru'), 'utf8');
      const output = jsonToBru(input);

      expect(output).toEqual(expected);
    });

    it('should stringify X-CUSTOM method from JSON to BRU', () => {
      const input = require(path.join(fixturesDir, 'custom-method-x-custom.json'));
      const expected = fs.readFileSync(path.join(fixturesDir, 'custom-method-x-custom.bru'), 'utf8');
      const output = jsonToBru(input);

      expect(output).toEqual(expected);
    });

    it('should stringify custom method with special characters from JSON to BRU', () => {
      const input = require(path.join(fixturesDir, 'custom-method-with-special-chars.json'));
      const expected = fs.readFileSync(path.join(fixturesDir, 'custom-method-with-special-chars.bru'), 'utf8');
      const output = jsonToBru(input);

      expect(output).toEqual(expected);
    });
  });
});
