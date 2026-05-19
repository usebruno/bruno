const VariableList = require('../src/variable-list');

describe('VariableList', () => {
  // ── Array behavior ──────────────────────────────────────────────────

  describe('array fundamentals', () => {
    test('is a real Array', () => {
      const list = new VariableList({ host: 'example.com', port: '8080' });
      expect(Array.isArray(list)).toBe(true);
      expect(list instanceof Array).toBe(true);
    });

    test('length reflects entry count', () => {
      const list = new VariableList({ a: '1', b: '2', c: '3' });
      expect(list.length).toBe(3);
    });

    test('entries are {key, value} objects', () => {
      const list = new VariableList({ host: 'example.com' });
      expect(list[0]).toEqual({ key: 'host', value: 'example.com' });
    });

    test('standard array methods work (filter, map, forEach, find)', () => {
      const list = new VariableList({ a: '1', b: '2', c: '3' });
      const filtered = list.filter((e) => e.key !== 'b');
      expect(filtered).toEqual([{ key: 'a', value: '1' }, { key: 'c', value: '3' }]);

      const keys = list.map((e) => e.key);
      expect(keys).toEqual(['a', 'b', 'c']);

      const found = list.find((e) => e.key === 'b');
      expect(found).toEqual({ key: 'b', value: '2' });

      const collected = [];
      list.forEach((e) => collected.push(e.key));
      expect(collected).toEqual(['a', 'b', 'c']);
    });

    test('Symbol.species ensures derived methods return plain Arrays', () => {
      const list = new VariableList({ a: '1', b: '2' });
      const filtered = list.filter((e) => e.key === 'a');
      expect(filtered instanceof VariableList).toBe(false);
      expect(Array.isArray(filtered)).toBe(true);
    });

    test('excludes filterKeys from array entries', () => {
      const list = new VariableList(
        { __name__: 'dev', host: 'example.com', port: '8080' },
        { filterKeys: ['__name__'] }
      );
      expect(list.length).toBe(2);
      expect(list.map((e) => e.key)).toEqual(['host', 'port']);
    });
  });

  // ── Basic CRUD ────────────────────────────────────────────────────────

  describe('get / set / has / delete', () => {
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

    test('set() increases array length', () => {
      const before = list.length;
      list.set('newKey', 'newValue');
      expect(list.length).toBe(before + 1);
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

    test('has(key, value) returns true when value matches', () => {
      expect(list.has('host', 'example.com')).toBe(true);
    });

    test('has(key, value) returns false when value does not match', () => {
      expect(list.has('host', 'other.com')).toBe(false);
    });

    test('has(key, value) returns false for missing key', () => {
      expect(list.has('missing', 'anything')).toBe(false);
    });

    test('has(key, undefined) distinguishes from has(key)', () => {
      list.set('nullish', undefined);
      expect(list.has('nullish')).toBe(true);
      expect(list.has('nullish', undefined)).toBe(true);
      expect(list.has('nullish', null)).toBe(false);
    });

    test('delete() removes key from underlying object', () => {
      list.delete('host');
      expect(vars.host).toBeUndefined();
      expect(list.has('host')).toBe(false);
    });

    test('delete() decreases array length', () => {
      const before = list.length;
      list.delete('host');
      expect(list.length).toBe(before - 1);
    });

    test('delete() is a no-op for missing key', () => {
      list.delete('nonexistent');
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
      expect(list.length).toBe(0);
    });

    test('preserves filterKeys in backing object but not in array', () => {
      const vars = { __name__: 'dev', host: 'example.com', port: '8080' };
      const list = new VariableList(vars, { filterKeys: ['__name__'] });
      list.clear();
      expect(vars.__name__).toBe('dev');
      expect(vars.host).toBeUndefined();
      expect(vars.port).toBeUndefined();
      expect(list.length).toBe(0);
    });
  });

  // ── toObject ───────────────────────────────────────────────────────────

  describe('toObject', () => {
    test('toObject() returns plain { key: value } map', () => {
      const list = new VariableList({ a: '1', b: '2', c: '3' });
      expect(list.toObject()).toEqual({ a: '1', b: '2', c: '3' });
    });

    test('toObject() excludes filterKeys', () => {
      const list = new VariableList(
        { __name__: 'dev', host: 'example.com' },
        { filterKeys: ['__name__'] }
      );
      expect(list.toObject()).toEqual({ host: 'example.com' });
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

    test('has() returns false for filtered keys', () => {
      expect(list.has('__name__')).toBe(false);
      expect(list.has('host')).toBe(true);
    });

    test('set() throws for filtered keys', () => {
      expect(() => list.set('__name__', 'overwritten')).toThrow('reserved internal variable');
      expect(vars.__name__).toBe('dev');
    });

    test('delete() throws for filtered keys', () => {
      expect(() => list.delete('__name__')).toThrow('reserved internal variable');
      expect(vars.__name__).toBe('dev');
    });

    test('filtered keys are not in the array', () => {
      expect(list.find((e) => e.key === '__name__')).toBeUndefined();
    });
  });

  // ── Cross-path mutation visibility ────────────────────────────────────

  describe('shared underlying object', () => {
    test('mutations via VariableList are visible on the original object', () => {
      const vars = { x: '10' };
      const list = new VariableList(vars);
      list.set('y', '20');
      expect(vars.y).toBe('20');
      list.delete('x');
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
