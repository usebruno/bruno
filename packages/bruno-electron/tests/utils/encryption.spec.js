const { encryptString, decryptString } = require('../../src/utils/encryption');

// We can only unit test aes 256 fallback as safeStorage is only available
// in the main process

describe('Encryption and Decryption Tests', () => {
  it('should encrypt and decrypt using AES-256', () => {
    const plaintext = 'bruno is awesome';
    const encrypted = encryptString(plaintext);
    const decrypted = decryptString(encrypted);

    expect(decrypted).toBe(plaintext);
  });

  it('encrypt should throw an error for invalid string', () => {
    expect(() => encryptString(null)).toThrow('Encrypt failed: invalid string');
  });

  it('decrypt should throw an error for invalid string', () => {
    expect(() => decryptString(null)).toThrow('Decrypt failed: unrecognized string format');
    expect(() => decryptString('')).toThrow('Decrypt failed: unrecognized string format');
    expect(() => decryptString('garbage')).toThrow('Decrypt failed: unrecognized string format');
  });

  it.skip('string encrypted using createCipher (< node 20) should be decrypted properly', () => {
    const encryptedString = '$01:2738e0e6a38bcde5fd80141ceadc9b67bc7b1fca7e398c552c1ca2bace28eb57';
    const decryptedValue = decryptString(encryptedString);

    expect(decryptedValue).toBe('bruno is awesome');
  });

  it('decrypt should throw an error for invalid algorithm', () => {
    const invalidAlgo = '$99:abcdefg';

    expect(() => decryptString(invalidAlgo)).toThrow('Decrypt failed: Invalid algo');
  });
});
