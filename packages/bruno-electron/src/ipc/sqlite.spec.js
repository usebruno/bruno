jest.mock('electron', () => ({
  ipcMain: { handle: jest.fn(), on: jest.fn() },
  app: { getPath: jest.fn(() => require('node:os').tmpdir()) },
  safeStorage: { isEncryptionAvailable: jest.fn(() => false) }
}));

const { codec } = require('./sqlite');

const REQUEST = JSON.stringify({ url: 'https://example.com', headers: { authorization: 'Bearer secret' } });

describe('sqlite codec', () => {
  let error;

  beforeEach(() => {
    error = jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    error.mockRestore();
  });

  it('round-trips a value through encrypt and decrypt', () => {
    expect(codec.decrypt(codec.encrypt(REQUEST))).toBe(REQUEST);
  });

  it('keeps the plaintext out of the ciphertext', () => {
    const encrypted = codec.encrypt(REQUEST);

    expect(encrypted).not.toContain('example.com');
    expect(encrypted).not.toContain('secret');
  });

  it('yields an empty value for a row written before encryption was introduced', () => {
    expect(codec.decrypt(REQUEST)).toBe('');
  });

  it('yields an empty value for a payload it cannot decrypt', () => {
    expect(codec.decrypt('$01:not-decryptable')).toBe('');
  });
});
