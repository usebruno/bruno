const { doesRequestMatchSearchText } = require('./search');

const sampleRequest = { name: 'MyRequestName', request: { url: '{{myServer}}/api/v1/user/:userId' } };

describe('Collection Utils - Search - doesRequestMatchSearchText', () => {
  it('should match when no searchText is given', () => {
    expect(doesRequestMatchSearchText(sampleRequest)).toBeTruthy();
  });

  it('should match the requests name (case-insensitive)', () => {
    expect(doesRequestMatchSearchText(sampleRequest, 'equestnam')).toBeTruthy();
  });

  it('should match the requests url (case-insensitive)', () => {
    expect(doesRequestMatchSearchText(sampleRequest, '/USER/:userid')).toBeTruthy();
  });

  it('should not match text that is not in the request', () => {
    expect(doesRequestMatchSearchText(sampleRequest, 'lorem ipsum')).toBeFalsy();
  });
});
