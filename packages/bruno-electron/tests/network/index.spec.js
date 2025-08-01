const { configureRequest, getCertsAndProxyConfig } = require('../../src/ipc/network/index');

describe('index', () => {
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
  describe('index: getCertsAndProxyConfig', () => {
    it('Should configure rejectUnauthorized to be false when disableSslVerification is true', async () => {
      const request = { method: 'GET', url: 'https://test-domain', settings: { disableSslVerification: true } };
      const { httpsAgentRequestFields } = await getCertsAndProxyConfig({
        request,
        collectionUid: null,
        envVars: {},
        runtimeVariables: {},
        processEnvVars: {},
        collectionPath: null
      });
      expect(httpsAgentRequestFields.rejectUnauthorized).toBe(false);
    });
  })
});
