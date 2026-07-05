const PropertyList = require('../src/property-list');
const ReadOnlyPropertyList = require('../src/readonly-property-list');

describe('PropertyList', () => {
  // ── Inheritance ───────────────────────────────────────────────────────

  test('instanceof ReadOnlyPropertyList', () => {
    const list = new PropertyList({ items: [] });
    expect(list).toBeInstanceOf(ReadOnlyPropertyList);
    expect(list).toBeInstanceOf(PropertyList);
  });

  test('isPropertyList() returns true', () => {
    const list = new PropertyList({ items: [] });
    expect(ReadOnlyPropertyList.isPropertyList(list)).toBe(true);
  });

  // ── Static Mode Mutations ─────────────────────────────────────────────

  describe('static mode', () => {
    let list;

    beforeEach(() => {
      list = new PropertyList({
        items: [
          { key: 'a', value: '1' },
          { key: 'b', value: '2' },
          { key: 'c', value: '3' }
        ]
      });
    });

    // ── add / append ──

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

    // ── prepend ──

    test('prepend() inserts item at beginning', () => {
      list.prepend({ key: 'z', value: '0' });
      expect(list.count()).toBe(4);
      expect(list.idx(0)).toEqual({ key: 'z', value: '0' });
      expect(list.idx(1)).toEqual({ key: 'a', value: '1' });
    });

    // ── insert ──

    test('insert() before key string', () => {
      list.insert({ key: 'x', value: '9' }, 'b');
      expect(list.count()).toBe(4);
      expect(list.idx(1)).toEqual({ key: 'x', value: '9' });
      expect(list.idx(2)).toEqual({ key: 'b', value: '2' });
    });

    test('insert() before item object', () => {
      list.insert({ key: 'x', value: '9' }, { key: 'c', value: '3' });
      expect(list.count()).toBe(4);
      expect(list.idx(2)).toEqual({ key: 'x', value: '9' });
      expect(list.idx(3)).toEqual({ key: 'c', value: '3' });
    });

    test('insert() appends when reference not found', () => {
      list.insert({ key: 'x', value: '9' }, 'missing');
      expect(list.count()).toBe(4);
      expect(list.idx(3)).toEqual({ key: 'x', value: '9' });
    });

    // ── insertAfter ──

    test('insertAfter() after key string', () => {
      list.insertAfter({ key: 'x', value: '9' }, 'a');
      expect(list.count()).toBe(4);
      expect(list.idx(0)).toEqual({ key: 'a', value: '1' });
      expect(list.idx(1)).toEqual({ key: 'x', value: '9' });
      expect(list.idx(2)).toEqual({ key: 'b', value: '2' });
    });

    test('insertAfter() after item object', () => {
      list.insertAfter({ key: 'x', value: '9' }, { key: 'b', value: '2' });
      expect(list.count()).toBe(4);
      expect(list.idx(1)).toEqual({ key: 'b', value: '2' });
      expect(list.idx(2)).toEqual({ key: 'x', value: '9' });
    });

    test('insertAfter() appends when reference not found', () => {
      list.insertAfter({ key: 'x', value: '9' }, 'missing');
      expect(list.count()).toBe(4);
      expect(list.idx(3)).toEqual({ key: 'x', value: '9' });
    });

    // ── remove ──

    test('remove() by predicate', () => {
      list.remove((item) => item.value === '2');
      expect(list.count()).toBe(2);
      expect(list.has('b')).toBe(false);
    });

    test('remove() by key string', () => {
      list.remove('a');
      expect(list.count()).toBe(2);
      expect(list.has('a')).toBe(false);
    });

    test('remove() by item object', () => {
      list.remove({ key: 'c', value: '3' });
      expect(list.count()).toBe(2);
      expect(list.has('c')).toBe(false);
    });

    test('remove() by item object that does not exist is no-op', () => {
      list.remove({ key: 'missing', value: '0' });
      expect(list.count()).toBe(3);
    });

    // ── clear ──

    test('clear() empties the list', () => {
      list.clear();
      expect(list.count()).toBe(0);
      expect(list.all()).toEqual([]);
    });

    // ── upsert ──

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

    // ── populate ──

    test('populate() replaces all items', () => {
      list.populate([{ key: 'x', value: '10' }]);
      expect(list.count()).toBe(1);
      expect(list.get('x')).toBe('10');
    });

    test('populate() with non-array sets empty list', () => {
      list.populate(null);
      expect(list.count()).toBe(0);
    });

    // ── repopulate ──

    test('repopulate() clears and replaces', () => {
      list.repopulate([{ key: 'y', value: '20' }]);
      expect(list.count()).toBe(1);
      expect(list.get('y')).toBe('20');
    });

    test('repopulate() with non-array sets empty list', () => {
      list.repopulate(undefined);
      expect(list.count()).toBe(0);
    });

    // ── assimilate ──

    test('assimilate() merges from array', () => {
      list.assimilate([{ key: 'd', value: '4' }]);
      expect(list.count()).toBe(4);
      expect(list.get('d')).toBe('4');
    });

    test('assimilate() merges from PropertyList', () => {
      const source = new PropertyList({
        items: [{ key: 'd', value: '4' }]
      });
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

  // ── Dynamic Mode ──────────────────────────────────────────────────────

  describe('dynamic mode', () => {
    let list;

    beforeEach(() => {
      list = new PropertyList({
        dataSource: () => [{ key: 'x', value: '10' }]
      });
    });

    test.each([
      ['add', 'add'],
      ['append', 'add'],
      ['prepend', 'prepend'],
      ['insert', 'insert'],
      ['insertAfter', 'insertAfter'],
      ['remove', 'remove'],
      ['clear', 'clear'],
      ['upsert', 'upsert'],
      ['populate', 'populate'],
      ['repopulate', 'repopulate'],
      ['assimilate', 'assimilate']
    ])('%s() throws in dynamic mode', (method, errorMethod) => {
      expect(() => list[method]({ key: 'a', value: '1' })).toThrow(
        `${errorMethod}() is not supported in dynamic mode. Override in subclass.`
      );
    });

    test('read methods still work', () => {
      expect(list.get('x')).toBe('10');
      expect(list.count()).toBe(1);
    });
  });
});
