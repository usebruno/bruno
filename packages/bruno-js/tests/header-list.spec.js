const HeaderList = require('../src/header-list');
const PropertyList = require('../src/property-list');
const ReadOnlyPropertyList = require('../src/readonly-property-list');
const BrunoRequest = require('../src/bruno-request');
const BrunoResponse = require('../src/bruno-response');

describe('HeaderList (req.headers)', () => {
  const defaultHeaders = {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer token123',
    'Accept': '*/*'
  };

  function createReqHeaders(headers = defaultHeaders) {
    const rawReq = { url: 'https://example.com', method: 'GET', headers: { ...headers } };
    const brunoReq = new BrunoRequest(rawReq);
    return { list: brunoReq.headers, brunoReq, rawReq };
  }

  // ── Inheritance ────────────────────────────────────────────────────────

  test('extends PropertyList and ReadOnlyPropertyList', () => {
    const { list } = createReqHeaders();
    expect(list).toBeInstanceOf(ReadOnlyPropertyList);
    expect(list).toBeInstanceOf(PropertyList);
    expect(list).toBeInstanceOf(HeaderList);
  });

  test('ReadOnlyPropertyList.isPropertyList returns true', () => {
    const { list } = createReqHeaders();
    expect(ReadOnlyPropertyList.isPropertyList(list)).toBe(true);
  });

  // ── Read methods ──────────────────────────────────────────────────────

  describe('read methods', () => {
    test('get() returns header value by key', () => {
      const { list } = createReqHeaders();
      expect(list.get('Content-Type')).toBe('application/json');
      expect(list.get('Authorization')).toBe('Bearer token123');
    });

    test('get() returns undefined for missing header', () => {
      const { list } = createReqHeaders();
      expect(list.get('X-Missing')).toBeUndefined();
    });

    test('one() returns full header object', () => {
      const { list } = createReqHeaders();
      expect(list.one('Content-Type')).toEqual({ key: 'Content-Type', value: 'application/json' });
    });

    test('one() returns undefined for missing header', () => {
      const { list } = createReqHeaders();
      expect(list.one('X-Missing')).toBeUndefined();
    });

    test('all() returns array of { key, value } objects', () => {
      const { list } = createReqHeaders();
      const all = list.all();
      expect(all).toHaveLength(3);
      expect(all).toEqual([
        { key: 'Content-Type', value: 'application/json' },
        { key: 'Authorization', value: 'Bearer token123' },
        { key: 'Accept', value: '*/*' }
      ]);
    });

    test('all() returns a cloned array', () => {
      const { list } = createReqHeaders();
      const a1 = list.all();
      const a2 = list.all();
      expect(a1).not.toBe(a2);
    });

    test('idx() returns header at position', () => {
      const { list } = createReqHeaders();
      expect(list.idx(0)).toEqual({ key: 'Content-Type', value: 'application/json' });
      expect(list.idx(2)).toEqual({ key: 'Accept', value: '*/*' });
    });

    test('idx() returns undefined for out-of-bounds', () => {
      const { list } = createReqHeaders();
      expect(list.idx(10)).toBeUndefined();
    });

    test('count() returns number of headers', () => {
      const { list } = createReqHeaders();
      expect(list.count()).toBe(3);
    });

    test('indexOf() finds structurally-equal header', () => {
      const { list } = createReqHeaders();
      expect(list.indexOf({ key: 'Content-Type', value: 'application/json' })).toBe(0);
      expect(list.indexOf({ key: 'Accept', value: '*/*' })).toBe(2);
    });

    test('indexOf() returns -1 for non-matching header', () => {
      const { list } = createReqHeaders();
      expect(list.indexOf({ key: 'X-Missing', value: 'nope' })).toBe(-1);
    });
  });

  // ── Search methods ────────────────────────────────────────────────────

  describe('search methods', () => {
    test('has() checks key existence', () => {
      const { list } = createReqHeaders();
      expect(list.has('Content-Type')).toBe(true);
      expect(list.has('X-Missing')).toBe(false);
    });

    test('has() checks key and value', () => {
      const { list } = createReqHeaders();
      expect(list.has('Content-Type', 'application/json')).toBe(true);
      expect(list.has('Content-Type', 'text/plain')).toBe(false);
    });

    test('find() returns first matching header', () => {
      const { list } = createReqHeaders();
      const found = list.find((h) => h.key.startsWith('Auth'));
      expect(found).toEqual({ key: 'Authorization', value: 'Bearer token123' });
    });

    test('find() returns undefined when no match', () => {
      const { list } = createReqHeaders();
      expect(list.find((h) => h.key === 'X-Nope')).toBeUndefined();
    });

    test('filter() returns matching headers', () => {
      const { list } = createReqHeaders();
      const result = list.filter((h) => h.key.startsWith('A'));
      expect(result).toHaveLength(2);
      expect(result[0].key).toBe('Authorization');
      expect(result[1].key).toBe('Accept');
    });

    test('filter() returns empty array when no match', () => {
      const { list } = createReqHeaders();
      expect(list.filter((h) => h.key === 'X-Nope')).toEqual([]);
    });
  });

  // ── Iteration methods ─────────────────────────────────────────────────

  describe('iteration methods', () => {
    test('each() iterates over all headers', () => {
      const { list } = createReqHeaders();
      const keys = [];
      list.each((h) => keys.push(h.key));
      expect(keys).toEqual(['Content-Type', 'Authorization', 'Accept']);
    });

    test('map() transforms headers', () => {
      const { list } = createReqHeaders();
      const keys = list.map((h) => h.key);
      expect(keys).toEqual(['Content-Type', 'Authorization', 'Accept']);
    });

    test('reduce() accumulates headers', () => {
      const { list } = createReqHeaders();
      const result = list.reduce((acc, h) => {
        acc[h.key] = h.value;
        return acc;
      }, {});
      expect(result).toEqual(defaultHeaders);
    });

    test('reduce() works without initial value', () => {
      const { list } = createReqHeaders({ A: '1', B: '2' });
      const result = list.reduce((acc, h) => `${typeof acc === 'object' ? acc.key : acc},${h.key}`);
      expect(result).toBe('A,B');
    });
  });

  // ── Transform methods ─────────────────────────────────────────────────

  describe('transform methods', () => {
    test('toObject() returns plain key-value map', () => {
      const { list } = createReqHeaders();
      expect(list.toObject()).toEqual(defaultHeaders);
    });

    test('toString() returns semicolon-separated string', () => {
      const { list } = createReqHeaders({ A: '1', B: '2' });
      expect(list.toString()).toBe('A=1; B=2');
    });

    test('toJSON() returns same as all()', () => {
      const { list } = createReqHeaders();
      expect(list.toJSON()).toEqual(list.all());
    });
  });

  // ── Dynamic reads reflect external mutations ──────────────────────────

  describe('dynamic mode (reads reflect external mutations)', () => {
    test('reflects headers added via BrunoRequest.setHeader', () => {
      const { list, brunoReq } = createReqHeaders();
      expect(list.has('X-New')).toBe(false);
      brunoReq.setHeader('X-New', 'hello');
      expect(list.has('X-New')).toBe(true);
      expect(list.get('X-New')).toBe('hello');
    });

    test('reflects headers removed via BrunoRequest.deleteHeader', () => {
      const { list, brunoReq } = createReqHeaders();
      expect(list.has('Accept')).toBe(true);
      brunoReq.deleteHeader('Accept');
      expect(list.has('Accept')).toBe(false);
    });

    test('reflects headers replaced via BrunoRequest.setHeaders', () => {
      const { list, brunoReq } = createReqHeaders();
      expect(list.count()).toBe(3);
      brunoReq.setHeaders({ 'X-Only': 'one' });
      expect(list.count()).toBe(1);
      expect(list.get('X-Only')).toBe('one');
    });
  });

  // ── Write methods ─────────────────────────────────────────────────────

  describe('add()', () => {
    test('adds a new header to the request', () => {
      const { list, rawReq } = createReqHeaders();
      list.add({ key: 'X-Custom', value: 'test' });
      expect(rawReq.headers['X-Custom']).toBe('test');
      expect(list.get('X-Custom')).toBe('test');
    });

    test('overwrites existing header', () => {
      const { list, rawReq } = createReqHeaders();
      list.add({ key: 'Content-Type', value: 'text/plain' });
      expect(rawReq.headers['Content-Type']).toBe('text/plain');
    });

    test('ignores null/undefined/non-object input', () => {
      const { list } = createReqHeaders();
      const countBefore = list.count();
      list.add(null);
      list.add(undefined);
      list.add('not-an-object');
      expect(list.count()).toBe(countBefore);
    });

    test('ignores object without key property', () => {
      const { list } = createReqHeaders();
      const countBefore = list.count();
      list.add({ value: 'no-key' });
      expect(list.count()).toBe(countBefore);
    });
  });

  describe('upsert()', () => {
    test('sets a new header', () => {
      const { list, rawReq } = createReqHeaders();
      list.upsert({ key: 'X-New', value: 'val' });
      expect(rawReq.headers['X-New']).toBe('val');
    });

    test('replaces existing header', () => {
      const { list, rawReq } = createReqHeaders();
      list.upsert({ key: 'Content-Type', value: 'text/html' });
      expect(rawReq.headers['Content-Type']).toBe('text/html');
      expect(list.get('Content-Type')).toBe('text/html');
    });
  });

  describe('append(), prepend(), insert(), insertAfter()', () => {
    test('all delegate to add()', () => {
      const { list, rawReq } = createReqHeaders({});

      list.append({ key: 'A', value: '1' });
      expect(rawReq.headers['A']).toBe('1');

      list.prepend({ key: 'B', value: '2' });
      expect(rawReq.headers['B']).toBe('2');

      list.insert({ key: 'C', value: '3' });
      expect(rawReq.headers['C']).toBe('3');

      list.insertAfter({ key: 'D', value: '4' });
      expect(rawReq.headers['D']).toBe('4');
    });
  });

  describe('remove()', () => {
    test('removes header by key string', () => {
      const { list, rawReq } = createReqHeaders();
      list.remove('Accept');
      expect(rawReq.headers['Accept']).toBeUndefined();
      expect(list.has('Accept')).toBe(false);
    });

    test('removes header by predicate function', () => {
      const { list, rawReq } = createReqHeaders();
      list.remove((h) => h.key === 'Authorization');
      expect(rawReq.headers['Authorization']).toBeUndefined();
      expect(list.has('Authorization')).toBe(false);
    });

    test('removes header by object reference', () => {
      const { list, rawReq } = createReqHeaders();
      list.remove({ key: 'Accept', value: '*/*' });
      expect(rawReq.headers['Accept']).toBeUndefined();
    });

    test('removes multiple headers matching predicate', () => {
      const { list, rawReq } = createReqHeaders();
      list.remove((h) => h.key.startsWith('A'));
      expect(rawReq.headers['Authorization']).toBeUndefined();
      expect(rawReq.headers['Accept']).toBeUndefined();
      expect(rawReq.headers['Content-Type']).toBe('application/json');
    });

    test('tracks removed headers in __headersToDelete', () => {
      const { list, rawReq } = createReqHeaders();
      list.remove('Accept');
      expect(rawReq.__headersToDelete).toContain('Accept');
    });

    test('no-op for non-existent key', () => {
      const { list } = createReqHeaders();
      const countBefore = list.count();
      list.remove('X-Does-Not-Exist');
      expect(list.count()).toBe(countBefore);
    });
  });

  describe('clear()', () => {
    test('removes all headers', () => {
      const { list, rawReq } = createReqHeaders();
      list.clear();
      expect(list.count()).toBe(0);
      expect(list.all()).toEqual([]);
      expect(Object.keys(rawReq.headers)).toHaveLength(0);
    });

    test('tracks all removed headers in __headersToDelete', () => {
      const { list, rawReq } = createReqHeaders();
      list.clear();
      expect(rawReq.__headersToDelete).toContain('Content-Type');
      expect(rawReq.__headersToDelete).toContain('Authorization');
      expect(rawReq.__headersToDelete).toContain('Accept');
    });
  });

  describe('populate()', () => {
    test('replaces all headers with new set', () => {
      const { list, rawReq } = createReqHeaders();
      list.populate([
        { key: 'X-New', value: 'one' },
        { key: 'X-Other', value: 'two' }
      ]);
      expect(list.count()).toBe(2);
      expect(list.get('X-New')).toBe('one');
      expect(list.get('X-Other')).toBe('two');
      expect(rawReq.headers['Content-Type']).toBeUndefined();
    });

    test('handles empty array', () => {
      const { list } = createReqHeaders();
      list.populate([]);
      expect(list.count()).toBe(0);
    });

    test('handles non-array input', () => {
      const { list } = createReqHeaders();
      list.populate(null);
      expect(list.count()).toBe(0);
    });
  });

  describe('repopulate()', () => {
    test('delegates to populate()', () => {
      const { list } = createReqHeaders();
      list.repopulate([{ key: 'X-Only', value: 'val' }]);
      expect(list.count()).toBe(1);
      expect(list.get('X-Only')).toBe('val');
    });
  });

  describe('assimilate()', () => {
    test('merges from array without prune', () => {
      const { list } = createReqHeaders({ Existing: 'yes' });
      list.assimilate([{ key: 'New', value: 'val' }]);
      expect(list.has('Existing')).toBe(true);
      expect(list.has('New')).toBe(true);
    });

    test('merges from array with prune', () => {
      const { list } = createReqHeaders({ Existing: 'yes' });
      list.assimilate([{ key: 'New', value: 'val' }], true);
      expect(list.has('Existing')).toBe(false);
      expect(list.has('New')).toBe(true);
    });

    test('merges from another PropertyList', () => {
      const { list } = createReqHeaders({ A: '1' });
      const source = createReqHeaders({ B: '2' }).list;
      list.assimilate(source);
      expect(list.has('A')).toBe(true);
      expect(list.has('B')).toBe(true);
    });

    test('handles non-array, non-PropertyList source', () => {
      const { list } = createReqHeaders({ A: '1' });
      list.assimilate('not-valid');
      expect(list.count()).toBe(1);
    });
  });

  // ── Backward compatibility (bracket access) ────────────────────────

  describe('backward compatibility (bracket access)', () => {
    test('bracket read returns header value', () => {
      const { list } = createReqHeaders();
      expect(list['Content-Type']).toBe('application/json');
      expect(list['Authorization']).toBe('Bearer token123');
    });

    test('bracket read returns undefined for missing header', () => {
      const { list } = createReqHeaders();
      expect(list['X-Missing']).toBeUndefined();
    });

    test('bracket assignment sets header on raw request', () => {
      const { list, rawReq } = createReqHeaders();
      list['X-Custom'] = 'test';
      expect(rawReq.headers['X-Custom']).toBe('test');
      expect(list.get('X-Custom')).toBe('test');
    });

    test('bracket assignment overwrites existing header', () => {
      const { list, rawReq } = createReqHeaders();
      list['Content-Type'] = 'text/plain';
      expect(rawReq.headers['Content-Type']).toBe('text/plain');
    });

    test('delete operator removes header and tracks in __headersToDelete', () => {
      const { list, rawReq } = createReqHeaders();
      delete list['Accept'];
      expect(rawReq.headers['Accept']).toBeUndefined();
      expect(rawReq.__headersToDelete).toContain('Accept');
    });

    test('Object.keys() returns header names', () => {
      const { list } = createReqHeaders();
      expect(Object.keys(list)).toEqual(['Content-Type', 'Authorization', 'Accept']);
    });

    test('"in" operator checks header existence', () => {
      const { list } = createReqHeaders();
      expect('Content-Type' in list).toBe(true);
      expect('X-Missing' in list).toBe(false);
    });

    test('"in" operator also finds PropertyList methods', () => {
      const { list } = createReqHeaders();
      expect('get' in list).toBe(true);
      expect('all' in list).toBe(true);
    });

    test('PropertyList methods still work alongside bracket access', () => {
      const { list } = createReqHeaders();
      // Bracket access
      expect(list['Content-Type']).toBe('application/json');
      // PropertyList method
      expect(list.get('Content-Type')).toBe('application/json');
      // Both reflect the same data
      list.add({ key: 'X-New', value: 'val' });
      expect(list['X-New']).toBe('val');
    });
  });

  // ── Edge cases ────────────────────────────────────────────────────────

  describe('edge cases', () => {
    test('works with empty headers', () => {
      const { list } = createReqHeaders({});
      expect(list.count()).toBe(0);
      expect(list.all()).toEqual([]);
      expect(list.get('Anything')).toBeUndefined();
      expect(list.has('Anything')).toBe(false);
      expect(list.toObject()).toEqual({});
      expect(list.toString()).toBe('');
    });

    test('handles header values that are empty strings', () => {
      const { list } = createReqHeaders({ 'X-Empty': '' });
      expect(list.get('X-Empty')).toBe('');
      expect(list.has('X-Empty')).toBe(true);
      expect(list.has('X-Empty', '')).toBe(true);
    });

    test('req.headers is lazily created and cached', () => {
      const rawReq = { url: 'https://example.com', method: 'GET', headers: {} };
      const brunoReq = new BrunoRequest(rawReq);
      const list1 = brunoReq.headers;
      const list2 = brunoReq.headers;
      expect(list1).toBe(list2);
    });
  });
});

