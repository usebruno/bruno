const { parseGenericPasswordEntries } = require('../macos-keychain');

describe('parseGenericPasswordEntries', () => {
  it('lists generic password metadata without returning password values', () => {
    const dump = `keychain: "login.keychain-db"
class: "inet"
attributes:
    "acct"<blob>="web-account"
    "srvr"<blob>="example.com"
class: "genp"
attributes:
    "acct"<blob>="bruno-user"
    "svce"<blob>="Bruno API"
    "labl"<blob>="Bruno API token"
    "data"<blob>="should-not-be-returned"
class: "genp"
attributes:
    "acct"<blob>="bruno-user"
    "svce"<blob>="Bruno API"
    "labl"<blob>="Bruno API token"`;

    expect(parseGenericPasswordEntries(dump)).toEqual([
      { service: 'Bruno API', account: 'bruno-user', label: 'Bruno API token' }
    ]);
  });

  it('unescapes quoted service and account attributes', () => {
    const dump = `class: "genp"
attributes:
    "acct"<blob>="bruno\\"user"
    "svce"<blob>="Bruno \\\\ API"`;

    expect(parseGenericPasswordEntries(dump)).toEqual([
      { service: 'Bruno \\ API', account: 'bruno"user', label: 'Bruno \\ API' }
    ]);
  });
});
