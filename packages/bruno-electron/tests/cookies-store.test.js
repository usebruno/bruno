const path = require('path');

const mockEncrypt = (str) => (str.length ? `$enc:${str}` : '');
const mockDecrypt = (str) => str.replace(/^\$enc:/, '');

jest.mock('../src/utils/encryption', () => ({
  encryptString: jest.fn(mockEncrypt),
  decryptString: jest.fn(mockDecrypt)
}));

jest.mock('electron-store', () => {
  return jest.fn().mockImplementation((opts = {}) => {
    const data = { ...(opts.defaults || {}) };
    return {
      get: (key, fallback) => (key in data ? data[key] : fallback),
      set: (key, value) => {
        data[key] = value;
      }
    };
  });
});

const { CookiesStore } = require(path.join('..', 'src', 'store', 'cookies'));

function createFreshStore() {
  return new CookiesStore();
}

describe('CookiesStore', () => {
  test('setCookies encrypts values and getCookies returns decrypted values', () => {
    const store = createFreshStore();

    const cookie = {
      domain: 'example.com',
      key: 'auth',
      value: 'token',
      path: '/',
      secure: true,
      httpOnly: true
    };

    store.setCookies({ cookies: [cookie] });

    // Raw persisted value should be encrypted
    const raw = store.store.get('cookies');
    expect(raw['example.com'][0].value).toBe(`$enc:${cookie.value}`);

    // API should return decrypted value
    const retrieved = store.getCookies();
    expect(retrieved[0].value).toBe(cookie.value);
  });

  test('getCookies leaves plain-text cookie values untouched', () => {
    const store = createFreshStore();

    const plainCookie = {
      domain: 'example.com',
      key: 'sid',
      value: 'plaintext',
      path: '/',
      secure: false,
      httpOnly: false
    };

    // Manually inject to the underlying store to simulate legacy/plain data
    store.store.set('cookies', { 'example.com': [plainCookie] });

    const cookies = store.getCookies();
    expect(cookies[0].value).toBe('plaintext');
  });
});
