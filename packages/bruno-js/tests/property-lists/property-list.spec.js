const { PropertyList, assemblePropertyList } = require('../../src/property-lists/property-list');
const ArrayStore = require('../../src/property-lists/stores/array-store');

const makeDescriptor = (overrides = {}) => ({
  ordered: true,
  writable: true,
  caseInsensitive: false,
  uniqueKeys: false,
  serializers: {},
  writeMethods: ['add', 'upsert', 'remove', 'clear', 'populate', 'repopulate', 'assimilate'],
  errors: {
    readonly: (method) => `${method}() is not available — this list is read-only`,
    unordered: (method) => `${method}() is not available — this list has no ordering`
  },
  ...overrides
});

const makeList = (items, overrides) => assemblePropertyList(makeDescriptor(overrides), new ArrayStore(items));

const abcItems = [
  { key: 'a', value: '1' },
  { key: 'b', value: '2' },
  { key: 'c', value: '3' }
];

describe('PropertyList', () => {
  describe('read methods', () => {
    let list;

    beforeEach(() => {
      list = makeList(abcItems);
    });

    test('get() returns value by key', () => {
      expect(list.get('a')).toBe('1');
      expect(list.get('missing')).toBeUndefined();
    });

    test('one() returns full item by key', () => {
      expect(list.one('b')).toEqual({ key: 'b', value: '2' });
    });

    test('all() returns cloned array', () => {
      const items = list.all();
      expect(items).toHaveLength(3);
      items.push({ key: 'd', value: '4' });
      expect(list.count()).toBe(3);
    });

    test('idx() returns item by position', () => {
      expect(list.idx(0)).toEqual({ key: 'a', value: '1' });
      expect(list.idx(10)).toBeUndefined();
    });

    test('count() returns number of items', () => {
      expect(list.count()).toBe(3);
    });

    test('has() checks existence', () => {
      expect(list.has('a')).toBe(true);
      expect(list.has('a', '1')).toBe(true);
      expect(list.has('a', 'wrong')).toBe(false);
      expect(list.has('missing')).toBe(false);
    });

    test('toJSON() returns cloned array of all items', () => {
      const json = list.toJSON();
      expect(json).toEqual(abcItems);
      json.push({ key: 'd', value: '4' });
      expect(list.count()).toBe(3);
    });

    test('indexOf() finds item by structural equality', () => {
      expect(list.indexOf({ key: 'b', value: '2' })).toBe(1);
      expect(list.indexOf({ key: 'missing', value: '0' })).toBe(-1);
    });

    test('indexOf() returns -1 for non-object input', () => {
      expect(list.indexOf(null)).toBe(-1);
      expect(list.indexOf('a')).toBe(-1);
    });

    test('find() returns first matching item', () => {
      expect(list.find((i) => i.value === '2')).toEqual({ key: 'b', value: '2' });
      expect(list.find((i) => i.value === 'missing')).toBeUndefined();
    });

    test('filter() returns matching items', () => {
      const items = list.filter((i) => i.value !== '2');
      expect(items.map((i) => i.key)).toEqual(['a', 'c']);
    });

    test('each() iterates over all items', () => {
      const keys = [];
      list.each((item) => keys.push(item.key));
      expect(keys).toEqual(['a', 'b', 'c']);
    });

    test('map() transforms items', () => {
      expect(list.map((item) => item.value)).toEqual(['1', '2', '3']);
    });

    test('reduce() accumulates values', () => {
      expect(list.reduce((acc, item) => acc + item.value, '')).toBe('123');
    });

    test('reduce() without initial value uses first element as accumulator', () => {
      const numList = makeList([
        { key: 'a', value: 1 },
        { key: 'b', value: 2 },
        { key: 'c', value: 3 }
      ]);
      expect(numList.reduce((acc, item) => acc + item.value)).toEqual({ key: 'a', value: 1 } + 2 + 3);
    });

    test('reduce() without initial value on single-element list returns that element', () => {
      const singleList = makeList([{ key: 'only', value: 42 }]);
      expect(singleList.reduce((acc, item) => acc + item.value)).toEqual({ key: 'only', value: 42 });
    });

    test('reduce() without initial value on empty list throws TypeError', () => {
      const emptyList = makeList([]);
      expect(() => emptyList.reduce((acc, item) => acc + item.value)).toThrow(TypeError);
    });

    test('get() returns last value when duplicate keys exist, consistent with toObject()', () => {
      const dupList = makeList([
        { key: 'x', value: 'first' },
        { key: 'x', value: 'second' }
      ]);
      expect(dupList.get('x')).toBe('second');
      expect(dupList.one('x')).toEqual({ key: 'x', value: 'second' });
      expect(dupList.toObject().x).toBe('second');
    });

    test('empty list', () => {
      const empty = makeList([]);
      expect(empty.count()).toBe(0);
      expect(empty.toObject()).toEqual({});
    });
  });

  describe('live view', () => {
    test('reads from the store on every call', () => {
      let callCount = 0;
      const store = {
        read: () => {
          callCount++;
          return [
            { key: 'x', value: '10' },
            { key: 'y', value: '20' }
          ];
        }
      };
      const list = assemblePropertyList(makeDescriptor({ writeMethods: [], ordered: false }), store);

      expect(list.get('x')).toBe('10');
      expect(list.count()).toBe(2);
      expect(list.all()).toHaveLength(2);
      expect(callCount).toBe(3);
    });
  });

  describe('case-insensitive matching', () => {
    let list;

    beforeEach(() => {
      list = makeList([{ key: 'Content-Type', value: 'application/json' }], {
        caseInsensitive: true,
        uniqueKeys: true
      });
    });

    test('get/one/has match keys case-insensitively', () => {
      expect(list.get('content-type')).toBe('application/json');
      expect(list.one('CONTENT-TYPE')).toEqual({ key: 'Content-Type', value: 'application/json' });
      expect(list.has('content-TYPE')).toBe(true);
      expect(list.has('content-type', 'application/json')).toBe(true);
      expect(list.has('content-type', 'text/html')).toBe(false);
    });

    test('indexOf matches keys case-insensitively', () => {
      expect(list.indexOf('content-type')).toBe(0);
      expect(list.indexOf({ key: 'content-type', value: 'application/json' })).toBe(0);
      expect(list.indexOf({ key: 'content-type', value: 'text/html' })).toBe(-1);
    });
  });

  describe('uniqueKeys gating', () => {
    test('string indexOf and object has() work on unique-key lists', () => {
      const list = makeList(abcItems, { uniqueKeys: true });
      expect(list.indexOf('b')).toBe(1);
      expect(list.has({ key: 'b' })).toBe(true);
      expect(list.has({ key: 'missing' })).toBe(false);
    });

    test('string indexOf and object has() are inert on duplicate-key lists', () => {
      const list = makeList(abcItems, { uniqueKeys: false });
      expect(list.indexOf('b')).toBe(-1);
      expect(list.has({ key: 'b' })).toBe(false);
    });
  });

  describe('context binding', () => {
    let list;
    const context = { suffix: '!' };

    beforeEach(() => {
      list = makeList(abcItems);
    });

    test('each/map/filter/find bind context when provided', () => {
      const keys = [];
      list.each(function (item) {
        keys.push(item.key + this.suffix);
      }, context);
      expect(keys).toEqual(['a!', 'b!', 'c!']);

      expect(
        list.map(function (item) {
          return item.value + this.suffix;
        }, context)
      ).toEqual(['1!', '2!', '3!']);

      expect(
        list.filter(function (item) {
          return this.suffix === '!' && item.key === 'a';
        }, context)
      ).toHaveLength(1);

      expect(
        list.find(function (item) {
          return this.suffix === '!' && item.key === 'b';
        }, context)
      ).toEqual({ key: 'b', value: '2' });
    });

    test('reduce binds context as the third argument', () => {
      const result = list.reduce(
        function (acc, item) {
          return acc + item.value + this.suffix;
        },
        '',
        context
      );
      expect(result).toBe('1!2!3!');
    });
  });

  describe('serializers', () => {
    const headerItems = [
      { key: 'Accept', value: '*/*', disabled: true },
      { key: 'Content-Type', value: 'application/json' },
      { key: 'X-Token', value: 'abc' }
    ];

    test('toString pairs (default)', () => {
      expect(makeList(abcItems).toString()).toBe('a=1; b=2; c=3');
    });

    test('toString httpWire skips disabled headers and appends trailing newline', () => {
      const list = makeList(headerItems, { serializers: { toString: 'httpWire' } });
      expect(list.toString()).toBe('Content-Type: application/json\nX-Token: abc\n');
    });

    test('toString httpWire returns empty string for empty list', () => {
      const list = makeList([{ key: 'a', value: '1', disabled: true }], { serializers: { toString: 'httpWire' } });
      expect(list.toString()).toBe('');
    });

    test('toString metadataLines joins without trailing newline', () => {
      const list = makeList(abcItems, { serializers: { toString: 'metadataLines' } });
      expect(list.toString()).toBe('a: 1\nb: 2\nc: 3');
    });

    test('toObject basic (default) ignores arguments', () => {
      expect(makeList(abcItems).toObject(true, false)).toEqual({ a: '1', b: '2', c: '3' });
    });

    test('toObject postmanHeaders honors all four arguments', () => {
      const list = makeList(headerItems, { serializers: { toObject: 'postmanHeaders' } });
      expect(list.toObject()).toEqual({ 'Accept': '*/*', 'Content-Type': 'application/json', 'X-Token': 'abc' });
      expect(list.toObject(true)).toEqual({ 'Content-Type': 'application/json', 'X-Token': 'abc' });
      expect(list.toObject(false, false)).toEqual({ 'accept': '*/*', 'content-type': 'application/json', 'x-token': 'abc' });

      const dupList = makeList(
        [
          { key: 'X', value: 'first' },
          { key: 'X', value: 'second' },
          { key: '', value: 'blank' }
        ],
        { serializers: { toObject: 'postmanHeaders' } }
      );
      expect(dupList.toObject(false, true, true)).toEqual({ 'X': 'first', '': 'blank' });
      expect(dupList.toObject(false, true, false, true)).toEqual({ X: 'second' });
    });
  });

  describe('ArrayStore write methods', () => {
    let list;

    beforeEach(() => {
      list = makeList(abcItems);
    });

    test('add() appends item to end', () => {
      list.add({ key: 'd', value: '4' });
      expect(list.count()).toBe(4);
      expect(list.idx(3)).toEqual({ key: 'd', value: '4' });
    });

    test('append() is alias for add()', () => {
      list.append({ key: 'd', value: '4' });
      expect(list.count()).toBe(4);
      expect(list.idx(3)).toEqual({ key: 'd', value: '4' });
    });

    test('prepend() inserts item at beginning', () => {
      list.prepend({ key: 'z', value: '0' });
      expect(list.idx(0)).toEqual({ key: 'z', value: '0' });
      expect(list.idx(1)).toEqual({ key: 'a', value: '1' });
    });

    test('insert() before key string', () => {
      list.insert({ key: 'x', value: '9' }, 'b');
      expect(list.idx(1)).toEqual({ key: 'x', value: '9' });
      expect(list.idx(2)).toEqual({ key: 'b', value: '2' });
    });

    test('insert() before item object', () => {
      list.insert({ key: 'x', value: '9' }, { key: 'c', value: '3' });
      expect(list.idx(2)).toEqual({ key: 'x', value: '9' });
      expect(list.idx(3)).toEqual({ key: 'c', value: '3' });
    });

    test('insert() appends when reference not found', () => {
      list.insert({ key: 'x', value: '9' }, 'missing');
      expect(list.idx(3)).toEqual({ key: 'x', value: '9' });
    });

    test('insertAfter() after key string', () => {
      list.insertAfter({ key: 'x', value: '9' }, 'a');
      expect(list.idx(1)).toEqual({ key: 'x', value: '9' });
      expect(list.idx(2)).toEqual({ key: 'b', value: '2' });
    });

    test('insertAfter() after item object', () => {
      list.insertAfter({ key: 'x', value: '9' }, { key: 'b', value: '2' });
      expect(list.idx(2)).toEqual({ key: 'x', value: '9' });
    });

    test('insertAfter() appends when reference not found', () => {
      list.insertAfter({ key: 'x', value: '9' }, 'missing');
      expect(list.idx(3)).toEqual({ key: 'x', value: '9' });
    });

    test('remove() by predicate', () => {
      list.remove((item) => item.value === '2');
      expect(list.count()).toBe(2);
      expect(list.has('b')).toBe(false);
    });

    test('remove() by key string', () => {
      list.remove('a');
      expect(list.has('a')).toBe(false);
    });

    test('remove() by item object', () => {
      list.remove({ key: 'c', value: '3' });
      expect(list.has('c')).toBe(false);
    });

    test('remove() by item object that does not exist is no-op', () => {
      list.remove({ key: 'missing', value: '0' });
      expect(list.count()).toBe(3);
    });

    test('clear() empties the list', () => {
      list.clear();
      expect(list.count()).toBe(0);
      expect(list.all()).toEqual([]);
    });

    test('upsert() updates existing item by key', () => {
      list.upsert({ key: 'b', value: 'updated' });
      expect(list.count()).toBe(3);
      expect(list.get('b')).toBe('updated');
    });

    test('upsert() appends new item when key not found', () => {
      list.upsert({ key: 'd', value: '4' });
      expect(list.count()).toBe(4);
      expect(list.get('d')).toBe('4');
    });

    test('populate() replaces all items', () => {
      list.populate([{ key: 'x', value: '10' }]);
      expect(list.count()).toBe(1);
      expect(list.get('x')).toBe('10');
    });

    test('populate() with non-array sets empty list', () => {
      list.populate(null);
      expect(list.count()).toBe(0);
    });

    test('repopulate() clears and replaces', () => {
      list.repopulate([{ key: 'y', value: '20' }]);
      expect(list.count()).toBe(1);
      expect(list.get('y')).toBe('20');
    });

    test('assimilate() merges from array', () => {
      list.assimilate([{ key: 'd', value: '4' }]);
      expect(list.count()).toBe(4);
    });

    test('assimilate() merges from PropertyList', () => {
      const source = makeList([{ key: 'd', value: '4' }]);
      list.assimilate(source);
      expect(list.count()).toBe(4);
      expect(list.get('d')).toBe('4');
    });

    test('assimilate() with prune clears first', () => {
      list.assimilate([{ key: 'x', value: '10' }], true);
      expect(list.count()).toBe(1);
      expect(list.get('x')).toBe('10');
    });

    test('assimilate() with invalid source is no-op', () => {
      list.assimilate('not-a-list');
      expect(list.count()).toBe(3);
    });
  });

  describe('capability gating', () => {
    test('readonly surface: write methods throw the readonly error', () => {
      const list = makeList(abcItems, { writable: false });
      for (const method of ['add', 'upsert', 'remove', 'clear', 'populate', 'repopulate', 'assimilate']) {
        expect(() => list[method]({ key: 'x', value: '1' })).toThrow(`${method}() is not available — this list is read-only`);
      }
    });

    test('readonly surface: read methods still work', () => {
      const list = makeList(abcItems, { writable: false });
      expect(list.get('a')).toBe('1');
      expect(list.count()).toBe(3);
    });

    test('unordered surface: positional mutators throw the unordered error', () => {
      const list = makeList(abcItems, { ordered: false });
      for (const method of ['insert', 'insertAfter', 'prepend', 'append']) {
        expect(() => list[method]({ key: 'x', value: '1' })).toThrow(`${method}() is not available — this list has no ordering`);
      }
    });

    test('unordered surface: non-positional writes still work', () => {
      const list = makeList(abcItems, { ordered: false });
      list.add({ key: 'd', value: '4' });
      expect(list.get('d')).toBe('4');
    });

    test('unordered is checked before readonly for positional mutators', () => {
      const list = makeList(abcItems, { ordered: false, writable: false });
      expect(() => list.insert({ key: 'x', value: '1' }, 'a')).toThrow('insert() is not available — this list has no ordering');
    });

    test('idx() stays available on unordered and readonly surfaces', () => {
      const list = makeList(abcItems, { ordered: false, writable: false });
      expect(list.idx(1)).toEqual({ key: 'b', value: '2' });
    });

    test('writable: \'wiring\' resolves from the wiring flag', () => {
      const writableList = assemblePropertyList(makeDescriptor({ writable: 'wiring' }), new ArrayStore(abcItems), {
        writable: true
      });
      writableList.add({ key: 'd', value: '4' });
      expect(writableList.get('d')).toBe('4');

      const readonlyList = assemblePropertyList(makeDescriptor({ writable: 'wiring' }), new ArrayStore(abcItems), {
        writable: false
      });
      expect(() => readonlyList.add({ key: 'd', value: '4' })).toThrow('add() is not available — this list is read-only');
    });

    test('extras are attached ungated', () => {
      const store = new ArrayStore(abcItems);
      store.jar = () => 'the-jar';
      const list = assemblePropertyList(makeDescriptor({ writable: false, extras: ['jar'] }), store);
      expect(list.jar()).toBe('the-jar');
    });

    test('attached methods are non-enumerable', () => {
      const list = makeList(abcItems);
      expect(Object.keys(list)).toEqual([]);
    });
  });

  describe('isPropertyList', () => {
    test('returns true for assembled lists', () => {
      expect(PropertyList.isPropertyList(makeList([]))).toBe(true);
    });

    test('returns false for plain objects', () => {
      expect(PropertyList.isPropertyList({})).toBe(false);
      expect(PropertyList.isPropertyList(null)).toBe(false);
      expect(PropertyList.isPropertyList([])).toBe(false);
      expect(PropertyList.isPropertyList('string')).toBe(false);
    });
  });
});
