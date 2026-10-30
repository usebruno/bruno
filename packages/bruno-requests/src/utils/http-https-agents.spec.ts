import https from 'node:https';
import { getHttpHttpsAgents } from './http-https-agents';
import { clearAgentCache } from './agent-cache';

describe('getHttpHttpsAgents CA bundle', () => {
  afterEach(() => {
    clearAgentCache();
  });

  it('omits ca for default-trust HTTPS so Node uses its native store', async () => {
    const { httpsAgent } = await getHttpHttpsAgents({
      requestUrl: 'https://example.com',
      collectionPath: process.cwd(),
      options: {
        noproxy: true,
        shouldVerifyTls: true,
        shouldUseCustomCaCertificate: false,
        shouldKeepDefaultCaCertificates: true
      }
    });

    expect(httpsAgent).toBeInstanceOf(https.Agent);
    expect((httpsAgent as https.Agent).options.ca).toBeUndefined();
    expect((httpsAgent as https.Agent).options.secureContext).toBeUndefined();
  });
});
