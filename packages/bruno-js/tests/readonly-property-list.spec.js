const ReadOnlyPropertyList = require('../src/readonly-property-list');

describe('ReadOnlyPropertyList', () => {
  // ── Static Mode ──────────────────────────────────────────────────────

  describe('static mode', () => {
    let list;

    beforeEach(() => {
      list = new ReadOnlyPropertyList({
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

    test('toObject() converts to key-value object', () => {
      expect(list.toObject()).toEqual({ a: '1', b: '2', c: '3' });
    });

    test('toString() converts to string', () => {
      expect(list.toString()).toBe('a=1; b=2; c=3');
    });
  });

  // ── Dynamic Mode ─────────────────────────────────────────────────────

  describe('dynamic mode', () => {
    test('reads from dataSource on every call', () => {
      let callCount = 0;
      const list = new ReadOnlyPropertyList({
        dataSource: () => {
          callCount++;
          return [
            { key: 'x', value: '10' },
            { key: 'y', value: '20' }
          ];
        }
      });

      expect(list.get('x')).toBe('10');
      expect(list.count()).toBe(2);
      expect(list.all()).toHaveLength(2);
      expect(callCount).toBe(3);
    });
  });

  // ── No Mutation Methods ──────────────────────────────────────────────

  describe('does not have mutation methods', () => {
    const list = new ReadOnlyPropertyList({ items: [] });

    test.each([
      'add', 'prepend', 'insert', 'insertAfter',
      'upsert', 'remove', 'clear',
      'populate', 'repopulate', 'assimilate'
    ])('%s is not defined', (method) => {
      expect(list[method]).toBeUndefined();
    });
  });

  // ── Edge Cases ───────────────────────────────────────────────────────

  describe('edge cases', () => {
    test('empty list', () => {
      const list = new ReadOnlyPropertyList({ items: [] });
      expect(list.count()).toBe(0);
      expect(list.toObject()).toEqual({});
    });

    test('default constructor', () => {
      const list = new ReadOnlyPropertyList();
      expect(list.count()).toBe(0);
    });

    test('custom keyProperty', () => {
      const list = new ReadOnlyPropertyList({
        keyProperty: 'name',
        items: [{ name: 'Content-Type', value: 'application/json' }]
      });
      expect(list.get('Content-Type')).toBe('application/json');
    });
  });
});
