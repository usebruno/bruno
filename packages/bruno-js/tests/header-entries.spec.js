const {
  reconcileHeaderEntries,
  projectHeaderEntries,
  liveHeaderEntries,
  snapshotHeaderEntries
} = require('../src/utils/header-entries');

describe('header entries', () => {
  describe('reconcileHeaderEntries (object → entries)', () => {
    test('removes enabled entries whose key left the object', () => {
      const entries = [{ key: 'A', value: '1' }, { key: 'B', value: '2' }];
      reconcileHeaderEntries(entries, { B: '2' });
      expect(entries).toEqual([{ key: 'B', value: '2' }]);
    });

    test('updates the value of an entry the object changed, keeping its position', () => {
      const entries = [{ key: 'A', value: '1' }, { key: 'B', value: '2' }];
      reconcileHeaderEntries(entries, { A: 'changed', B: '2' });
      expect(entries).toEqual([{ key: 'A', value: 'changed' }, { key: 'B', value: '2' }]);
    });

    test('appends object keys that have no enabled entry', () => {
      const entries = [{ key: 'A', value: '1' }];
      reconcileHeaderEntries(entries, { A: '1', Authorization: 'Bearer x' });
      expect(entries).toEqual([{ key: 'A', value: '1' }, { key: 'Authorization', value: 'Bearer x' }]);
    });

    test('never touches disabled entries', () => {
      const entries = [{ key: 'A', value: '1', disabled: true }, { key: 'B', value: '2' }];
      reconcileHeaderEntries(entries, { B: '2' });
      expect(entries).toEqual([{ key: 'A', value: '1', disabled: true }, { key: 'B', value: '2' }]);
    });

    test('compares keys exactly: a re-cased object key is a new entry', () => {
      const entries = [{ key: 'X-Token', value: '1' }];
      reconcileHeaderEntries(entries, { 'x-token': '1' });
      expect(entries).toEqual([{ key: 'x-token', value: '1' }]);
    });

    test('returns the same array', () => {
      const entries = [];
      expect(reconcileHeaderEntries(entries, { A: '1' })).toBe(entries);
    });
  });

  describe('projectHeaderEntries (entries → object)', () => {
    test('sets enabled entries and deletes keys no enabled entry backs', () => {
      const headers = { Stale: 'x', A: 'old' };
      projectHeaderEntries([{ key: 'A', value: 'new' }, { key: 'B', value: '2' }], headers);
      expect(headers).toEqual({ A: 'new', B: '2' });
    });

    test('skips disabled entries and removes their key from the object', () => {
      const headers = { A: '1' };
      projectHeaderEntries([{ key: 'A', value: '1', disabled: true }], headers);
      expect(headers).toEqual({});
    });

    test('keeps the object identity', () => {
      const headers = {};
      expect(projectHeaderEntries([{ key: 'A', value: '1' }], headers)).toBe(headers);
    });

    test('a key named __proto__ becomes an own property, not the prototype', () => {
      const headers = {};
      projectHeaderEntries([{ key: '__proto__', value: 'polluted' }], headers);
      expect(Object.keys(headers)).toEqual(['__proto__']);
      expect(Object.getPrototypeOf(headers)).toBe(Object.prototype);
      expect(headers['__proto__']).toBe('polluted');
    });
  });

  describe('liveHeaderEntries', () => {
    test('creates both views on a bare request and seeds entries from the object', () => {
      const request = { headers: { A: '1' } };
      const entries = liveHeaderEntries(request);
      expect(entries).toBe(request.headerEntries);
      expect(entries).toEqual([{ key: 'A', value: '1' }]);
    });

    test('creates an empty object and array when the request has neither', () => {
      const request = {};
      expect(liveHeaderEntries(request)).toEqual([]);
      expect(request.headers).toEqual({});
      expect(request.headerEntries).toEqual([]);
    });
  });

  describe('snapshotHeaderEntries', () => {
    test('maps display rows to { key, value }', () => {
      expect(snapshotHeaderEntries([{ name: 'a', value: '1' }])).toEqual([{ key: 'a', value: '1' }]);
    });

    test('maps a plain object to { key, value }', () => {
      expect(snapshotHeaderEntries({ a: '1' })).toEqual([{ key: 'a', value: '1' }]);
    });

    test('anything else is an empty list', () => {
      expect(snapshotHeaderEntries(undefined)).toEqual([]);
      expect(snapshotHeaderEntries(null)).toEqual([]);
      expect(snapshotHeaderEntries('a: 1')).toEqual([]);
    });
  });
});
