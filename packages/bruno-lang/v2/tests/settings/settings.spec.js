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
    it('should stringify minimal settings from JSON to BRU (with defaults)', () => {
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
    it('should maintain data integrity through JSON -> BRU -> JSON conversion', () => {
      const originalJson = require(path.join(fixturesDir, 'settings-all-options.json'));

      // Convert JSON to BRU
      const bru = jsonToBru(originalJson);

      // Convert BRU back to JSON
      const convertedJson = bruToJson(bru);

      expect(convertedJson).toEqual(originalJson);
    });
  });

  describe('httpVersion', () => {
    const wrap = (settingsBody) => `meta {\n  name: r\n  type: http\n  seq: 1\n}\n\nget {\n  url: https://x.test\n  body: none\n  auth: none\n}\n\nsettings {\n${settingsBody}\n}\n`;

    it.each(['inherit', 'auto', 'http1.1', 'http2'])('parses httpVersion: %s', (value) => {
      const json = bruToJson(wrap(`  httpVersion: ${value}`));
      expect(json.settings.httpVersion).toBe(value);
    });

    it('ignores an invalid httpVersion', () => {
      const json = bruToJson(wrap('  httpVersion: bogus'));
      expect(json.settings.httpVersion).toBeUndefined();
    });

    it('omits httpVersion when not set', () => {
      const json = bruToJson(wrap('  timeout: 30'));
      expect(json.settings.httpVersion).toBeUndefined();
    });

    it('round-trips httpVersion through JSON -> BRU -> JSON', () => {
      const json = bruToJson(wrap('  httpVersion: http2'));
      const back = bruToJson(jsonToBru(json));
      expect(back.settings.httpVersion).toBe('http2');
    });
  });
});
