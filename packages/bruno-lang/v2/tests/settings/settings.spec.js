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

  describe('maxRedirects', () => {
    const requestWithMaxRedirects = (rawValue) => `meta {
  name: R
  type: http
  seq: 1
}

get {
  url: https://api.example.com
}

settings {
  maxRedirects: ${rawValue}
}
`;

    it('reads a plain count', () => {
      expect(bruToJson(requestWithMaxRedirects('10')).settings.maxRedirects).toBe(10);
    });

    // parseInt stops at the exponent, so a ceiling Bruno serializes in exponential form reads
    // back as 1.
    it.each([
      ['1e+21', 1e21],
      ['1e+31', 1e31]
    ])('reads %s in full rather than stopping at the exponent', (rawValue, expected) => {
      expect(bruToJson(requestWithMaxRedirects(rawValue)).settings.maxRedirects).toBe(expected);
    });

    // Number is looser than parseInt about emptiness: Number('') is 0, and 0 disables redirects
    // rather than meaning "unset", so a blank value has to be skipped explicitly.
    it.each(['', '   '])('treats a blank value (%p) as absent rather than 0', (rawValue) => {
      expect(bruToJson(requestWithMaxRedirects(rawValue)).settings.maxRedirects).toBeUndefined();
    });

    it.each(['-1', '-0.5', 'abc', 'Infinity', 'NaN'])('ignores an unusable value (%s)', (rawValue) => {
      expect(bruToJson(requestWithMaxRedirects(rawValue)).settings.maxRedirects).toBeUndefined();
    });

    it('truncates a fractional count', () => {
      expect(bruToJson(requestWithMaxRedirects('3.5')).settings.maxRedirects).toBe(3);
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
});
