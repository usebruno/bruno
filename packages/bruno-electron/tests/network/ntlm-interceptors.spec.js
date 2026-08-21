jest.mock('../../src/store/preferences', () => require('./helpers/app-state').preferences);
jest.mock('../../src/store/bruno-config', () => require('./helpers/app-state').brunoConfig);
jest.mock('../../src/store/system-proxy', () => require('./helpers/app-state').systemProxy);

const { appState, resetAppState, disableTlsVerification, trustCertificateAsCustomCa } = require('./helpers/app-state');
const { credentials, buildRequest, CUSTOM_CA_PATH } = require('./helpers/ntlm-request');
const { sendThroughStubAdapter, negotiateThroughStubAdapter } = require('./helpers/stub-adapter');
const replies = require('./helpers/stub-responses');

beforeEach(resetAppState);

describe('a request negotiating ntlm', () => {
  const send = ({ responses, ...overrides }) =>
    negotiateThroughStubAdapter({
      request: buildRequest({ ...overrides, ntlmConfig: credentials }),
      responses: [replies.bareChallenge, replies.type2Challenge(), ...responses]
    });

  test('negotiates every leg over one agent', async () => {
    const { response, calls, legTypesAsSent } = await send({ responses: [replies.ok] });

    expect(legTypesAsSent).toEqual([null, 1, 3]);
    expect(new Set(calls.map((call) => call.httpsAgent)).size).toBe(1);
    expect(response.status).toBe(200);
  });

  test('skips certificate verification when the user turned it off', async () => {
    disableTlsVerification();

    const { calls } = await send({ responses: [replies.ok] });

    expect(calls.map((call) => call.httpsAgent.options.rejectUnauthorized)).toEqual([false, false, false]);
  });

  test('follows a 302 to its target', async () => {
    const { response, calls } = await send({
      responses: [replies.redirectTo('https://ntlm.example.com/landing'), replies.ok]
    });

    expect(calls.at(-1).url).toBe('https://ntlm.example.com/landing');
    expect(response.status).toBe(200);
  });

  test('attaches a timeline to the response', async () => {
    const { response } = await send({ responses: [replies.ok] });

    const rows = response.timeline.map((entry) => entry.type).filter((type) => type !== 'info' && type !== 'separator');

    expect(rows).toEqual(['request', 'response', 'responseHeader']);
  });

  test('reports how long the response took', async () => {
    const { response } = await send({ responses: [replies.ok] });

    expect(response.headers['request-duration']).toEqual(expect.any(Number));
  });

  test('drops a header removed by req.deleteHeader() from every leg', async () => {
    const { calls } = await send({
      headers: { 'X-Remove-Me': 'leak' },
      __headersToDelete: ['X-Remove-Me'],
      responses: [replies.ok]
    });

    expect(calls.map((call) => call.headers['X-Remove-Me'])).toEqual([null, null, null]);
  });
});

describe('a collection using a custom CA certificate', () => {
  const httpsAgentOptionsFor = async (request) => {
    trustCertificateAsCustomCa(CUSTOM_CA_PATH);
    appState.shouldKeepDefaultCaCertificates = false;

    const { calls } = await sendThroughStubAdapter({ request, responses: [replies.ok] });
    return calls[0].httpsAgent.options;
  };

  test('builds an identical https agent, including the certificate, with and without ntlm auth', async () => {
    const withoutNtlm = await httpsAgentOptionsFor(buildRequest());
    const withNtlm = await httpsAgentOptionsFor({ ...buildRequest(), ntlmConfig: { ...credentials } });

    expect(withNtlm).toEqual(withoutNtlm);
  });
});
