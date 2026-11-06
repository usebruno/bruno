const { encryptString, decryptString, encryptStringSafe, decryptStringSafe } = require('../../src/utils/encryption');
const fs = require('fs');
const path = require('path');

// We can only unit test aes 256 fallback as safeStorage is only available
// in the main process

// Mock electron app
jest.mock('electron', () => ({
  safeStorage: {
    isEncryptionAvailable: () => false
  },
  app: {
    getPath: jest.fn((name) => {
      if (name === 'userData') {
        return '/tmp/test-user-data';
      }
      return '/tmp';
    })
  }
}));

describe('Encryption and Decryption Tests', () => {
  it('should encrypt and decrypt using AES-256', () => {
    const plaintext = 'bruno is awesome';
    const encrypted = encryptString(plaintext);
    const decrypted = decryptString(encrypted);

    expect(decrypted).toBe(plaintext);
  });

  it('should handle empty strings in encryptString', () => {
    const result = encryptString('');
    expect(result).toBe('');
  });

  it('should handle empty strings in decryptString', () => {
    const result = decryptString('');
    expect(result).toBe('');
  });

  it('encrypt should throw an error for invalid string', () => {
    expect(() => encryptString(null)).toThrow('Encrypt failed: invalid string');
    expect(() => encryptString(undefined)).toThrow('Encrypt failed: invalid string');
  });

  it('decrypt should throw an error for invalid string', () => {
    expect(() => decryptString(null)).toThrow('Decrypt failed: unrecognized string format');
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

describe('Safe Encryption and Decryption Tests', () => {
  it('should encrypt and decrypt successfully using encryptStringSafe and decryptStringSafe', () => {
    const plaintext = 'bruno is awesome';
    const encryptionResult = encryptStringSafe(plaintext);
    const decryptionResult = decryptStringSafe(encryptionResult.value);

    expect(encryptionResult.success).toBe(true);
    expect(decryptionResult.success).toBe(true);
    expect(decryptionResult.value).toBe(plaintext);
  });

  it('should handle empty strings in encryptStringSafe', () => {
    const result = encryptStringSafe('');
    expect(result.success).toBe(true);
    expect(result.value).toBe('');
  });

  it('should handle empty strings in decryptStringSafe', () => {
    const result = decryptStringSafe('');
    expect(result.success).toBe(true);
    expect(result.value).toBe('');
  });

  it('should handle invalid string format in decryptStringSafe', () => {
    const result = decryptStringSafe('garbage');
    expect(result.success).toBe(false);
    expect(result.error).toBe('Decrypt failed: unrecognized string format');
    expect(result.value).toBe('');
  });

  it('should handle invalid algorithm in decryptStringSafe', () => {
    const invalidAlgo = '$99:abcdefg';
    const result = decryptStringSafe(invalidAlgo);
    expect(result.success).toBe(false);
    expect(result.error).toBe('Decrypt failed: Invalid algo');
    expect(result.value).toBe('');
  });

  it('should handle malformed encrypted string in decryptStringSafe', () => {
    const malformedString = '$01:invalid-hex-string';
    const result = decryptStringSafe(malformedString);
    expect(result.success).toBe(false);
    expect(result.error).toContain('AES256 decryption failed');
    expect(result.value).toBe('');
  });

  it('should handle special characters in encryptStringSafe and decryptStringSafe', () => {
    const specialText = 'bruno@#$%^&*()_+-=[]{}|;:,.<>?';
    const encryptionResult = encryptStringSafe(specialText);
    const decryptionResult = decryptStringSafe(encryptionResult.value);

    expect(encryptionResult.success).toBe(true);
    expect(decryptionResult.success).toBe(true);
    expect(decryptionResult.value).toBe(specialText);
  });

  it('decrypt-safe should not throw error for invalid inputs', () => {
    expect(() => decryptStringSafe(null)).not.toThrow();
    expect(() => decryptStringSafe(undefined)).not.toThrow();
    expect(() => decryptStringSafe('garbage')).not.toThrow();
    expect(() => decryptStringSafe(123456789)).not.toThrow();
    expect(() => decryptStringSafe('aes256:')).not.toThrow();
    expect(() => decryptStringSafe('aes256:invalid_base64')).not.toThrow();
  });
});

describe('Machine ID Fallback Tests', () => {
  let mockMachineIdSync;
  let encryption;
  let mockFs;
  let crypto;

  beforeEach(() => {
    // Clear module cache to reset the cached machine ID
    jest.resetModules();

    // Mock the node-machine-id module
    mockMachineIdSync = jest.fn();
    jest.mock('@usebruno/node-machine-id', () => ({
      machineIdSync: mockMachineIdSync
    }));

    // Mock filesystem
    mockFs = {
      readFileSync: jest.fn(),
      existsSync: jest.fn(),
      writeFileSync: jest.fn(),
      linkSync: jest.fn(),
      unlinkSync: jest.fn()
    };

    jest.spyOn(fs, 'readFileSync').mockImplementation(mockFs.readFileSync);
    jest.spyOn(fs, 'existsSync').mockImplementation(mockFs.existsSync);
    jest.spyOn(fs, 'writeFileSync').mockImplementation(mockFs.writeFileSync);
    jest.spyOn(fs, 'linkSync').mockImplementation(mockFs.linkSync);
    jest.spyOn(fs, 'unlinkSync').mockImplementation(mockFs.unlinkSync);

    // Reload the module to use mocks
    encryption = require('../../src/utils/encryption');
    crypto = require('crypto');
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('should prefer /var/lib/dbus/machine-id over /etc/machine-id', () => {
    mockMachineIdSync.mockImplementation(() => {
      const error = new Error('EFAULT: bad address in system call argument');
      error.code = 'EFAULT';
      throw error;
    });

    const dbusId = 'dbus-machine-id-value';
    const etcId = 'etc-machine-id-value';
    const readOrder = [];

    mockFs.readFileSync.mockImplementation((filePath) => {
      readOrder.push(filePath);
      if (filePath === '/var/lib/dbus/machine-id') {
        return dbusId + '\n';
      }
      if (filePath === '/etc/machine-id') {
        return etcId + '\n';
      }
      throw new Error('File not found');
    });

    const plaintext = 'test-secret-value';
    const encrypted = encryption.encryptString(plaintext);

    expect(readOrder[0]).toBe('/var/lib/dbus/machine-id');
    expect(mockFs.readFileSync).not.toHaveBeenCalledWith('/etc/machine-id', 'utf8');

    const expectedHash = crypto.createHash('sha256').update(dbusId).digest('hex');
    jest.resetModules();
    mockMachineIdSync = jest.fn().mockReturnValue(expectedHash);
    jest.mock('@usebruno/node-machine-id', () => ({
      machineIdSync: mockMachineIdSync
    }));

    encryption = require('../../src/utils/encryption');
    expect(encryption.decryptString(encrypted)).toBe(plaintext);

    jest.resetModules();
    const etcHash = crypto.createHash('sha256').update(etcId).digest('hex');
    mockMachineIdSync = jest.fn().mockReturnValue(etcHash);
    jest.mock('@usebruno/node-machine-id', () => ({
      machineIdSync: mockMachineIdSync
    }));
    const etcEncryption = require('../../src/utils/encryption');
    expect(etcEncryption.encryptString(plaintext)).not.toBe(encrypted);
  });

  it('should fall back to /etc/machine-id when dbus machine-id is unavailable', () => {
    mockMachineIdSync.mockImplementation(() => {
      const error = new Error('EFAULT: bad address in system call argument');
      error.code = 'EFAULT';
      throw error;
    });

    const readOrder = [];
    mockFs.readFileSync.mockImplementation((filePath) => {
      readOrder.push(filePath);
      if (filePath === '/var/lib/dbus/machine-id') {
        throw new Error('File not found');
      }
      if (filePath === '/etc/machine-id') {
        return 'test-machine-id-from-etc\n';
      }
      throw new Error('File not found');
    });

    const plaintext = 'test-secret-value';
    const encrypted = encryption.encryptString(plaintext);
    const decrypted = encryption.decryptString(encrypted);

    expect(decrypted).toBe(plaintext);
    expect(readOrder[0]).toBe('/var/lib/dbus/machine-id');
    expect(readOrder[1]).toBe('/etc/machine-id');
  });

  it('should use /var/lib/dbus/machine-id when it is the only machine-id file', () => {
    mockMachineIdSync.mockImplementation(() => {
      throw new Error('EFAULT: bad address in system call argument');
    });

    mockFs.readFileSync.mockImplementation((filePath) => {
      if (filePath === '/etc/machine-id') {
        throw new Error('File not found');
      }
      if (filePath === '/var/lib/dbus/machine-id') {
        return 'test-machine-id-from-dbus\n';
      }
      throw new Error('File not found');
    });

    const plaintext = 'test-secret-value';
    const encrypted = encryption.encryptString(plaintext);
    const decrypted = encryption.decryptString(encrypted);

    expect(decrypted).toBe(plaintext);
    expect(mockFs.readFileSync).toHaveBeenCalledWith('/var/lib/dbus/machine-id', 'utf8');
    expect(mockFs.readFileSync).not.toHaveBeenCalledWith('/etc/machine-id', 'utf8');
  });

  it('should generate and persist a machine ID when all file-based methods fail', () => {
    mockMachineIdSync.mockImplementation(() => {
      throw new Error('EFAULT: bad address in system call argument');
    });

    const generatedId = 'generated-machine-id-hex';
    const machineIdPath = path.join('/tmp/test-user-data', 'machine-id');
    const files = {};

    mockFs.readFileSync.mockImplementation((filePath) => {
      if (Object.prototype.hasOwnProperty.call(files, filePath)) {
        return files[filePath];
      }
      throw new Error('File not found');
    });

    mockFs.existsSync.mockReturnValue(false);

    mockFs.writeFileSync.mockImplementation((filePath, content) => {
      files[filePath] = content;
    });

    mockFs.linkSync.mockImplementation((src, dest) => {
      if (Object.prototype.hasOwnProperty.call(files, dest)) {
        const error = new Error('file exists');
        error.code = 'EEXIST';
        throw error;
      }
      files[dest] = files[src];
    });

    mockFs.unlinkSync.mockImplementation((filePath) => {
      delete files[filePath];
    });

    jest.spyOn(require('crypto'), 'randomBytes').mockReturnValue(Buffer.from(generatedId, 'utf8'));

    const plaintext = 'test-secret-value';
    const encrypted = encryption.encryptString(plaintext);
    const expectedRawId = Buffer.from(generatedId, 'utf8').toString('hex');

    expect(files[machineIdPath]).toBe(expectedRawId);
    expect(mockFs.writeFileSync).toHaveBeenCalledWith(
      expect.stringMatching(/\.tmp$/),
      expectedRawId,
      { encoding: 'utf8', flag: 'wx' }
    );
    expect(mockFs.linkSync).toHaveBeenCalledWith(expect.stringMatching(/\.tmp$/), machineIdPath);
    expect(mockFs.unlinkSync).toHaveBeenCalled();
    expect(Object.keys(files).some((filePath) => filePath.endsWith('.tmp'))).toBe(false);

    const decrypted = encryption.decryptString(encrypted);
    expect(decrypted).toBe(plaintext);

    require('crypto').randomBytes.mockRestore();
  });

  it('should use an ID already published by another process', () => {
    mockMachineIdSync.mockImplementation(() => {
      throw new Error('EFAULT: bad address in system call argument');
    });

    const winnerId = 'concurrent-winner-id';
    const machineIdPath = path.join('/tmp/test-user-data', 'machine-id');

    mockFs.existsSync.mockReturnValue(false);
    mockFs.readFileSync.mockImplementation((filePath) => {
      if (filePath === '/var/lib/dbus/machine-id' || filePath === '/etc/machine-id') {
        throw new Error('File not found');
      }
      if (filePath === machineIdPath) {
        return winnerId;
      }
      throw new Error('File not found');
    });
    mockFs.linkSync.mockImplementation(() => {
      const error = new Error('file exists');
      error.code = 'EEXIST';
      throw error;
    });

    jest.spyOn(require('crypto'), 'randomBytes').mockReturnValue(Buffer.from('losing-generated-id', 'utf8'));

    const plaintext = 'test-secret-value';
    const encrypted = encryption.encryptString(plaintext);

    expect(mockFs.writeFileSync.mock.calls.some(([filePath]) => filePath === machineIdPath)).toBe(false);
    expect(mockFs.unlinkSync).toHaveBeenCalledWith(expect.stringMatching(/\.tmp$/));

    const expectedHash = crypto.createHash('sha256').update(winnerId).digest('hex');
    jest.resetModules();
    mockMachineIdSync = jest.fn().mockReturnValue(expectedHash);
    jest.mock('@usebruno/node-machine-id', () => ({
      machineIdSync: mockMachineIdSync
    }));

    encryption = require('../../src/utils/encryption');
    expect(encryption.encryptString(plaintext)).toBe(encrypted);
    expect(encryption.decryptString(encrypted)).toBe(plaintext);

    require('crypto').randomBytes.mockRestore();
  });

  it('should use persisted machine ID on subsequent calls', () => {
    mockMachineIdSync.mockImplementation(() => {
      throw new Error('EFAULT: bad address in system call argument');
    });

    const persistedId = 'persisted-machine-id-12345';

    mockFs.readFileSync.mockImplementation((filePath) => {
      if (filePath === '/etc/machine-id' || filePath === '/var/lib/dbus/machine-id') {
        throw new Error('File not found');
      }
      if (filePath === path.join('/tmp/test-user-data', 'machine-id')) {
        return persistedId;
      }
      throw new Error('File not found');
    });

    mockFs.existsSync.mockImplementation((filePath) => {
      return filePath === path.join('/tmp/test-user-data', 'machine-id');
    });

    const plaintext = 'test-secret-value';
    const encrypted = encryption.encryptString(plaintext);
    const decrypted = encryption.decryptString(encrypted);

    expect(decrypted).toBe(plaintext);
    expect(mockFs.existsSync).toHaveBeenCalledWith(path.join('/tmp/test-user-data', 'machine-id'));
    expect(mockFs.writeFileSync).not.toHaveBeenCalled();
  });

  it('should hash fallback machine ID identically to node-machine-id', () => {
    const rawMachineId = 'a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6';
    const expectedHash = crypto.createHash('sha256').update(rawMachineId.toLowerCase()).digest('hex');

    mockMachineIdSync.mockImplementation(() => {
      throw new Error('EFAULT: bad address in system call argument');
    });

    mockFs.readFileSync.mockImplementation((filePath) => {
      if (filePath === '/etc/machine-id') {
        return rawMachineId + '\n';
      }
      throw new Error('File not found');
    });

    const plaintext = 'test-secret-value';
    const encrypted1 = encryption.encryptString(plaintext);

    jest.resetModules();
    mockMachineIdSync = jest.fn().mockReturnValue(expectedHash);
    jest.mock('@usebruno/node-machine-id', () => ({
      machineIdSync: mockMachineIdSync
    }));

    encryption = require('../../src/utils/encryption');
    const encrypted2 = encryption.encryptString(plaintext);

    expect(encryption.decryptString(encrypted1)).toBe(plaintext);
    expect(encryption.decryptString(encrypted2)).toBe(plaintext);
  });

  it('should successfully decrypt data encrypted with machineIdSync using fallback ID', () => {
    const rawMachineId = 'd6b9a0c8f3e2a1b7c4d5e8f9a0b1c2d3';
    const expectedHash = crypto.createHash('sha256').update(rawMachineId.toLowerCase()).digest('hex');

    mockMachineIdSync.mockReturnValue(expectedHash);

    const plaintext = 'sensitive-data-123';
    const encryptedWithNormal = encryption.encryptString(plaintext);

    jest.resetModules();
    mockMachineIdSync = jest.fn(() => {
      throw new Error('EFAULT: bad address in system call argument');
    });
    jest.mock('@usebruno/node-machine-id', () => ({
      machineIdSync: mockMachineIdSync
    }));

    mockFs.readFileSync.mockImplementation((filePath) => {
      if (filePath === '/etc/machine-id') {
        return rawMachineId;
      }
      throw new Error('File not found');
    });

    jest.spyOn(fs, 'readFileSync').mockImplementation(mockFs.readFileSync);

    encryption = require('../../src/utils/encryption');
    const decryptedWithFallback = encryption.decryptString(encryptedWithNormal);

    expect(decryptedWithFallback).toBe(plaintext);
  });

  it('should successfully decrypt data encrypted with fallback using machineIdSync', () => {
    const rawMachineId = 'e8f9a0b1c2d3d4e5f6g7h8i9j0k1l2m3';
    const expectedHash = crypto.createHash('sha256').update(rawMachineId.toLowerCase()).digest('hex');

    mockMachineIdSync.mockImplementation(() => {
      throw new Error('EFAULT: bad address in system call argument');
    });

    mockFs.readFileSync.mockImplementation((filePath) => {
      if (filePath === '/var/lib/dbus/machine-id') {
        return rawMachineId + '\n';
      }
      throw new Error('File not found');
    });

    const plaintext = 'another-sensitive-value';
    const encryptedWithFallback = encryption.encryptString(plaintext);

    jest.resetModules();
    mockMachineIdSync = jest.fn().mockReturnValue(expectedHash);
    jest.mock('@usebruno/node-machine-id', () => ({
      machineIdSync: mockMachineIdSync
    }));

    encryption = require('../../src/utils/encryption');
    const decryptedWithNormal = encryption.decryptString(encryptedWithFallback);

    expect(decryptedWithNormal).toBe(plaintext);
  });

  it('should normalize machine ID with whitespace and newlines before hashing', () => {
    const rawMachineId = '  a1b2c3d4e5f6  \n  ';
    const normalizedId = 'a1b2c3d4e5f6';
    const expectedHash = crypto.createHash('sha256').update(normalizedId).digest('hex');

    mockMachineIdSync.mockImplementation(() => {
      throw new Error('EFAULT: bad address in system call argument');
    });

    mockFs.readFileSync.mockImplementation((filePath) => {
      if (filePath === '/etc/machine-id') {
        return rawMachineId;
      }
      throw new Error('File not found');
    });

    const plaintext = 'test-normalization';
    const encrypted1 = encryption.encryptString(plaintext);

    jest.resetModules();
    mockMachineIdSync = jest.fn().mockReturnValue(expectedHash);
    jest.mock('@usebruno/node-machine-id', () => ({
      machineIdSync: mockMachineIdSync
    }));

    encryption = require('../../src/utils/encryption');
    const decrypted = encryption.decryptString(encrypted1);

    expect(decrypted).toBe(plaintext);
  });
});
