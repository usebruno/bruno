jest.mock('../../src/store/preferences', () => require('./helpers/app-state').preferences);
jest.mock('../../src/store/bruno-config', () => require('./helpers/app-state').brunoConfig);
jest.mock('../../src/store/system-proxy', () => require('./helpers/app-state').systemProxy);
jest.mock('../../src/utils/cookies', () => require('./helpers/app-state').cookies);

const { appState, resetAppState } = require('./helpers/app-state');
const { startNtlmEndpoint, sendRequest } = require('./helpers/ntlm-request');

let server;
let baseUrl;
let legs;

const BODY = '{"hello":"world"}';

const send = (overrides = {}) => sendRequest({ url: `${baseUrl}/api`, ...overrides });

beforeEach(async () => {
  resetAppState();
  server = await startNtlmEndpoint();
  legs = server.legs;
  baseUrl = server.baseUrl;
});

afterEach(async () => {
  await server.close();
});

describe('an ntlm request against a live server', () => {
  test('completes the negotiate, challenge and authenticate legs over a single connection', async () => {
    const response = await send();

    expect(server.messageTypesSeen()).toEqual([null, 1, 3]);
    expect(server.connectionsUsed()).toBe(1);
    expect(response.status).toBe(200);
  });

  test('keeps a streamed response on that single connection', async () => {
    const response = await send({ responseType: 'stream' });
    await new Promise((resolve, reject) => {
      response.data.once('end', resolve);
      response.data.once('error', reject);
      response.data.resume();
    });

    expect(server.messageTypesSeen()).toEqual([null, 1, 3]);
    expect(server.connectionsUsed()).toBe(1);
  });

  test('sends the request body on every leg, so the authenticated one carries it', async () => {
    const response = await send({ method: 'POST', headers: { 'Content-Type': 'application/json' }, data: BODY });

    expect(legs.map((leg) => leg.body)).toEqual([BODY, BODY, BODY]);
    expect(response.status).toBe(200);
  });

  test('sends stored cookies on every leg of the handshake', async () => {
    appState.shouldSendCookies = true;
    appState.cookieString = 'session=abc';

    const response = await send();

    expect(response.status).toBe(200);
    expect(legs.map((leg) => leg.cookie)).toEqual(['session=abc', 'session=abc', 'session=abc']);
  });

  test('follows a redirect on the connection it authenticated when agent caching keeps that connection', async () => {
    appState.isSslSessionCachingEnabled = true;

    const response = await send({ url: `${baseUrl}/redirect?to=${baseUrl}/landing` });

    expect(response.status).toBe(200);
    expect(response.data).toMatchObject({ url: '/landing' });
    expect(server.connectionsUsed()).toBe(1);
  });

  test('cannot re-authenticate a redirect that a fresh agent moves onto a new connection', async () => {
    await expect(send({ url: `${baseUrl}/redirect?to=${baseUrl}/landing` })).rejects.toThrow('status code 401');

    expect(server.messageTypesSeen()).toEqual([null, 1, 3, 3]);
    expect(server.connectionsUsed()).toBe(2);
  });
});
