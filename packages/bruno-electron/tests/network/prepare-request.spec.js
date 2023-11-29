const prepareRequest = require('../../src/ipc/network/prepare-request');

describe('prepare-request: prepareRequest', () => {
  it("Should add 'http://' to the URL if no protocol is specified", () => {
    const request = prepareRequest({ method: 'GET', url: 'test', body: {} });
    expect(request.url).toEqual('http://test');
  });

  it("Should NOT add 'http://' to the URL if a protocol is specified", () => {
    const request = prepareRequest({ method: 'GET', url: 'ftp://test', body: {} });
    expect(request.url).toEqual('ftp://test');
  });
});
