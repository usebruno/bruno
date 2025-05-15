const { configureRequest } = require('../../src/ipc/network/network');

describe('index: configureRequest', () => {
  it("Should add 'http://' to the URL if no protocol is specified", async () => {
    const request = { method: 'GET', url: 'test-domain', body: {} };
    await configureRequest(null, request, null, null, null, null);
    expect(request.url).toEqual('http://test-domain');
  });

  it("Should NOT add 'http://' to the URL if a protocol is specified", async () => {
    const request = { method: 'GET', url: 'ftp://test-domain', body: {} };
    await configureRequest(null, request, null, null, null, null);
    expect(request.url).toEqual('ftp://test-domain');
  });
});
