jest.mock('../../src/store/preferences', () => require('./helpers/app-state').preferences);
jest.mock('../../src/store/bruno-config', () => require('./helpers/app-state').brunoConfig);
jest.mock('../../src/store/system-proxy', () => require('./helpers/app-state').systemProxy);

const { appState, resetAppState, disableTlsVerification, trustCertificateAsCustomCa } = require('./helpers/app-state');
const {
  credentials,
  buildRequest,
  sendThroughStubTransport,
  okResponse,
  redirectResponse,
  CUSTOM_CA_PATH
} = require('./helpers/ntlm-request');

beforeEach(resetAppState);

describe.each([
  ['without ntlm auth', null],
  ['with ntlm auth', credentials]
])('a request %s', (_label, ntlmConfig) => {
  const withAuth = (request) => (ntlmConfig ? { ...request, ntlmConfig: { ...ntlmConfig } } : request);

  test('skips certificate verification when the user turned it off', async () => {
    disableTlsVerification();

    const { calls } = await sendThroughStubTransport({ request: withAuth(buildRequest()), responses: [okResponse] });

    expect(calls[0].httpsAgent.options.rejectUnauthorized).toBe(false);
  });

  test('follows a 302 to its target', async () => {
    const { response, calls } = await sendThroughStubTransport({
      request: withAuth(buildRequest()),
      responses: [redirectResponse('https://ntlm.example.com/landing'), okResponse]
    });

    expect(calls).toHaveLength(2);
    expect(calls[1].url).toBe('https://ntlm.example.com/landing');
    expect(response.status).toBe(200);
  });

  test('attaches a timeline to the response', async () => {
    const { response } = await sendThroughStubTransport({ request: withAuth(buildRequest()), responses: [okResponse] });

    const rows = response.timeline.map((entry) => entry.type).filter((type) => type !== 'info' && type !== 'separator');

    expect(rows).toEqual(['request', 'response', 'responseHeader']);
  });

  test('reports how long the response took', async () => {
    const { response } = await sendThroughStubTransport({ request: withAuth(buildRequest()), responses: [okResponse] });

    expect(response.headers['request-duration']).toEqual(expect.any(Number));
  });

  test('drops a header removed by req.deleteHeader()', async () => {
    const { calls } = await sendThroughStubTransport({
      request: withAuth(buildRequest({ headers: { 'X-Remove-Me': 'leak' }, __headersToDelete: ['X-Remove-Me'] })),
      responses: [okResponse]
    });

    expect(calls[0].headers['X-Remove-Me']).toBeNull();
  });
});

describe('a collection using a custom CA certificate', () => {
  const httpsAgentOptionsFor = async (request) => {
    trustCertificateAsCustomCa(CUSTOM_CA_PATH);
    appState.shouldKeepDefaultCaCertificates = false;

    const { calls } = await sendThroughStubTransport({ request, responses: [okResponse] });
    return calls[0].httpsAgent.options;
  };

  test('builds an identical https agent, including the certificate, with and without ntlm auth', async () => {
    const withoutNtlm = await httpsAgentOptionsFor(buildRequest());
    const withNtlm = await httpsAgentOptionsFor({ ...buildRequest(), ntlmConfig: { ...credentials } });

    expect(withNtlm).toEqual(withoutNtlm);
  });
});
