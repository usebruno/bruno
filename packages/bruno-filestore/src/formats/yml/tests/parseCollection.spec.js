import fs from 'node:fs';
import path from 'node:path';
import parseCollection from '../parseCollection';

const loadFixture = (name) =>
  fs.readFileSync(path.join(__dirname, 'fixtures', 'presets', `${name}.yml`), 'utf8');

describe('yml parseCollection - presets', () => {
  it('parses presets when request.type and request.url are present', () => {
    const { brunoConfig } = parseCollection(loadFixture('with-type-and-url'));

    expect(brunoConfig.presets).toEqual({
      requestType: 'graphql',
      requestUrl: 'https://example.com/graphql'
    });
  });

  it('defaults requestType and requestUrl to empty strings (not arrays) when request fields are missing', () => {
    const { brunoConfig } = parseCollection(loadFixture('empty-request'));

    expect(brunoConfig.presets).toEqual({
      requestType: '',
      requestUrl: ''
    });
    expect(Array.isArray(brunoConfig.presets.requestType)).toBe(false);
    expect(Array.isArray(brunoConfig.presets.requestUrl)).toBe(false);
  });

  it('does not set presets when the extension has no presets block', () => {
    const { brunoConfig } = parseCollection(loadFixture('no-presets'));

    expect(brunoConfig.presets).toBeUndefined();
  });

  it('does not set presets when presets exists but request key is absent', () => {
    const { brunoConfig } = parseCollection(loadFixture('no-request-key'));

    expect(brunoConfig.presets).toBeUndefined();
  });

  it('parses a realistic collection with only request.type set (no url) — defaults url to empty string', () => {
    const { brunoConfig } = parseCollection(loadFixture('type-only-realistic'));

    expect(brunoConfig.presets).toEqual({
      requestType: 'graphql',
      requestUrl: ''
    });
    expect(Array.isArray(brunoConfig.presets.requestUrl)).toBe(false);
    expect(brunoConfig.ignore).toEqual(['node_modules', '.git']);
  });
});
