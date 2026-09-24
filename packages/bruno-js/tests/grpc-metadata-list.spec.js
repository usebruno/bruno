const GrpcMetadataList = require('../src/grpc/grpc-metadata-list');
const ReadOnlyPropertyList = require('../src/readonly-property-list');

describe('GrpcMetadataList', () => {
  const defaultMetadata = {
    'X-Token': 'abc123',
    'content-type': 'application/grpc'
  };

  function createList({ metadata = { ...defaultMetadata }, writable = true } = {}) {
    return { list: new GrpcMetadataList(() => metadata, { writable }), metadata };
  }

  describe('read methods', () => {
    test('get() matches the key case-insensitively', () => {
      const { list } = createList();
      expect(list.get('x-token')).toBe('abc123');
      expect(list.get('X-TOKEN')).toBe('abc123');
      expect(list.get('missing')).toBeUndefined();
      expect(list.get(42)).toBeUndefined();
    });

    test('one() returns the entry under the casing the backing map uses', () => {
      const { list } = createList();
      expect(list.one('x-token')).toEqual({ key: 'X-Token', value: 'abc123' });
      expect(list.one('missing')).toBeUndefined();
    });

    test('has() checks the key, and the value when one is given', () => {
      const { list } = createList();
      expect(list.has('x-token')).toBe(true);
      expect(list.has('x-token', 'abc123')).toBe(true);
      expect(list.has('x-token', 'wrong')).toBe(false);
      expect(list.has('missing')).toBe(false);
    });

    test('reads re-run against the backing map on every call', () => {
      const { list, metadata } = createList();
      expect(list.count()).toBe(2);

      metadata['x-request-id'] = 'req-1';

      expect(list.count()).toBe(3);
      expect(list.all()).toContainEqual({ key: 'x-request-id', value: 'req-1' });
    });

    test('toString() renders one `key: value` per line', () => {
      const { list } = createList();
      expect(list.toString()).toBe('X-Token: abc123\ncontent-type: application/grpc');
    });

    test('toObject() gives back the plain { key: value } map', () => {
      const { list } = createList();
      expect(list.toObject()).toEqual(defaultMetadata);
    });

    test('iteration methods bind the optional context argument', () => {
      const { list } = createList();

      const labelled = list.map(function (entry) {
        return `${this.prefix}${entry.key}`;
      }, { prefix: '#' });

      expect(labelled).toEqual(['#X-Token', '#content-type']);
      expect(list.reduce((acc, entry) => acc.concat(entry.key), [])).toEqual(['X-Token', 'content-type']);
    });
  });

  describe('write methods', () => {
    test('upsert() adds a new key to the backing map', () => {
      const { list, metadata } = createList();
      list.upsert('x-request-id', 'req-1');
      expect(metadata['x-request-id']).toBe('req-1');
    });

    test('upsert() with different casing replaces the existing entry instead of duplicating it', () => {
      const { list, metadata } = createList();
      list.upsert('x-token', 'updated');
      expect(metadata).toEqual({ 'x-token': 'updated', 'content-type': 'application/grpc' });
    });

    test('upsert() ignores an empty or non-string key', () => {
      const { list, metadata } = createList();
      list.upsert('', 'value');
      list.upsert(42, 'value');
      expect(metadata).toEqual(defaultMetadata);
    });

    test('add() takes the { key, value } shape all() returns, and ignores anything else', () => {
      const { list, metadata } = createList();
      list.add({ key: 'x-request-id', value: 'req-1' });
      list.add('x-request-id');
      expect(metadata['x-request-id']).toBe('req-1');
    });

    test('remove() matches case-insensitively', () => {
      const { list, metadata } = createList();
      list.remove('X-TOKEN');
      list.remove('missing');
      expect(metadata).toEqual({ 'content-type': 'application/grpc' });
    });

    test('clear() empties the backing map in place', () => {
      const { list, metadata } = createList();
      list.clear();
      expect(metadata).toEqual({});
    });
  });

  test('every write method throws on a read-only list', () => {
    const { list, metadata } = createList({ writable: false });

    for (const method of ['upsert', 'add', 'remove', 'clear']) {
      expect(() => list[method]('x-token', 'value')).toThrow(
        `metadata.${method}() is not available once the call has been sent`
      );
    }

    expect(metadata).toEqual(defaultMetadata);
  });
});
