const { PROPERTY_LIST_MANIFEST, descriptorFor, bridgeMethodSets } = require('../../src/property-lists/manifest');
const { createPropertyList } = require('../../src/property-lists/create-property-list');

// The derived sets are pinned as explicit arrays so any change to a surface's
// script-facing API shows up here as a reviewable diff.

const READS = ['get', 'has', 'count', 'indexOf', 'toObject', 'toString'];
const READ_OBJECTS = ['one', 'all', 'idx', 'toJSON'];
const POSITIONAL = ['insert', 'insertAfter', 'prepend', 'append'];

describe('property-list manifest', () => {
  test('paths are unique and resolvable', () => {
    const paths = PROPERTY_LIST_MANIFEST.map((d) => d.path);
    expect(new Set(paths).size).toBe(paths.length);
    for (const path of paths) {
      expect(descriptorFor(path).path).toBe(path);
    }
  });

  test('descriptorFor() returns undefined for unknown paths', () => {
    expect(descriptorFor('bru.unknown')).toBeUndefined();
  });

  test('createPropertyList() throws on unknown paths', () => {
    expect(() => createPropertyList('bru.unknown')).toThrow('Unknown property list path: \'bru.unknown\'');
  });

  test('bridgeMethodSets() throws on unknown paths', () => {
    expect(() => bridgeMethodSets('bru.unknown')).toThrow('Unknown property list path: \'bru.unknown\'');
  });

  test.each(['bru.grpc.request.metadata', 'bru.grpc.response.metadata', 'bru.grpc.response.trailers'])(
    'bridge method sets for %s',
    (path) => {
      expect(bridgeMethodSets(path)).toEqual({
        syncReadMethods: READS,
        syncReadObjectMethods: READ_OBJECTS,
        syncWriteMethods: ['upsert', 'add', 'remove', 'clear', ...POSITIONAL],
        asyncWriteMethods: [],
        withIterators: true
      });
    }
  );

  test.each(['req.headerList', 'res.headerList'])('bridge method sets for %s', (path) => {
    expect(bridgeMethodSets(path)).toEqual({
      syncReadMethods: READS,
      syncReadObjectMethods: READ_OBJECTS,
      syncWriteMethods: ['add', 'upsert', 'remove', 'clear', 'populate', 'repopulate', 'assimilate', ...POSITIONAL],
      asyncWriteMethods: [],
      withIterators: true
    });
  });

  test('bridge method sets for bru.cookies (async writes)', () => {
    expect(bridgeMethodSets('bru.cookies')).toEqual({
      syncReadMethods: READS,
      syncReadObjectMethods: READ_OBJECTS,
      syncWriteMethods: POSITIONAL,
      asyncWriteMethods: ['add', 'upsert', 'remove', 'delete', 'clear'],
      withIterators: true
    });
  });
});
