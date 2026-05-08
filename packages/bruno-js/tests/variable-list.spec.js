const VariableList = require('../src/variable-list');
const PropertyList = require('../src/property-list');
const ReadOnlyPropertyList = require('../src/readonly-property-list');

describe('VariableList', () => {
  // ── Inheritance ───────────────────────────────────────────────────────

  test('instanceof PropertyList and ReadOnlyPropertyList', () => {
    const list = new VariableList({});
    expect(list).toBeInstanceOf(PropertyList);
    expect(list).toBeInstanceOf(ReadOnlyPropertyList);
  });

  // ── Basic CRUD ────────────────────────────────────────────────────────

  describe('get / set / has / unset', () => {
    let vars;
    let list;

    beforeEach(() => {
      vars = { host: 'example.com', port: '8080' };
      list = new VariableList(vars, {
        interpolateFn: (val) => val
      });
    });

    test('get() returns value from underlying object', () => {
      expect(list.get('host')).toBe('example.com');
      expect(list.get('port')).toBe('8080');
    });

    test('get() returns undefined for missing key', () => {
      expect(list.get('missing')).toBeUndefined();
    });

    test('get() uses interpolateFn', () => {
      const interpolated = new VariableList({ url: '{{host}}/api' }, {
        interpolateFn: (val) => typeof val === 'string' ? val.replace('{{host}}', 'example.com') : val
      });
      expect(interpolated.get('url')).toBe('example.com/api');
    });

    test('set() writes to underlying object', () => {
      list.set('newKey', 'newValue');
      expect(vars.newKey).toBe('newValue');
      expect(list.get('newKey')).toBe('newValue');
    });

    test('set() throws on empty key', () => {
      expect(() => list.set('', 'value')).toThrow('without specifying a name');
    });

    test('set() validates key format', () => {
      expect(() => list.set('invalid key!', 'value')).toThrow('invalid characters');
    });

    test('set() allows valid key characters', () => {
      list.set('my-var_name.v2', 'ok');
      expect(vars['my-var_name.v2']).toBe('ok');
    });

    test('has() returns true for existing key', () => {
      expect(list.has('host')).toBe(true);
    });

    test('has() returns false for missing key', () => {
      expect(list.has('missing')).toBe(false);
    });

    test('unset() removes key from underlying object', () => {
      list.unset('host');
      expect(vars.host).toBeUndefined();
      expect(list.has('host')).toBe(false);
    });

    test('unset() is a no-op for missing key', () => {
      list.unset('nonexistent');
      expect(Object.keys(vars)).toEqual(['host', 'port']);
    });
  });

  // ── clear ─────────────────────────────────────────────────────────────

  describe('clear', () => {
    test('removes all keys from underlying object', () => {
      const vars = { a: '1', b: '2', c: '3' };
      const list = new VariableList(vars);
      list.clear();
      expect(Object.keys(vars)).toEqual([]);
    });

    test('preserves filterKeys', () => {
      const vars = { __name__: 'dev', host: 'example.com', port: '8080' };
      const list = new VariableList(vars, { filterKeys: ['__name__'] });
      list.clear();
      expect(vars.__name__).toBe('dev');
      expect(vars.host).toBeUndefined();
      expect(vars.port).toBeUndefined();
    });
  });

  // ── filterKeys ────────────────────────────────────────────────────────

  describe('filterKeys', () => {
    let vars;
    let list;

    beforeEach(() => {
      vars = { __name__: 'dev', host: 'example.com', port: '8080' };
      list = new VariableList(vars, { filterKeys: ['__name__'] });
    });

    test('toObject() excludes filtered keys', () => {
      expect(list.toObject()).toEqual({ host: 'example.com', port: '8080' });
    });

    test('all() excludes filtered keys', () => {
      const items = list.all();
      expect(items).toHaveLength(2);
      expect(items.find((i) => i.key === '__name__')).toBeUndefined();
    });

    test('count() excludes filtered keys', () => {
      expect(list.count()).toBe(2);
    });

    test('has() still checks filtered keys via dataSource', () => {
      // __name__ is filtered from reads, so has() won't find it
      expect(list.has('__name__')).toBe(false);
      expect(list.has('host')).toBe(true);
    });
  });

  // ── ReadOnlyPropertyList inherited methods ────────────────────────────

  describe('inherited read methods', () => {
    let list;

    beforeEach(() => {
      list = new VariableList({ a: '1', b: '2', c: '3' }, {
        interpolateFn: (val) => val
      });
    });

    test('one() returns full item object', () => {
      expect(list.one('b')).toEqual({ key: 'b', value: '2' });
    });

    test('one() returns undefined for missing key', () => {
      expect(list.one('missing')).toBeUndefined();
    });

    test('all() returns array of { key, value } items', () => {
      const items = list.all();
      expect(items).toHaveLength(3);
      expect(items).toEqual([
        { key: 'a', value: '1' },
        { key: 'b', value: '2' },
        { key: 'c', value: '3' }
      ]);
    });

    test('idx() returns item by position', () => {
      expect(list.idx(1)).toEqual({ key: 'b', value: '2' });
    });

    test('count() returns number of items', () => {
      expect(list.count()).toBe(3);
    });

    test('indexOf() finds item by structural equality', () => {
      expect(list.indexOf({ key: 'b', value: '2' })).toBe(1);
      expect(list.indexOf({ key: 'missing', value: 'x' })).toBe(-1);
    });

    test('toObject() returns plain { key: value } map', () => {
      expect(list.toObject()).toEqual({ a: '1', b: '2', c: '3' });
    });

    test('toString() returns "key=value; ..." format', () => {
      expect(list.toString()).toBe('a=1; b=2; c=3');
    });

    test('toJSON() returns same as all()', () => {
      expect(list.toJSON()).toEqual(list.all());
    });
  });

  // ── Iteration methods ─────────────────────────────────────────────────

  describe('iteration methods', () => {
    let list;

    beforeEach(() => {
      list = new VariableList({ a: '1', b: '2', c: '3' }, {
        interpolateFn: (val) => val
      });
    });

    test('each() iterates over all items', () => {
      const keys = [];
      list.each((item) => keys.push(item.key));
      expect(keys).toEqual(['a', 'b', 'c']);
    });

    test('map() transforms items', () => {
      const values = list.map((item) => item.value);
      expect(values).toEqual(['1', '2', '3']);
    });

    test('filter() selects matching items', () => {
      const filtered = list.filter((item) => item.key !== 'b');
      expect(filtered).toHaveLength(2);
      expect(filtered.map((i) => i.key)).toEqual(['a', 'c']);
    });

    test('find() returns first match', () => {
      const found = list.find((item) => item.value === '2');
      expect(found).toEqual({ key: 'b', value: '2' });
    });

    test('reduce() accumulates values', () => {
      const sum = list.reduce((acc, item) => acc + Number(item.value), 0);
      expect(sum).toBe(6);
    });
  });

  // ── Cross-path mutation visibility ────────────────────────────────────

  describe('shared underlying object', () => {
    test('mutations via VariableList are visible on the original object', () => {
      const vars = { x: '10' };
      const list = new VariableList(vars);
      list.set('y', '20');
      expect(vars.y).toBe('20');
      list.unset('x');
      expect(vars.x).toBeUndefined();
    });

    test('mutations on the original object are visible via VariableList', () => {
      const vars = { x: '10' };
      const list = new VariableList(vars, { interpolateFn: (v) => v });
      vars.y = '20';
      expect(list.get('y')).toBe('20');
      expect(list.has('y')).toBe(true);
      delete vars.x;
      expect(list.has('x')).toBe(false);
    });
  });

  // ── Custom validateKey ────────────────────────────────────────────────

  describe('custom validateKey', () => {
    test('uses custom validator when provided', () => {
      const list = new VariableList({}, {
        validateKey: (key) => {
          if (key.startsWith('_')) throw new Error('No leading underscores');
        }
      });
      expect(() => list.set('_bad', 'val')).toThrow('No leading underscores');
      expect(() => list.set('good', 'val')).not.toThrow();
    });
  });
});