describe('Response Headers (res.headers)', () => {
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
    return { headers: brunoRes.headers, brunoRes, rawRes };
  }

  // ── Inheritance ────────────────────────────────────────────────────────

  test('is a ReadOnlyPropertyList', () => {
    const { headers } = createResHeaders();
    expect(headers).toBeInstanceOf(ReadOnlyPropertyList);
  });

  test('ReadOnlyPropertyList.isPropertyList returns true', () => {
    const { headers } = createResHeaders();
    expect(ReadOnlyPropertyList.isPropertyList(headers)).toBe(true);
  });

  // ── Read methods ──────────────────────────────────────────────────────

  describe('read methods', () => {
    test('get() returns header value by key', () => {
      const { headers } = createResHeaders();
      expect(headers.get('content-type')).toBe('application/json');
      expect(headers.get('x-request-id')).toBe('abc-123');
    });

    test('get() returns undefined for missing header', () => {
      const { headers } = createResHeaders();
      expect(headers.get('X-Missing')).toBeUndefined();
    });

    test('one() returns full header object', () => {
      const { headers } = createResHeaders();
      expect(headers.one('content-type')).toEqual({ key: 'content-type', value: 'application/json' });
    });

    test('all() returns array of { key, value } objects', () => {
      const { headers } = createResHeaders();
      const all = headers.all();
      expect(all).toHaveLength(3);
      expect(all).toEqual([
        { key: 'content-type', value: 'application/json' },
        { key: 'x-request-id', value: 'abc-123' },
        { key: 'cache-control', value: 'no-cache' }
      ]);
    });

    test('count() returns number of headers', () => {
      const { headers } = createResHeaders();
      expect(headers.count()).toBe(3);
    });

    test('idx() returns header at position', () => {
      const { headers } = createResHeaders();
      expect(headers.idx(1)).toEqual({ key: 'x-request-id', value: 'abc-123' });
    });

    test('indexOf() finds structurally-equal header', () => {
      const { headers } = createResHeaders();
      expect(headers.indexOf({ key: 'content-type', value: 'application/json' })).toBe(0);
    });
  });

  // ── Search methods ────────────────────────────────────────────────────

  describe('search methods', () => {
    test('has() checks key existence', () => {
      const { headers } = createResHeaders();
      expect(headers.has('content-type')).toBe(true);
      expect(headers.has('X-Missing')).toBe(false);
    });

    test('has() checks key and value', () => {
      const { headers } = createResHeaders();
      expect(headers.has('content-type', 'application/json')).toBe(true);
      expect(headers.has('content-type', 'text/plain')).toBe(false);
    });

    test('find() returns first matching header', () => {
      const { headers } = createResHeaders();
      const found = headers.find((h) => h.key.startsWith('x-'));
      expect(found).toEqual({ key: 'x-request-id', value: 'abc-123' });
    });

    test('filter() returns matching headers', () => {
      const { headers } = createResHeaders();
      const result = headers.filter((h) => h.key.includes('-'));
      expect(result).toHaveLength(3);
    });
  });

  // ── Iteration methods ─────────────────────────────────────────────────

  describe('iteration methods', () => {
    test('each() iterates over all headers', () => {
      const { headers } = createResHeaders();
      const keys = [];
      headers.each((h) => keys.push(h.key));
      expect(keys).toEqual(['content-type', 'x-request-id', 'cache-control']);
    });

    test('map() transforms headers', () => {
      const { headers } = createResHeaders();
      const values = headers.map((h) => h.value);
      expect(values).toEqual(['application/json', 'abc-123', 'no-cache']);
    });

    test('reduce() accumulates headers', () => {
      const { headers } = createResHeaders();
      const result = headers.reduce((acc, h) => {
        acc[h.key] = h.value;
        return acc;
      }, {});
      expect(result).toEqual(defaultHeaders);
    });
  });

  // ── Transform methods ─────────────────────────────────────────────────

  describe('transform methods', () => {
    test('toObject() returns plain key-value map', () => {
      const { headers } = createResHeaders();
      expect(headers.toObject()).toEqual(defaultHeaders);
    });

    test('toString() returns semicolon-separated string', () => {
      const { headers } = createResHeaders({ a: '1', b: '2' });
      expect(headers.toString()).toBe('a=1; b=2');
    });

    test('toJSON() returns same as all()', () => {
      const { headers } = createResHeaders();
      expect(headers.toJSON()).toEqual(headers.all());
    });
  });

  // ── Backward compatibility (bracket access) ────────────────────────

  describe('backward compatibility (bracket access)', () => {
    test('bracket read returns header value', () => {
      const { headers } = createResHeaders();
      expect(headers['content-type']).toBe('application/json');
      expect(headers['x-request-id']).toBe('abc-123');
    });

    test('bracket read returns undefined for missing header', () => {
      const { headers } = createResHeaders();
      expect(headers['X-Missing']).toBeUndefined();
    });

    test('Object.keys() returns header names', () => {
      const { headers } = createResHeaders();
      expect(Object.keys(headers)).toEqual(['content-type', 'x-request-id', 'cache-control']);
    });

    test('"in" operator checks header existence', () => {
      const { headers } = createResHeaders();
      expect('content-type' in headers).toBe(true);
      expect('X-Missing' in headers).toBe(false);
    });

    test('PropertyList methods still work alongside bracket access', () => {
      const { headers } = createResHeaders();
      expect(headers['content-type']).toBe('application/json');
      expect(headers.get('content-type')).toBe('application/json');
    });
  });

  // ── Edge cases ────────────────────────────────────────────────────────

  describe('edge cases', () => {
    test('works with empty headers', () => {
      const { headers } = createResHeaders({});
      expect(headers.count()).toBe(0);
      expect(headers.all()).toEqual([]);
      expect(headers.toObject()).toEqual({});
    });

    test('works with null response', () => {
      const brunoRes = new BrunoResponse(null);
      expect(brunoRes.headers.count()).toBe(0);
      expect(brunoRes.headers.all()).toEqual([]);
    });

    test('response headers are read-only (static mode, no mutation methods)', () => {
      const { headers } = createResHeaders();
      // ReadOnlyPropertyList does not have add/remove/clear methods
      expect(typeof headers.add).toBe('undefined');
      expect(typeof headers.remove).toBe('undefined');
      expect(typeof headers.clear).toBe('undefined');
    });
  });
});
