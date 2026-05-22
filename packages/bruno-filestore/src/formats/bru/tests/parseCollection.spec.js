const fs = require('node:fs');
const path = require('node:path');
const { parseBruCollection } = require('../index');

const loadFixture = (name) =>
  fs.readFileSync(path.join(__dirname, 'fixtures', 'parseCollection', `${name}.bru`), 'utf8');

describe('bru parseBruCollection', () => {
  it('returns the default empty shape for an empty collection bru file', () => {
    const result = parseBruCollection(loadFixture('empty'));

    expect(result).toEqual({
      request: {
        headers: [],
        auth: {},
        script: {},
        vars: {},
        tests: ''
      },
      settings: {},
      docs: ''
    });
  });

  it('extracts headers, auth, and docs when present', () => {
    const result = parseBruCollection(loadFixture('with-headers-auth'));

    expect(result.request.headers).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ name: 'X-Collection-Header', value: 'collection-value' })
      ])
    );
    expect(result.request.auth).toEqual(
      expect.objectContaining({
        mode: 'bearer',
        bearer: expect.objectContaining({ token: 'COLLECTION_TOKEN' })
      })
    );
    expect(result.docs).toContain('Collection-level docs');
  });

  it('extracts meta block for folder bru files', () => {
    const result = parseBruCollection(loadFixture('folder-with-meta'));

    expect(result.meta).toEqual({
      name: 'my-folder',
      seq: 3
    });
    expect(result.request.auth).toEqual(expect.objectContaining({ mode: 'none' }));
  });

  it('extracts vars, scripts, and tests when present', () => {
    const result = parseBruCollection(loadFixture('with-vars-and-scripts'));

    expect(result.request.vars).toEqual(
      expect.objectContaining({
        req: expect.arrayContaining([
          expect.objectContaining({ name: 'shared_var', value: 'shared-value' })
        ])
      })
    );
    expect(result.request.script).toEqual(
      expect.objectContaining({
        req: expect.stringContaining("bru.setVar('runtime_var', 'runtime-value')")
      })
    );
    expect(result.request.tests).toContain('collection-level test runs');
  });

  it('does not produce a brunoConfig / presets field (presets are yml-only)', () => {
    // The yml parser returns { collectionRoot, brunoConfig } and brunoConfig may
    // include a `presets` object. The bru parser returns a flat collection
    // shape and never carries presets — they live in a separate bruno.json for
    // bru-format collections.
    const result = parseBruCollection(loadFixture('with-headers-auth'));

    expect(result.brunoConfig).toBeUndefined();
    expect(result.presets).toBeUndefined();
  });
});
