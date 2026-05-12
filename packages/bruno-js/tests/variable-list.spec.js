const VariableList = require('../src/variable-list');

describe('VariableList', () => {
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

    test('unset() throws for filtered keys', () => {
      expect(() => list.unset('__name__')).toThrow('reserved internal variable');
      expect(vars.__name__).toBe('dev');
    });

    test('get() still returns filtered keys (direct access)', () => {
      // get() reads directly from the object, filterKeys only affects has/toObject/toJSON/clear
      const interpolated = new VariableList(vars, {
        interpolateFn: (v) => v,
        filterKeys: ['__name__']
      });
      expect(interpolated.get('__name__')).toBe('dev');
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
