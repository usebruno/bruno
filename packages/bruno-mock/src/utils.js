const SENSITIVE_NAME_PATTERNS = [
  /^authorization$/i,
  /^proxy-authorization$/i,
  /^cookie$/i,
  /^set-cookie$/i,
  /^x-api-key$/i,
  /^x-auth-token$/i,
  /^x-access-token$/i,
  /^x-csrf-token$/i,
  /api[_-]?key/i,
  /token/i,
  /access[_-]?token/i,
  /auth[_-]?token/i,
  /secret/i,
  /password/i
];

const REDACTED_VALUE = '<redacted>';

const isSensitiveName = (name) => {
  if (!name) return false;
  return SENSITIVE_NAME_PATTERNS.some((re) => re.test(name));
};

const simpleHash = (str) => {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash &= hash;
  }
  return new Uint32Array([hash])[0].toString(36);
};

const generateUidBasedOnHash = (str) => {
  const hash = simpleHash(str);

  return `${hash}`.padEnd(21, '0');
};

module.exports = {
  REDACTED_VALUE,
  generateUidBasedOnHash,
  isSensitiveName
};
