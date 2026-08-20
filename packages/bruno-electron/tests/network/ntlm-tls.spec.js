jest.mock('../../src/store/preferences', () => require('./helpers/app-state').preferences);
jest.mock('../../src/store/bruno-config', () => require('./helpers/app-state').brunoConfig);
jest.mock('../../src/store/system-proxy', () => require('./helpers/app-state').systemProxy);

const { appState, resetAppState, disableTlsVerification, trustCertificateAsCustomCa } = require('./helpers/app-state');
const { startNtlmEndpoint, sendRequest, credentials } = require('./helpers/ntlm-request');
const { startProxyForHttps } = require('./helpers/proxies');

let server;

const startSelfSignedNtlmServer = (options) => startNtlmEndpoint({ ...options, tls: true });

const send = (overrides = {}) => sendRequest({ url: `${server.urlFor('localhost')}/api`, ...overrides });

const trustViaCustomCa = () => trustCertificateAsCustomCa(server.certPath);

beforeEach(async () => {
  resetAppState();
  server = await startSelfSignedNtlmServer();
});

afterEach(async () => {
  await server.close();
});

describe.each([
  ['tls verification turned off', disableTlsVerification],
  ['the server certificate trusted as a custom CA', trustViaCustomCa]
])('a self-signed https endpoint with %s', (_label, trustTheServer) => {
  test('reaches the server and is challenged when the request has no ntlm auth', async () => {
    trustTheServer();

    await expect(send({ ntlmConfig: null })).rejects.toMatchObject({
      response: { status: 401, headers: expect.objectContaining({ 'www-authenticate': 'NTLM' }) }
    });
  });

  test('authenticates over a single connection and returns the protected resource', async () => {
    trustTheServer();

    const response = await send();

    expect(response.status).toBe(200);
    expect(response.data).toMatchObject({ authenticated: true });
    expect(server.messageTypesSeen()).toEqual([null, 1, 3]);
    expect(server.connectionsUsed()).toBe(1);
  });
});

describe('ntlmv2 over https with the wrong password', () => {
  beforeEach(disableTlsVerification);

  test('is rejected by the server', async () => {
    await expect(send({ ntlmConfig: { ...credentials, password: 'wrong' } })).rejects.toMatchObject({
      response: { status: 401 }
    });
  });
});

describe('a self-signed https endpoint with tls verification left on', () => {
  test('fails the tls handshake before authenticating', async () => {
    await expect(send()).rejects.toMatchObject({ code: 'DEPTH_ZERO_SELF_SIGNED_CERT' });
  });
});

describe('ntlmv2 over an https endpoint that demands a client certificate', () => {
  beforeEach(async () => {
    await server.close();
    server = await startSelfSignedNtlmServer({ requireClientCert: true });
    disableTlsVerification();
    appState.globalClientCertificates = [
      {
        domain: 'localhost',
        type: 'cert',
        certFilePath: server.clientCertPath,
        keyFilePath: server.clientKeyPath
      }
    ];
  });

  test('authenticates while presenting the client certificate on every leg', async () => {
    const response = await send();

    expect(response.status).toBe(200);
    expect(response.data).toMatchObject({ authenticated: true });
    expect(server.messageTypesSeen()).toEqual([null, 1, 3]);
    expect(server.legs.map((leg) => leg.clientCertName)).toEqual(Array(3).fill(server.clientCertName));
    expect(server.connectionsUsed()).toBe(1);
  });

  test('fails when no client certificate is configured', async () => {
    appState.globalClientCertificates = [];

    await expect(send()).rejects.toMatchObject({ code: 'ERR_SSL_TLSV13_ALERT_CERTIFICATE_REQUIRED' });
  });
});

describe('ntlmv2 over an https endpoint reached through a connect proxy', () => {
  let proxy;

  beforeEach(async () => {
    proxy = await startProxyForHttps();
    disableTlsVerification();
    appState.brunoConfig = proxy.brunoConfig;
  });

  afterEach(async () => {
    await proxy.close();
  });

  test('authenticates over a single tunnel', async () => {
    const response = await send();

    expect(response.status).toBe(200);
    expect(response.data).toMatchObject({ authenticated: true });
    expect(proxy.tunnelsOpened()).toBe(1);
    expect(server.messageTypesSeen()).toEqual([null, 1, 3]);
    expect(server.connectionsUsed()).toBe(1);
  });
});
