const JSON_CONTRACT_VERSION = 1;
const SUPPORTED_VERSIONS = Object.freeze([1]);

const isSupportedVersion = (n) => SUPPORTED_VERSIONS.includes(n);

const negotiateVersion = (requested) => {
  if (requested === undefined || requested === null || requested === '') {
    return JSON_CONTRACT_VERSION;
  }
  const n = Number(requested);
  if (!Number.isInteger(n) || !isSupportedVersion(n)) {
    return null;
  }
  return n;
};

module.exports = {
  JSON_CONTRACT_VERSION,
  SUPPORTED_VERSIONS,
  isSupportedVersion,
  negotiateVersion
};
