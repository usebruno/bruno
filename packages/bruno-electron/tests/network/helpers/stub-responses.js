const { type2Message } = require('../../../../bruno-tests/src/ntlm');

module.exports = {
  ok: { status: 200 },
  redirectTo: (location) => ({ status: 302, statusText: 'Found', headers: { location } }),
  bareChallenge: { status: 401, headers: { 'www-authenticate': 'NTLM' } },
  type2Challenge: () => ({ status: 401, headers: { 'www-authenticate': type2Message() } })
};
