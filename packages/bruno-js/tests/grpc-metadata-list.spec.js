const GrpcMetadataList = require('../src/grpc/grpc-metadata-list');
const ReadOnlyPropertyList = require('../src/readonly-property-list');

describe('GrpcMetadataList', () => {
  const defaultMetadata = {
    'X-Token': 'abc123',
    'content-type': 'application/grpc'
  };

  // A writable list edits the request it is given: `headers` is the map the client sends,
  // `headerEntries` the ordered store. Both are created on demand.
  function createList({ metadata = { ...defaultMetadata } } = {}) {
    const request = { headers: metadata };
    return { list: new GrpcMetadataList(request, { writable: true }), metadata, request };
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

    test('reads pick up keys written to the backing map directly', () => {
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

    test('items returned by reads are copies of the store', () => {
      const { list, request } = createList();
      list.one('x-token').value = 'edited';
      list.all()[0].disabled = true;
      expect(request.headerEntries).toEqual([
        { key: 'X-Token', value: 'abc123' },
        { key: 'content-type', value: 'application/grpc' }
      ]);
    });
  });

  describe('write methods', () => {
    test('upsert() adds a new key to the store and the backing map', () => {
      const { list, metadata, request } = createList();
      list.upsert('x-request-id', 'req-1');
      expect(metadata['x-request-id']).toBe('req-1');
      expect(request.headerEntries.at(-1)).toEqual({ key: 'x-request-id', value: 'req-1' });
    });

    test('upsert() with different casing replaces the existing entry in place instead of duplicating it', () => {
      const { list, metadata, request } = createList();
      list.upsert('x-token', 'updated');
      expect(metadata).toEqual({ 'x-token': 'updated', 'content-type': 'application/grpc' });
      expect(request.headerEntries).toEqual([
        { key: 'x-token', value: 'updated' },
        { key: 'content-type', value: 'application/grpc' }
      ]);
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
      list.add({ key: '', value: 'nameless' });
      expect(metadata).toEqual({ ...defaultMetadata, 'x-request-id': 'req-1' });
    });

    test('remove() matches case-insensitively', () => {
      const { list, metadata } = createList();
      list.remove('X-TOKEN');
      list.remove('missing');
      expect(metadata).toEqual({ 'content-type': 'application/grpc' });
    });

    test('clear() empties the store and the backing map in place', () => {
      const { list, metadata, request } = createList();
      list.count();
      const entries = request.headerEntries;
      list.clear();
      expect(metadata).toEqual({});
      expect(request.headerEntries).toBe(entries);
      expect(entries).toEqual([]);
    });

    test('a key named __proto__ becomes a real entry instead of touching the prototype', () => {
      const { list, metadata } = createList({ metadata: {} });
      list.upsert('__proto__', 'polluted');
      expect(Object.keys(metadata)).toEqual(['__proto__']);
      expect(Object.getPrototypeOf(metadata)).toBe(Object.prototype);
      expect(list.get('__proto__')).toBe('polluted');
    });
  });

  describe('disabled entries', () => {
    function createWithDisabled() {
      const request = {
        headers: { 'X-Token': 'abc123' },
        headerEntries: [
          { key: 'X-Token', value: 'abc123' },
          { key: 'x-off', value: 'hidden', disabled: true }
        ]
      };
      const list = new GrpcMetadataList(request, { writable: true });
      return { list, metadata: request.headers, entries: request.headerEntries };
    }

    test('appear in all() with disabled: true, in store order', () => {
      const { list } = createWithDisabled();
      expect(list.all()).toEqual([
        { key: 'X-Token', value: 'abc123' },
        { key: 'x-off', value: 'hidden', disabled: true }
      ]);
      expect(list.one('X-OFF')).toEqual({ key: 'x-off', value: 'hidden', disabled: true });
    });

    test('idx(i) equals all()[i]', () => {
      const { list } = createWithDisabled();
      expect(list.idx(1)).toEqual(list.all()[1]);
    });

    test('toString() skips disabled entries', () => {
      const { list } = createWithDisabled();
      expect(list.toString()).toBe('X-Token: abc123');
    });

    test('add() with disabled: true disables an enabled key in place', () => {
      const { list, metadata, entries } = createWithDisabled();
      list.add({ key: 'x-token', value: 'off-now', disabled: true });
      expect(metadata).toEqual({});
      expect(entries).toEqual([
        { key: 'x-token', value: 'off-now', disabled: true },
        { key: 'x-off', value: 'hidden', disabled: true }
      ]);
    });

    test('upsert() on a disabled key enables it', () => {
      const { list, metadata, entries } = createWithDisabled();
      list.upsert('X-Off', 'on');
      expect(metadata).toEqual({ 'X-Token': 'abc123', 'X-Off': 'on' });
      expect(entries).toEqual([
        { key: 'X-Token', value: 'abc123' },
        { key: 'X-Off', value: 'on' }
      ]);
    });

    test('remove() drops enabled and disabled entries alike', () => {
      const { list, metadata, entries } = createWithDisabled();
      list.remove('X-OFF');
      list.remove('x-token');
      expect(metadata).toEqual({});
      expect(entries).toEqual([]);
    });

    test('clear() empties both views in place', () => {
      const { list, metadata, entries } = createWithDisabled();
      list.clear();
      expect(metadata).toEqual({});
      expect(entries).toEqual([]);
    });

    test('a request without headerEntries gets them on the first disabled write', () => {
      const { list, request } = createList();
      list.add({ key: 'x-off', value: 'v', disabled: true });
      expect(list.one('x-off')).toEqual({ key: 'x-off', value: 'v', disabled: true });
      expect(request.headerEntries.at(-1)).toEqual({ key: 'x-off', value: 'v', disabled: true });
    });
  });

  describe('read-only snapshot', () => {
    test('is built from the [{ name, value }] display rows', () => {
      const rows = [{ name: 'content-type', value: 'application/grpc' }];
      const list = new GrpcMetadataList(rows);
      rows.push({ name: 'late', value: 'ignored' });
      expect(list.all()).toEqual([{ key: 'content-type', value: 'application/grpc' }]);
    });

    test('no rows at all is an empty list', () => {
      expect(new GrpcMetadataList(undefined).count()).toBe(0);
    });

    test('a snapshot is never writable', () => {
      const list = new GrpcMetadataList([{ name: 'a', value: '1' }], { writable: true });
      expect(() => list.upsert('a', '2')).toThrow(/beforeCallStart/);
    });
  });

  describe('read-only request list (call already open)', () => {
    test('reads the live store but every write method throws and leaves it alone', () => {
      const metadata = { ...defaultMetadata };
      const list = new GrpcMetadataList({ headers: metadata });
      expect(list.get('x-token')).toBe('abc123');

      for (const method of ['upsert', 'add', 'remove', 'clear']) {
        expect(() => list[method]('x-token', 'value')).toThrow(
          `metadata.${method}() is not available once the call has been sent`
        );
      }

      expect(metadata).toEqual(defaultMetadata);
    });
  });

  test('extends ReadOnlyPropertyList', () => {
    const { list } = createList();
    expect(list).toBeInstanceOf(ReadOnlyPropertyList);
    expect(ReadOnlyPropertyList.isPropertyList(list)).toBe(true);
  });

  test('exposes no public own keys', () => {
    const { list } = createList();
    expect(Object.keys(list).filter((key) => !key.startsWith('_'))).toEqual([]);
  });
});
