const CookieList = require('../src/cookie-list');
const ReadOnlyPropertyList = require('../src/readonly-property-list');

describe('CookieList', () => {
  const mockCookies = [
    { key: 'session', value: 'abc123' },
    { key: 'token', value: 'xyz789' },
    { key: 'theme', value: 'dark' }
  ];

  function createCookieList(overrides = {}) {
    return new CookieList({
      getUrl: overrides.getUrl || (() => 'https://example.com'),
      interpolate: overrides.interpolate || ((str) => str),
      createCookieJar: overrides.createCookieJar || (() => ({})),
      getCookiesForUrl: overrides.getCookiesForUrl || (() => mockCookies)
    });
  }

  // ── Inheritance ────────────────────────────────────────────────────────

  test('extends ReadOnlyPropertyList', () => {
    const list = createCookieList();
    expect(list).toBeInstanceOf(ReadOnlyPropertyList);
    expect(list).toBeInstanceOf(CookieList);
  });

  test('inherits read methods from ReadOnlyPropertyList', () => {
    const list = createCookieList();
    expect(list.get('session')).toBe('abc123');
    expect(list.all()).toHaveLength(3);
    expect(list.count()).toBe(3);
  });

  // ── Read methods with no URL ───────────────────────────────────────────

  describe('read methods when URL is falsy', () => {
    let list;

    beforeEach(() => {
      list = createCookieList({ getUrl: () => null });
    });

    test('all() returns empty array', () => {
      expect(list.all()).toEqual([]);
    });

    test('count() returns 0', () => {
      expect(list.count()).toBe(0);
    });

    test('get() returns undefined', () => {
      expect(list.get('session')).toBeUndefined();
    });

    test('has() returns false', () => {
      expect(list.has('session')).toBe(false);
    });
  });

  // ── Write methods (cookie jar delegation) ──────────────────────────────

  describe('add()', () => {
    test('delegates to jar.setCookie', () => {
      const setCookie = jest.fn().mockResolvedValue('ok');
      const list = createCookieList({
        createCookieJar: () => ({ setCookie })
      });

      list.add({ name: 'foo', value: 'bar' });
      expect(setCookie).toHaveBeenCalledWith('https://example.com', { name: 'foo', value: 'bar' }, undefined);
    });

    test('passes callback to jar.setCookie', () => {
      const setCookie = jest.fn();
      const cb = jest.fn();
      const list = createCookieList({
        createCookieJar: () => ({ setCookie })
      });

      list.add({ name: 'foo', value: 'bar' }, cb);
      expect(setCookie).toHaveBeenCalledWith('https://example.com', { name: 'foo', value: 'bar' }, cb);
    });

    test('returns Promise.resolve() when no URL', async () => {
      const list = createCookieList({ getUrl: () => null });
      const result = list.add({ name: 'foo', value: 'bar' });
      await expect(result).resolves.toBeUndefined();
    });

    test('calls callback with undefined when no URL', () => {
      const cb = jest.fn();
      const list = createCookieList({ getUrl: () => '' });
      list.add({ name: 'foo', value: 'bar' }, cb);
      expect(cb).toHaveBeenCalledWith(undefined);
    });
  });

  describe('upsert()', () => {
    test('delegates to jar.setCookie', () => {
      const setCookie = jest.fn().mockResolvedValue('ok');
      const list = createCookieList({
        createCookieJar: () => ({ setCookie })
      });

      list.upsert({ name: 'foo', value: 'bar' });
      expect(setCookie).toHaveBeenCalledWith('https://example.com', { name: 'foo', value: 'bar' }, undefined);
    });

    test('returns Promise.resolve() when no URL', async () => {
      const list = createCookieList({ getUrl: () => null });
      const result = list.upsert({ name: 'foo', value: 'bar' });
      await expect(result).resolves.toBeUndefined();
    });
  });

  describe('remove()', () => {
    test('delegates to jar.deleteCookie', () => {
      const deleteCookie = jest.fn().mockResolvedValue('ok');
      const list = createCookieList({
        createCookieJar: () => ({ deleteCookie })
      });

      list.remove('session');
      expect(deleteCookie).toHaveBeenCalledWith('https://example.com', 'session', undefined);
    });

    test('passes callback', () => {
      const deleteCookie = jest.fn();
      const cb = jest.fn();
      const list = createCookieList({
        createCookieJar: () => ({ deleteCookie })
      });

      list.remove('session', cb);
      expect(deleteCookie).toHaveBeenCalledWith('https://example.com', 'session', cb);
    });

    test('returns Promise.resolve() when no URL', async () => {
      const list = createCookieList({ getUrl: () => null });
      const result = list.remove('session');
      await expect(result).resolves.toBeUndefined();
    });

    test('returns Promise.resolve() when no name', async () => {
      const list = createCookieList();
      const result = list.remove(null);
      await expect(result).resolves.toBeUndefined();
    });

    test('calls callback when no name', () => {
      const cb = jest.fn();
      const list = createCookieList();
      list.remove('', cb);
      expect(cb).toHaveBeenCalledWith(undefined);
    });
  });

  describe('clear()', () => {
    test('delegates to jar.deleteCookies', () => {
      const deleteCookies = jest.fn().mockResolvedValue('ok');
      const list = createCookieList({
        createCookieJar: () => ({ deleteCookies })
      });

      list.clear();
      expect(deleteCookies).toHaveBeenCalledWith('https://example.com', undefined);
    });

    test('passes callback', () => {
      const deleteCookies = jest.fn();
      const cb = jest.fn();
      const list = createCookieList({
        createCookieJar: () => ({ deleteCookies })
      });

      list.clear(cb);
      expect(deleteCookies).toHaveBeenCalledWith('https://example.com', cb);
    });

    test('returns Promise.resolve() when no URL', async () => {
      const list = createCookieList({ getUrl: () => null });
      const result = list.clear();
      await expect(result).resolves.toBeUndefined();
    });
  });

  describe('delete()', () => {
    test('delegates to jar.deleteCookie', () => {
      const deleteCookie = jest.fn().mockResolvedValue('ok');
      const list = createCookieList({
        createCookieJar: () => ({ deleteCookie })
      });

      list.delete('session');
      expect(deleteCookie).toHaveBeenCalledWith('https://example.com', 'session', undefined);
    });

    test('returns Promise.resolve() when no URL', async () => {
      const list = createCookieList({ getUrl: () => null });
      const result = list.delete('session');
      await expect(result).resolves.toBeUndefined();
    });

    test('returns Promise.resolve() when no name', async () => {
      const list = createCookieList();
      const result = list.delete(null);
      await expect(result).resolves.toBeUndefined();
    });
  });

  // ── jar() ──────────────────────────────────────────────────────────────

  describe('jar()', () => {
    let mockJar;
    let list;

    beforeEach(() => {
      mockJar = {
        getCookie: jest.fn().mockResolvedValue({ key: 'session', value: 'abc' }),
        getCookies: jest.fn().mockResolvedValue([]),
        setCookie: jest.fn().mockResolvedValue('ok'),
        setCookies: jest.fn().mockResolvedValue('ok'),
        clear: jest.fn().mockResolvedValue('ok'),
        deleteCookies: jest.fn().mockResolvedValue('ok'),
        deleteCookie: jest.fn().mockResolvedValue('ok')
      };
      list = createCookieList({
        interpolate: (str) => str.replace('{{host}}', 'example.com'),
        createCookieJar: () => mockJar
      });
    });

    test('returns an object with all jar methods', () => {
      const jar = list.jar();
      expect(jar).toHaveProperty('getCookie');
      expect(jar).toHaveProperty('getCookies');
      expect(jar).toHaveProperty('setCookie');
      expect(jar).toHaveProperty('setCookies');
      expect(jar).toHaveProperty('clear');
      expect(jar).toHaveProperty('deleteCookies');
      expect(jar).toHaveProperty('deleteCookie');
    });

    test('getCookie interpolates URL and delegates', () => {
      const jar = list.jar();
      const cb = jest.fn();
      jar.getCookie('https://{{host}}/path', 'session', cb);
      expect(mockJar.getCookie).toHaveBeenCalledWith('https://example.com/path', 'session', cb);
    });

    test('getCookies interpolates URL and delegates', () => {
      const jar = list.jar();
      const cb = jest.fn();
      jar.getCookies('https://{{host}}/path', cb);
      expect(mockJar.getCookies).toHaveBeenCalledWith('https://example.com/path', cb);
    });

    test('setCookie interpolates URL and delegates', () => {
      const jar = list.jar();
      const cb = jest.fn();
      jar.setCookie('https://{{host}}/path', 'name', 'value', cb);
      expect(mockJar.setCookie).toHaveBeenCalledWith('https://example.com/path', 'name', 'value', cb);
    });

    test('setCookies interpolates URL and delegates', () => {
      const jar = list.jar();
      const cb = jest.fn();
      jar.setCookies('https://{{host}}/path', [{ name: 'a' }], cb);
      expect(mockJar.setCookies).toHaveBeenCalledWith('https://example.com/path', [{ name: 'a' }], cb);
    });

    test('clear delegates directly', () => {
      const jar = list.jar();
      const cb = jest.fn();
      jar.clear(cb);
      expect(mockJar.clear).toHaveBeenCalledWith(cb);
    });

    test('deleteCookies interpolates URL and delegates', () => {
      const jar = list.jar();
      const cb = jest.fn();
      jar.deleteCookies('https://{{host}}/path', cb);
      expect(mockJar.deleteCookies).toHaveBeenCalledWith('https://example.com/path', cb);
    });

    test('deleteCookie interpolates URL and delegates', () => {
      const jar = list.jar();
      const cb = jest.fn();
      jar.deleteCookie('https://{{host}}/path', 'session', cb);
      expect(mockJar.deleteCookie).toHaveBeenCalledWith('https://example.com/path', 'session', cb);
    });
  });
});
