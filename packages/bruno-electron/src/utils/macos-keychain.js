const { execFile } = require('node:child_process');
const { createHash } = require('node:crypto');
const path = require('node:path');
const passwordCache = new Map();

const runSecurityCommand = (args, maxBuffer = 16 * 1024 * 1024) => new Promise((resolve, reject) => {
  execFile('/usr/bin/security', args, { encoding: 'utf8', maxBuffer }, (error, stdout) => {
    if (error) {
      reject(error);
      return;
    }

    resolve(stdout);
  });
});

const readAttribute = (block, name) => {
  const escapedName = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const match = block.match(new RegExp(`^\\s*"${escapedName}"<blob>="((?:\\\\.|[^"\\\\])*)"`, 'm'));
  return match?.[1].replace(/\\(["\\])/g, '$1');
};

const parseGenericPasswordEntries = (dump) => {
  const entries = [];
  const seen = new Set();
  const blocks = dump.split(/(?=^class:)/m);

  for (const block of blocks) {
    if (!/^class:\s*"genp"/m.test(block)) {
      continue;
    }

    const service = readAttribute(block, 'svce');
    const account = readAttribute(block, 'acct');
    if (!service || !account) {
      continue;
    }

    const key = `${service}\u0000${account}`;
    if (seen.has(key)) {
      continue;
    }

    seen.add(key);
    entries.push({
      service,
      account,
      label: readAttribute(block, 'labl') || service
    });
  }

  return entries.sort((a, b) => a.label.localeCompare(b.label) || a.account.localeCompare(b.account));
};

const getKeychainId = (keychainPath) => createHash('sha256')
  .update(path.resolve(keychainPath))
  .digest('hex')
  .slice(0, 16);

const getKeychainLabel = (keychainPath) => {
  const filename = path.basename(keychainPath);
  if (filename === 'login.keychain-db') return 'login';
  if (filename === 'System.keychain') return 'System';
  if (filename === 'keychain-2.db') return `iCloud (${path.basename(path.dirname(keychainPath)).slice(0, 8)})`;
  return filename.replace(/\.keychain(-db)?$/, '');
};

const getUserKeychains = async () => {
  const output = await runSecurityCommand(['list-keychains', '-d', 'user']);
  return output
    .split(/\r?\n/)
    .map((line) => {
      try {
        return JSON.parse(line.trim());
      } catch {
        return null;
      }
    })
    .filter((keychainPath) => typeof keychainPath === 'string' && keychainPath.length > 0)
    .map((keychainPath) => ({
      id: getKeychainId(keychainPath),
      path: keychainPath,
      label: getKeychainLabel(keychainPath)
    }));
};

const ensureMacOS = () => {
  if (process.platform !== 'darwin') {
    throw new Error('macOS Keychain is only available on macOS');
  }
};

const listGenericPasswordKeychains = async () => {
  ensureMacOS();
  const keychains = await getUserKeychains();
  return Promise.all(keychains.map(async (keychain) => {
    try {
      // Do not pass `-d`: that asks `security dump-keychain` to include secret data.
      const dump = await runSecurityCommand(['dump-keychain', keychain.path]);
      const entries = parseGenericPasswordEntries(dump).map((entry) => ({ ...entry, keychainId: keychain.id }));
      return { id: keychain.id, label: keychain.label, entries };
    } catch (error) {
      return { id: keychain.id, label: keychain.label, entries: [], error: error.message };
    }
  }));
};

const getPasswordCacheKey = ({ service, account, keychainId }) => `${keychainId}\u0000${service}\u0000${account}`;

const readGenericPassword = async ({ service, account, keychainId }) => {
  ensureMacOS();
  if (typeof service !== 'string' || !service || typeof account !== 'string' || !account || typeof keychainId !== 'string' || !keychainId) {
    throw new Error('A Keychain item reference is required');
  }

  try {
    const keychain = (await getUserKeychains()).find((candidate) => candidate.id === keychainId);
    if (!keychain) {
      throw new Error('The selected Keychain is no longer available');
    }

    const password = await runSecurityCommand([
      'find-generic-password',
      '-s', service,
      '-a', account,
      '-w',
      keychain.path
    ], 1024 * 1024);

    return password.replace(/\r?\n$/, '');
  } catch (error) {
    throw new Error(`Unable to read macOS Keychain item for service “${service}” and account “${account}”: ${error.message}`);
  }
};

const validateGenericPasswordReference = async ({ service, account, keychainId }) => {
  if (typeof service !== 'string' || !service || typeof account !== 'string' || !account || typeof keychainId !== 'string' || !keychainId) {
    throw new Error('A Keychain item reference is required');
  }

  const keychain = (await getUserKeychains()).find((candidate) => candidate.id === keychainId);
  if (!keychain) {
    throw new Error('The selected Keychain is no longer available');
  }

  const dump = await runSecurityCommand(['dump-keychain', keychain.path]);
  const exists = parseGenericPasswordEntries(dump)
    .some((entry) => entry.service === service && entry.account === account);
  if (!exists) {
    throw new Error(`Keychain item for service “${service}” and account “${account}” was not found`);
  }

  return true;
};

const getGenericPassword = async (reference) => {
  const cacheKey = getPasswordCacheKey(reference);
  if (passwordCache.has(cacheKey)) return passwordCache.get(cacheKey);

  const password = await readGenericPassword(reference);
  passwordCache.set(cacheKey, password);
  return password;
};

const refreshGenericPassword = async (reference) => {
  const cacheKey = getPasswordCacheKey(reference);
  passwordCache.delete(cacheKey);
  const password = await readGenericPassword(reference);
  passwordCache.set(cacheKey, password);
  return password;
};

module.exports = {
  listGenericPasswordKeychains,
  getGenericPassword,
  refreshGenericPassword,
  validateGenericPasswordReference,
  parseGenericPasswordEntries,
  getKeychainId
};
