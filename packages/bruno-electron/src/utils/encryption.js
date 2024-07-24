const crypto = require('crypto');
const { machineIdSync } = require('@usebruno/node-machine-id');
const { safeStorage } = require('electron');

// Constants for algorithm identification
const ELECTRONSAFESTORAGE_ALGO = '00';
const AES256_ALGO = '01';

// AES-256 encryption and decryption functions
function aes256Encrypt(data) {
  const key = machineIdSync();
  const cipher = crypto.createCipher('aes-256-cbc', key);
  let encrypted = cipher.update(data, 'utf8', 'hex');
  encrypted += cipher.final('hex');

  return encrypted;
}

function aes256Decrypt(data) {
  const key = machineIdSync();
  const decipher = crypto.createDecipher('aes-256-cbc', key);
  let decrypted = decipher.update(data, 'hex', 'utf8');
  decrypted += decipher.final('utf8');

  return decrypted;
}

// electron safe storage encryption and decryption functions
function safeStorageEncrypt(str) {
  let encryptedStringBuffer = safeStorage.encryptString(str);

  // Convert the encrypted buffer to a hexadecimal string
  const encryptedString = encryptedStringBuffer.toString('hex');

  return encryptedString;
}
function safeStorageDecrypt(str) {
  // Convert the hexadecimal string to a buffer
  const encryptedStringBuffer = Buffer.from(str, 'hex');

  // Decrypt the buffer
  const decryptedStringBuffer = safeStorage.decryptString(encryptedStringBuffer);

  // Convert the decrypted buffer to a string
  const decryptedString = decryptedStringBuffer.toString();

  return decryptedString;
}

function encryptString(str) {
  if (typeof str !== 'string') {
    throw new Error('Encrypt failed: invalid string');
  }

  let encryptedString = '';

  if (safeStorage && safeStorage.isEncryptionAvailable()) {
    encryptedString = safeStorageEncrypt(str);
    return `$${ELECTRONSAFESTORAGE_ALGO}:${encryptedString}`;
  }

  // fallback to aes256
  encryptedString = aes256Encrypt(str);

  return `$${AES256_ALGO}:${encryptedString}`;
}

function decryptString(str) {
  if (!str) {
    throw new Error('Decrypt failed: unrecognized string format');
  }

  // Find the index of the first colon
  const colonIndex = str.indexOf(':');

  if (colonIndex === -1) {
    throw new Error('Decrypt failed: unrecognized string format');
  }

  // Extract algo and encryptedString based on the colon index
  const algo = str.substring(1, colonIndex);
  const encryptedString = str.substring(colonIndex + 1);

  if ([ELECTRONSAFESTORAGE_ALGO, AES256_ALGO].indexOf(algo) === -1) {
    throw new Error('Decrypt failed: Invalid algo');
  }

  if (algo === ELECTRONSAFESTORAGE_ALGO) {
    return safeStorageDecrypt(encryptedString);
  }

  if (algo === AES256_ALGO) {
    return aes256Decrypt(encryptedString);
  }
}

module.exports = {
  encryptString,
  decryptString
};
