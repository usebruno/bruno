const vaultVariableRegex = /{{vault\s?\|(?<path>[^|]*)(\s?\|(?<jsonPath>[^|}]*))?}}/g;
const vaultVariableInnerRegex = /vault\s?\|(?<path>[^|]*)(\s?\|(?<jsonPath>[^|}]*))?/;
module.exports = {
  vaultVariableRegex,
  vaultVariableInnerRegex
};
