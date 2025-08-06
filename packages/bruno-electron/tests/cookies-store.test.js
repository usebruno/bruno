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
  test('encryptCookieValue() encrypts when passkey exists', () => {
    const store = createFreshStore();
    const value = 'secret';
    expect(store.encryptCookieValue(value)).toBe(`$enc:${value}`);
  });

  test('decryptCookieValue() returns decrypted text for encrypted value', () => {
    const store = createFreshStore();
    const encrypted = store.encryptCookieValue('top-secret');
    expect(store.decryptCookieValue(encrypted)).toBe('top-secret');
  });

  test('decryptCookieValue() is no-op for plain text value', () => {
    const store = createFreshStore();
    expect(store.decryptCookieValue('plain')).toBe('plain');
  });

  test('setCookies() saves encrypted value and getCookies() returns decrypted value', () => {
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

    // Raw store value should be encrypted
    const raw = store.store.get('cookies');
    expect(raw['example.com'][0].value).toBe(`$enc:${cookie.value}`);

    // Public API returns decrypted value
    const retrieved = store.getCookies();
    expect(retrieved[0].value).toBe(cookie.value);
  });

  test('decryptCookieValue() returns empty string when encrypted but passkey missing', () => {
    const store = createFreshStore();
    store.passkey = null; // simulate corrupted/missing passkey
    const decrypted = store.decryptCookieValue('$enc:some-secret');
    expect(decrypted).toBe('');
  });

  test('encryptCookieValue() falls back to original value if encryption helper returns null', () => {
    const encryption = require('../src/utils/encryption');
    encryption.encryptString.mockImplementationOnce(() => null);

    const store = createFreshStore();
    const value = 'plain-text';
    const result = store.encryptCookieValue(value);
    expect(result).toBe(value);
  });
});
