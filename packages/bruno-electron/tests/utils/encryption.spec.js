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
      writeFileSync: jest.fn()
    };
    
    jest.spyOn(fs, 'readFileSync').mockImplementation(mockFs.readFileSync);
    jest.spyOn(fs, 'existsSync').mockImplementation(mockFs.existsSync);
    jest.spyOn(fs, 'writeFileSync').mockImplementation(mockFs.writeFileSync);
    
    // Reload the module to use mocks
    encryption = require('../../src/utils/encryption');
  });
  
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('should fall back to /etc/machine-id when machineIdSync throws EFAULT', () => {
    mockMachineIdSync.mockImplementation(() => {
      const error = new Error('EFAULT: bad address in system call argument');
      error.code = 'EFAULT';
      throw error;
    });
    
    mockFs.readFileSync.mockImplementation((filePath) => {
      if (filePath === '/etc/machine-id') {
        return 'test-machine-id-from-etc\n';
      }
      throw new Error('File not found');
    });
    
    const plaintext = 'test-secret-value';
    const encrypted = encryption.encryptString(plaintext);
    const decrypted = encryption.decryptString(encrypted);
    
    expect(decrypted).toBe(plaintext);
    expect(mockFs.readFileSync).toHaveBeenCalledWith('/etc/machine-id', 'utf8');
  });

  it('should fall back to /var/lib/dbus/machine-id when /etc/machine-id is not available', () => {
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
  });

  it('should generate and persist a machine ID when all file-based methods fail', () => {
    mockMachineIdSync.mockImplementation(() => {
      throw new Error('EFAULT: bad address in system call argument');
    });
    
    const generatedId = 'generated-machine-id-hex';
    let persistedId = null;
    
    mockFs.readFileSync.mockImplementation(() => {
      throw new Error('File not found');
    });
    
    mockFs.existsSync.mockReturnValue(false);
    
    mockFs.writeFileSync.mockImplementation((filePath, content) => {
      if (filePath === path.join('/tmp/test-user-data', 'machine-id')) {
        persistedId = content;
      }
    });
    
    // Mock crypto.randomBytes to return a predictable value
    const originalRandomBytes = require('crypto').randomBytes;
    jest.spyOn(require('crypto'), 'randomBytes').mockReturnValue(Buffer.from(generatedId, 'utf8'));
    
    const plaintext = 'test-secret-value';
    const encrypted = encryption.encryptString(plaintext);
    
    expect(mockFs.writeFileSync).toHaveBeenCalledWith(
      path.join('/tmp/test-user-data', 'machine-id'),
      expect.any(String),
      'utf8'
    );
    expect(persistedId).toBeTruthy();
    
    // Verify decryption works with the same generated ID
    const decrypted = encryption.decryptString(encrypted);
    expect(decrypted).toBe(plaintext);
    
    // Restore original randomBytes
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
});
