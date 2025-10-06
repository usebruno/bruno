const fs = require('fs');
const path = require('path');
const bruToJson = require('../../src/bruToJson');
const jsonToBru = require('../../src/jsonToBru');

describe('Settings Conversion Tests', () => {
  const fixturesDir = path.join(__dirname, 'fixtures');

  describe('parse (BRU to JSON)', () => {
    it('should parse minimal settings from BRU to JSON', () => {
      const input = fs.readFileSync(path.join(fixturesDir, 'settings-minimal.bru'), 'utf8');
      const expected = require(path.join(fixturesDir, 'settings-minimal.json'));
      const output = bruToJson(input);

      expect(output).toEqual(expected);
    });

    it('should parse all settings options from BRU to JSON', () => {
      const input = fs.readFileSync(path.join(fixturesDir, 'settings-all-options.bru'), 'utf8');
      const expected = require(path.join(fixturesDir, 'settings-all-options.json'));
      const output = bruToJson(input);

      expect(output).toEqual(expected);
    });
  });

  describe('stringify (JSON to BRU)', () => {
    it('should stringify minimal settings from JSON to BRU', () => {
      const input = require(path.join(fixturesDir, 'settings-minimal.json'));
      const expected = fs.readFileSync(path.join(fixturesDir, 'settings-minimal.bru'), 'utf8');
      const output = jsonToBru(input);

      expect(output).toEqual(expected);
    });

    it('should stringify all settings options from JSON to BRU', () => {
      const input = require(path.join(fixturesDir, 'settings-all-options.json'));
      const expected = fs.readFileSync(path.join(fixturesDir, 'settings-all-options.bru'), 'utf8');
      const output = jsonToBru(input);

      expect(output).toEqual(expected);
    });
  });

  describe('round-trip conversion', () => {
    it('should maintain data integrity through BRU -> JSON -> BRU conversion', () => {
      const originalBru = fs.readFileSync(path.join(fixturesDir, 'settings-all-options.bru'), 'utf8');

      // Convert BRU to JSON
      const json = bruToJson(originalBru);

      // Convert JSON back to BRU
      const convertedBru = jsonToBru(json);

      expect(convertedBru).toEqual(originalBru);
    });

    it('should maintain data integrity through JSON -> BRU -> JSON conversion', () => {
      const originalJson = require(path.join(fixturesDir, 'settings-all-options.json'));

      // Convert JSON to BRU
      const bru = jsonToBru(originalJson);

      // Convert BRU back to JSON
      const convertedJson = bruToJson(bru);

      expect(convertedJson).toEqual(originalJson);
    });
  });
});
