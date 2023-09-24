const crypto = require('crypto');
const { machineIdSync } = require('node-machine-id');
const { safeStorage } = require('electron');

// Constants for algorithm identification
const ELECTRONSAFESTORAGE_ALGO = '00';
const AES256_ALGO = '01';

// AES-256 encryption and decryption functions
function aes256Encrypt(data, key) {
  const cipher = crypto.createCipher('aes-256-cbc', key);
  let encrypted = cipher.update(data, 'utf8', 'hex');
  encrypted += cipher.final('hex');

  return encrypted;
}
function aes256Decrypt(data, key) {
  const decipher = crypto.createDecipher('aes-256-cbc', key);
  let decrypted = decipher.update(data, 'hex', 'utf8');
  decrypted += decipher.final('utf8');

  return decrypted;
}

function encryptString(str) {
  if (!str || typeof str !== 'string' || str.length === 0) {
    throw new Error('Encrypt failed: invalid string');
  }

  if (safeStorage && safeStorage.isEncryptionAvailable()) {
    let encryptedString = safeStorage.encryptString(str);

    return `$${ELECTRONSAFESTORAGE_ALGO}:${encryptedString}`;
  }

  // fallback to aes256
  const key = machineIdSync();
  let encryptedString = aes256Encrypt(str, key);

  return `$${AES256_ALGO}:${encryptedString}`;
}

function decryptString(str) {
  if (!str) {
    throw new Error('Decrypt failed: unrecognized string format');
  }

  const match = str.match(/^\$(.*?):(.*)$/);
  if (!match) {
    throw new Error('Decrypt failed: unrecognized string format');
  }

  const algo = match[1];
  const encryptedString = match[2];

  if ([ELECTRONSAFESTORAGE_ALGO, AES256_ALGO].indexOf(algo) === -1) {
    throw new Error('Decrypt failed: Invalid algo');
  }

  if (algo === ELECTRONSAFESTORAGE_ALGO) {
    return safeStorage.decryptString(encryptedString);
  }

  if (algo === AES256_ALGO) {
    const key = machineIdSync();
    return aes256Decrypt(encryptedString, key);
  }
}

module.exports = {
  encryptString,
  decryptString
};
