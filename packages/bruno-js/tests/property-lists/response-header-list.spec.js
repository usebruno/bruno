const { PropertyList } = require('../../src/property-lists/property-list');
const BrunoResponse = require('../../src/bruno-response');

describe('res.headerList property list', () => {
  const defaultHeaders = {
    'content-type': 'application/json',
    'x-request-id': 'abc-123',
    'cache-control': 'no-cache'
  };

  function createResHeaders(headers = defaultHeaders) {
    const rawRes = {
      status: 200,
      statusText: 'OK',
      headers: { ...headers },
      data: '{"ok":true}',
      responseTime: 42
    };
    const brunoRes = new BrunoResponse(rawRes);
    return { headerList: brunoRes.headerList, brunoRes, rawRes };
  }

  test('is a PropertyList', () => {
    const { headerList } = createResHeaders();
    expect(PropertyList.isPropertyList(headerList)).toBe(true);
  });

  // ── Read methods ──────────────────────────────────────────────────────

  describe('read methods', () => {
    test('get() returns header value by key', () => {
      const { headerList } = createResHeaders();
      expect(headerList.get('content-type')).toBe('application/json');
      expect(headerList.get('x-request-id')).toBe('abc-123');
    });

    test('get() returns undefined for missing header', () => {
      const { headerList } = createResHeaders();
      expect(headerList.get('X-Missing')).toBeUndefined();
    });

    test('one() returns full header object', () => {
      const { headerList } = createResHeaders();
      expect(headerList.one('content-type')).toEqual({ key: 'content-type', value: 'application/json' });
    });

    test('all() returns array of { key, value } objects', () => {
      const { headerList } = createResHeaders();
      const all = headerList.all();
      expect(all).toHaveLength(3);
      expect(all).toEqual([
        { key: 'content-type', value: 'application/json' },
        { key: 'x-request-id', value: 'abc-123' },
        { key: 'cache-control', value: 'no-cache' }
      ]);
    });

    test('idx() returns the header at a position', () => {
      const { headerList } = createResHeaders();
      expect(headerList.idx(0)).toEqual({ key: 'content-type', value: 'application/json' });
      expect(headerList.idx(10)).toBeUndefined();
    });

    test('count() returns number of headers', () => {
      const { headerList } = createResHeaders();
      expect(headerList.count()).toBe(3);
    });

    test('indexOf() finds structurally-equal header', () => {
      const { headerList } = createResHeaders();
      expect(headerList.indexOf({ key: 'content-type', value: 'application/json' })).toBe(0);
    });
  });

  // ── Search methods ────────────────────────────────────────────────────

  describe('search methods', () => {
    test('has() checks key existence', () => {
      const { headerList } = createResHeaders();
      expect(headerList.has('content-type')).toBe(true);
      expect(headerList.has('X-Missing')).toBe(false);
    });

    test('has() checks key and value', () => {
      const { headerList } = createResHeaders();
      expect(headerList.has('content-type', 'application/json')).toBe(true);
      expect(headerList.has('content-type', 'text/plain')).toBe(false);
    });

    test('find() returns first matching header', () => {
      const { headerList } = createResHeaders();
      const found = headerList.find((h) => h.key.startsWith('x-'));
      expect(found).toEqual({ key: 'x-request-id', value: 'abc-123' });
    });

    test('filter() returns matching headers', () => {
      const { headerList } = createResHeaders();
      const result = headerList.filter((h) => h.key.includes('-'));
      expect(result).toHaveLength(3);
    });
  });

  // ── Iteration methods ─────────────────────────────────────────────────

  describe('iteration methods', () => {
    test('each() iterates over all headers', () => {
      const { headerList } = createResHeaders();
      const keys = [];
      headerList.each((h) => keys.push(h.key));
      expect(keys).toEqual(['content-type', 'x-request-id', 'cache-control']);
    });

    test('map() transforms headers', () => {
      const { headerList } = createResHeaders();
      const values = headerList.map((h) => h.value);
      expect(values).toEqual(['application/json', 'abc-123', 'no-cache']);
    });

    test('reduce() accumulates headers', () => {
      const { headerList } = createResHeaders();
      const result = headerList.reduce((acc, h) => {
        acc[h.key] = h.value;
        return acc;
      }, {});
      expect(result).toEqual(defaultHeaders);
    });
  });

  // ── Transform methods ─────────────────────────────────────────────────

  describe('transform methods', () => {
    test('toObject() returns plain key-value map', () => {
      const { headerList } = createResHeaders();
      expect(headerList.toObject()).toEqual(defaultHeaders);
    });

    test('toString() returns HTTP wire format with trailing newline', () => {
      const { headerList } = createResHeaders({ a: '1', b: '2' });
      expect(headerList.toString()).toBe('a: 1\nb: 2\n');
    });

    test('toJSON() returns same as all()', () => {
      const { headerList } = createResHeaders();
      expect(headerList.toJSON()).toEqual(headerList.all());
    });
  });

  // ── res.headers is the raw headers object ─────────────────────────────

  describe('res.headers (raw object access)', () => {
    test('res.headers returns the raw headers object', () => {
      const rawRes = { status: 200, statusText: 'OK', headers: { 'content-type': 'text/html' }, data: null };
      const brunoRes = new BrunoResponse(rawRes);
      expect(brunoRes.headers['content-type']).toBe('text/html');
    });

    test('bracket access works for any header name including method names', () => {
      const rawRes = { status: 200, statusText: 'OK', headers: { filter: 'my-value' }, data: null };
      const brunoRes = new BrunoResponse(rawRes);
      expect(brunoRes.headers['filter']).toBe('my-value');
    });
  });

  // ── Edge cases ────────────────────────────────────────────────────────

  describe('edge cases', () => {
    test('works with empty headers', () => {
      const { headerList } = createResHeaders({});
      expect(headerList.count()).toBe(0);
      expect(headerList.all()).toEqual([]);
      expect(headerList.toObject()).toEqual({});
    });

    test('works with null response', () => {
      const brunoRes = new BrunoResponse(null);
      expect(brunoRes.headerList.count()).toBe(0);
      expect(brunoRes.headerList.all()).toEqual([]);
    });

    test('response headers are read-only (write methods throw)', () => {
      const { headerList } = createResHeaders();
      expect(() => headerList.add({ key: 'X-New', value: 'val' })).toThrow('read-only');
      expect(() => headerList.remove('content-type')).toThrow('read-only');
      expect(() => headerList.clear()).toThrow('read-only');
      expect(() => headerList.upsert({ key: 'X-New', value: 'val' })).toThrow('read-only');
      expect(() => headerList.populate([])).toThrow('read-only');
      expect(() => headerList.assimilate([])).toThrow('read-only');
    });

    test('response headers repopulate throws read-only', () => {
      const { headerList } = createResHeaders();
      expect(() => headerList.repopulate([])).toThrow('read-only');
    });

    test('positional mutators throw the unordered error, before the readonly check', () => {
      const { headerList } = createResHeaders();
      for (const method of ['insert', 'insertAfter', 'prepend', 'append']) {
        expect(() => headerList[method]({ key: 'x', value: '1' })).toThrow(
          `${method}() is not available on res.headerList — response headers are a keyed map with no ordering`
        );
      }
    });

    test('case-insensitive reads work on response headers', () => {
      const { headerList } = createResHeaders();
      expect(headerList.get('CONTENT-TYPE')).toBe('application/json');
      expect(headerList.one('CONTENT-TYPE')).toEqual({ key: 'content-type', value: 'application/json' });
      expect(headerList.has('CONTENT-TYPE')).toBe(true);
      expect(headerList.indexOf('CONTENT-TYPE')).toBeGreaterThanOrEqual(0);
      expect(headerList.indexOf({ key: 'CONTENT-TYPE', value: 'application/json' })).toBeGreaterThanOrEqual(0);
    });
  });
});
