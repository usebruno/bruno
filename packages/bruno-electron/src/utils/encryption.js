const crypto = require('crypto');
const { machineIdSync } = require('@usebruno/node-machine-id');
const { safeStorage } = require('electron');

// Constants for algorithm identification
const ELECTRONSAFESTORAGE_ALGO = '00';
const AES256_ALGO = '01';

function deriveKeyAndIv(password, keyLength, ivLength) {
  const key = Buffer.alloc(keyLength);
  const iv = Buffer.alloc(ivLength);
  const derivedBytes = [];
  let lastHash = null;

  while (Buffer.concat(derivedBytes).length < keyLength + ivLength) {
    const hash = crypto.createHash('md5');
    if (lastHash) {
      hash.update(lastHash);
    }
    hash.update(Buffer.from(password, 'utf8'));
    lastHash = hash.digest();
    derivedBytes.push(lastHash);
  }

  const concatenatedBytes = Buffer.concat(derivedBytes);
  concatenatedBytes.copy(key, 0, 0, keyLength);
  concatenatedBytes.copy(iv, 0, keyLength, keyLength + ivLength);

  return { key, iv };
}



function aes256Encrypt(data, passkey = null) {
  const rawKey = passkey || machineIdSync();
  const iv = crypto.randomBytes(16); // Random IV each time
  const key = crypto.createHash('sha256').update(rawKey).digest();
  const cipher = crypto.createCipheriv('aes-256-cbc', key, iv);
  let encrypted = cipher.update(data, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  return iv.toString('hex') + ':' + encrypted; // store IV with ciphertext
}

function aes256Decrypt(data, passkey = null) {
  const rawKey = passkey || machineIdSync();

  // New format with IV prefix
  if (data.includes(':')) {
    try {
      const [ivHex, encryptedData] = data.split(':');
      const iv = Buffer.from(ivHex, 'hex');
      const key = crypto.createHash('sha256').update(rawKey).digest();
      const decipher = crypto.createDecipheriv('aes-256-cbc', key, iv);
      let decrypted = decipher.update(encryptedData, 'hex', 'utf8');
      decrypted += decipher.final('utf8');
      return decrypted;
    } catch (_) {
      // fallthrough
    }
  }

  try {
    // Legacy path – zero IV
    const iv = Buffer.alloc(16, 0);
    const key = crypto.createHash('sha256').update(rawKey).digest();
    const decipher = crypto.createDecipheriv('aes-256-cbc', key, iv);
    let decrypted = decipher.update(data, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  } catch (err) {
    // If decryption fails, fall back to old key derivation
    try {
      const { key: oldKey, iv: oldIv } = deriveKeyAndIv(rawKey, 32, 16);
      const decipher = crypto.createDecipheriv('aes-256-cbc', oldKey, oldIv);
      const decrypted = decipher.update(data, 'hex', 'utf8');
      decrypted += decipher.final('utf8');
      return decrypted;
    } catch (fallbackErr) {
      console.error('AES256 decryption failed with both methods:', err, fallbackErr);
      throw new Error('AES256 decryption failed: ' + fallbackErr.message);
    }
  }
}


// electron safe storage encryption and decryption functions
function safeStorageEncrypt(str) {
  let encryptedStringBuffer = safeStorage.encryptString(str);

  // Convert the encrypted buffer to a hexadecimal string
  const encryptedString = encryptedStringBuffer.toString('hex');

  return encryptedString;
}
function safeStorageDecrypt(str) {
  try {
    // Convert the hexadecimal string to a buffer
    const encryptedStringBuffer = Buffer.from(str, 'hex');

    // Decrypt the buffer
    const decryptedStringBuffer = safeStorage.decryptString(encryptedStringBuffer);

    // Convert the decrypted buffer to a string
    const decryptedString = decryptedStringBuffer.toString();

    return decryptedString;
  } catch (err) {
    console.error('SafeStorage decryption failed:', err);
    throw new Error('SafeStorage decryption failed: ' + err.message);
  }
}

function encryptString(str, passkey = null) {
  if (typeof str !== 'string') {
    throw new Error('Encrypt failed: invalid string');
  }
  if (str.length === 0) {
    return '';
  }

  let encryptedString = '';

  // If passkey is provided, use passkey-based encryption
  if (passkey) {
    encryptedString = aes256Encrypt(str, passkey);
    return `$${AES256_ALGO}:${encryptedString}`;
  }

  // Try safeStorage first
  if (safeStorage && safeStorage.isEncryptionAvailable()) {
    try {
      encryptedString = safeStorageEncrypt(str);
      return `$${ELECTRONSAFESTORAGE_ALGO}:${encryptedString}`;
    } catch (err) {
      // Fall back to AES256 if safeStorage fails
    }
  }

  // fallback to aes256
  encryptedString = aes256Encrypt(str);
  return `$${AES256_ALGO}:${encryptedString}`;
}

function decryptString(str, passkey = null) {
  if (typeof str !== 'string') {
    throw new Error('Decrypt failed: unrecognized string format');
  }
  if (str.length === 0) {
    return '';
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
    if (safeStorage && safeStorage.isEncryptionAvailable()) {
      return safeStorageDecrypt(encryptedString);
    } else {
      return '';
    }
  }

  if (algo === AES256_ALGO) {
    return aes256Decrypt(encryptedString, passkey || null);
  }

  throw new Error('Decrypt failed: Invalid algo');
}

function decryptStringSafe(str) {
  try {
    const result = decryptString(str);
    return { success: true, value: result };
  } catch (err) {
    console.error('Decryption failed:', err.message);
    return { success: false, error: err.message, value: '' };
  }
}

function encryptStringSafe(str) {
  try {
    const result = encryptString(str);
    return { success: true, value: result };
  } catch (err) {
    console.error('Encryption failed:', err.message);
    return { success: false, error: err.message, value: '' };
  }

}

function decryptStringSafe(str) {
  try {
    const result = decryptString(str);
    return { success: true, value: result };
  } catch (err) {
    console.error('Decryption failed:', err.message);
    return { success: false, error: err.message, value: '' };
  }
}

function encryptStringSafe(str) {
  try {
    const result = encryptString(str);
    return { success: true, value: result };
  } catch (err) {
    console.error('Encryption failed:', err.message);
    return { success: false, error: err.message, value: '' };
  }
}

module.exports = {
  encryptString,
  encryptStringSafe,
  decryptString,
  decryptStringSafe
};