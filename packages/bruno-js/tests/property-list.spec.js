const PropertyList = require('../src/property-list');
const ReadOnlyPropertyList = require('../src/readonly-property-list');

describe('PropertyList', () => {
  test('extends ReadOnlyPropertyList', () => {
    const list = new PropertyList({ items: [] });
    expect(list).toBeInstanceOf(ReadOnlyPropertyList);
    expect(list).toBeInstanceOf(PropertyList);
  });

  // ── Static Mode: Reads ──────────────────────────────────────────────────

  describe('static mode - reads', () => {
    let list;

    beforeEach(() => {
      list = new PropertyList({
        keyProperty: 'key',
        items: [
          { key: 'a', value: '1' },
          { key: 'b', value: '2' },
          { key: 'c', value: '3' }
        ]
      });
    });

    test('get() returns value by key', () => {
      expect(list.get('a')).toBe('1');
      expect(list.get('b')).toBe('2');
    });

    test('get() returns undefined for missing key', () => {
      expect(list.get('missing')).toBeUndefined();
    });

    test('one() returns full item by key', () => {
      expect(list.one('a')).toEqual({ key: 'a', value: '1' });
    });

    test('one() returns undefined for missing key', () => {
      expect(list.one('missing')).toBeUndefined();
    });

    test('all() returns cloned array', () => {
      const items = list.all();
      expect(items).toHaveLength(3);
      expect(items).toEqual([
        { key: 'a', value: '1' },
        { key: 'b', value: '2' },
        { key: 'c', value: '3' }
      ]);
      // Verify it's a clone
      items.push({ key: 'd', value: '4' });
      expect(list.count()).toBe(3);
    });

    test('idx() returns item by position', () => {
      expect(list.idx(0)).toEqual({ key: 'a', value: '1' });
      expect(list.idx(2)).toEqual({ key: 'c', value: '3' });
    });

    test('idx() returns undefined for out-of-bounds', () => {
      expect(list.idx(10)).toBeUndefined();
    });

    test('count() returns number of items', () => {
      expect(list.count()).toBe(3);
    });

    test('indexOf() returns index of item', () => {
      const item = list.idx(1);
      expect(list.indexOf(item)).toBe(1);
    });

    test('indexOf() returns -1 for non-existent item', () => {
      expect(list.indexOf({ key: 'x', value: 'y' })).toBe(-1);
    });

    test('has() checks existence by key', () => {
      expect(list.has('a')).toBe(true);
      expect(list.has('missing')).toBe(false);
    });

    test('has() with value checks both key and value', () => {
      expect(list.has('a', '1')).toBe(true);
      expect(list.has('a', 'wrong')).toBe(false);
    });

    test('find() returns first matching item', () => {
      const found = list.find((i) => i.value === '2');
      expect(found).toEqual({ key: 'b', value: '2' });
    });

    test('find() returns undefined when no match', () => {
      expect(list.find((i) => i.value === 'nope')).toBeUndefined();
    });

    test('filter() returns matching items', () => {
      const result = list.filter((i) => i.value !== '2');
      expect(result).toEqual([
        { key: 'a', value: '1' },
        { key: 'c', value: '3' }
      ]);
    });

    test('each() iterates over all items', () => {
      const keys = [];
      list.each((item) => keys.push(item.key));
      expect(keys).toEqual(['a', 'b', 'c']);
    });

    test('map() transforms items', () => {
      const values = list.map((i) => i.value);
      expect(values).toEqual(['1', '2', '3']);
    });

    test('reduce() accumulates values', () => {
      const sum = list.reduce((acc, i) => acc + Number(i.value), 0);
      expect(sum).toBe(6);
    });

    test('toObject() converts to key-value object', () => {
      expect(list.toObject()).toEqual({ a: '1', b: '2', c: '3' });
    });

    test('toString() converts to string', () => {
      expect(list.toString()).toBe('a=1; b=2; c=3');
    });
  });

  // ── Static Mode: Mutations ──────────────────────────────────────────────

  describe('static mode - mutations', () => {
    let list;

    beforeEach(() => {
      list = new PropertyList({
        items: [
          { key: 'a', value: '1' },
          { key: 'b', value: '2' }
        ]
      });
    });

    test('add() appends item', () => {
      list.add({ key: 'c', value: '3' });
      expect(list.count()).toBe(3);
      expect(list.idx(2)).toEqual({ key: 'c', value: '3' });
    });

    test('prepend() inserts at beginning', () => {
      list.prepend({ key: 'z', value: '0' });
      expect(list.idx(0)).toEqual({ key: 'z', value: '0' });
      expect(list.count()).toBe(3);
    });

    test('insert() inserts before specified key', () => {
      list.insert({ key: 'mid', value: 'x' }, 'b');
      expect(list.all().map((i) => i.key)).toEqual(['a', 'mid', 'b']);
    });

    test('insert() appends when before not found', () => {
      list.insert({ key: 'mid', value: 'x' }, 'missing');
      expect(list.idx(2)).toEqual({ key: 'mid', value: 'x' });
    });

    test('insert() appends when before is undefined', () => {
      list.insert({ key: 'end', value: 'y' });
      expect(list.idx(2)).toEqual({ key: 'end', value: 'y' });
    });

    test('insertAfter() inserts after specified key', () => {
      list.insertAfter({ key: 'mid', value: 'x' }, 'a');
      expect(list.all().map((i) => i.key)).toEqual(['a', 'mid', 'b']);
    });

    test('insertAfter() appends when after not found', () => {
      list.insertAfter({ key: 'mid', value: 'x' }, 'missing');
      expect(list.idx(2)).toEqual({ key: 'mid', value: 'x' });
    });

    test('upsert() updates existing item', () => {
      const result = list.upsert({ key: 'a', value: 'updated' });
      expect(result).toBe(true);
      expect(list.get('a')).toBe('updated');
      expect(list.count()).toBe(2);
    });

    test('upsert() inserts new item', () => {
      const result = list.upsert({ key: 'c', value: '3' });
      expect(result).toBe(false);
      expect(list.count()).toBe(3);
    });

    test('upsert() returns null when no key property', () => {
      const result = list.upsert({ value: 'nokey' });
      expect(result).toBeNull();
      expect(list.count()).toBe(3);
    });

    test('remove() by key name', () => {
      list.remove('a');
      expect(list.count()).toBe(1);
      expect(list.has('a')).toBe(false);
    });

    test('remove() by predicate', () => {
      list.remove((i) => i.value === '2');
      expect(list.count()).toBe(1);
      expect(list.has('b')).toBe(false);
    });

    test('clear() removes all items', () => {
      list.clear();
      expect(list.count()).toBe(0);
    });

    test('populate() replaces all items', () => {
      list.populate([{ key: 'x', value: '9' }]);
      expect(list.count()).toBe(1);
      expect(list.get('x')).toBe('9');
    });

    test('repopulate() clears and replaces', () => {
      list.repopulate([{ key: 'y', value: '8' }]);
      expect(list.count()).toBe(1);
      expect(list.get('y')).toBe('8');
    });

    test('assimilate() merges from array', () => {
      list.assimilate([
        { key: 'a', value: 'updated' },
        { key: 'c', value: '3' }
      ]);
      expect(list.get('a')).toBe('updated');
      expect(list.get('c')).toBe('3');
      expect(list.count()).toBe(3);
    });

    test('assimilate() with prune removes extras', () => {
      list.assimilate([{ key: 'a', value: 'updated' }], true);
      expect(list.count()).toBe(1);
      expect(list.get('a')).toBe('updated');
    });

    test('assimilate() from PropertyList', () => {
      const source = new PropertyList({
        items: [{ key: 'c', value: '3' }]
      });
      list.assimilate(source);
      expect(list.count()).toBe(3);
      expect(list.get('c')).toBe('3');
    });
  });

  // ── Dynamic Mode: Reads ─────────────────────────────────────────────────

  describe('dynamic mode - reads', () => {
    let callCount;
    let list;

    beforeEach(() => {
      callCount = 0;
      list = new PropertyList({
        keyProperty: 'key',
        dataSource: () => {
          callCount++;
          return [
            { key: 'session', value: 'abc123' },
            { key: 'token', value: 'xyz789' }
          ];
        }
      });
    });

    test('get() works in dynamic mode', () => {
      expect(list.get('session')).toBe('abc123');
    });

    test('one() works in dynamic mode', () => {
      expect(list.one('token')).toEqual({ key: 'token', value: 'xyz789' });
    });

    test('all() works in dynamic mode', () => {
      expect(list.all()).toHaveLength(2);
    });

    test('count() works in dynamic mode', () => {
      expect(list.count()).toBe(2);
    });

    test('has() works in dynamic mode', () => {
      expect(list.has('session')).toBe(true);
      expect(list.has('missing')).toBe(false);
    });

    test('toObject() works in dynamic mode', () => {
      expect(list.toObject()).toEqual({ session: 'abc123', token: 'xyz789' });
    });

    test('toString() works in dynamic mode', () => {
      expect(list.toString()).toBe('session=abc123; token=xyz789');
    });

    test('dataSource is called on every read', () => {
      list.get('session');
      list.count();
      list.all();
      expect(callCount).toBe(3);
    });

    test('find() works in dynamic mode', () => {
      expect(list.find((i) => i.key === 'token')).toEqual({ key: 'token', value: 'xyz789' });
    });

    test('filter() works in dynamic mode', () => {
      expect(list.filter((i) => i.key === 'session')).toEqual([{ key: 'session', value: 'abc123' }]);
    });

    test('each() works in dynamic mode', () => {
      const keys = [];
      list.each((i) => keys.push(i.key));
      expect(keys).toEqual(['session', 'token']);
    });

    test('map() works in dynamic mode', () => {
      expect(list.map((i) => i.value)).toEqual(['abc123', 'xyz789']);
    });

    test('reduce() works in dynamic mode', () => {
      const result = list.reduce((acc, i) => acc + i.key + ',', '');
      expect(result).toBe('session,token,');
    });
  });

  // ── Dynamic Mode: Mutation Rejection ────────────────────────────────────

  describe('dynamic mode - rejects mutations', () => {
    let list;

    beforeEach(() => {
      list = new PropertyList({
        dataSource: () => [{ key: 'a', value: '1' }]
      });
    });

    const mutationMethods = [
      ['add', [{ key: 'b', value: '2' }]],
      ['prepend', [{ key: 'b', value: '2' }]],
      ['insert', [{ key: 'b', value: '2' }]],
      ['insertAfter', [{ key: 'b', value: '2' }, 'a']],
      ['upsert', [{ key: 'a', value: 'updated' }]],
      ['remove', ['a']],
      ['clear', []],
      ['populate', [[]]],
      ['repopulate', [[]]],
      ['assimilate', [[]]]
    ];

    test.each(mutationMethods)('%s() throws in dynamic mode', (method, args) => {
      expect(() => list[method](...args)).toThrow(`Cannot call ${method}() on a dynamic PropertyList`);
    });
  });

  // ── Edge Cases ──────────────────────────────────────────────────────────

  describe('edge cases', () => {
    test('empty list', () => {
      const list = new PropertyList({ items: [] });
      expect(list.count()).toBe(0);
      expect(list.all()).toEqual([]);
      expect(list.get('anything')).toBeUndefined();
      expect(list.toObject()).toEqual({});
      expect(list.toString()).toBe('');
    });

    test('default constructor', () => {
      const list = new PropertyList();
      expect(list.count()).toBe(0);
    });

    test('duplicate keys - get returns first match', () => {
      const list = new PropertyList({
        items: [
          { key: 'a', value: '1' },
          { key: 'a', value: '2' }
        ]
      });
      expect(list.get('a')).toBe('1');
      expect(list.count()).toBe(2);
    });

    test('custom keyProperty', () => {
      const list = new PropertyList({
        keyProperty: 'name',
        items: [
          { name: 'Content-Type', value: 'application/json' },
          { name: 'Accept', value: '*/*' }
        ]
      });
      expect(list.get('Content-Type')).toBe('application/json');
      expect(list.has('Accept')).toBe(true);
      expect(list.toObject()).toEqual({
        'Content-Type': 'application/json',
        'Accept': '*/*'
      });
    });
  });
});
