import * as path from 'path';
import { test, expect, closeElectronApp, type ElectronApplication, type Page } from '../../../playwright';
import {
  buildCommonLocators,
  openRequest,
  selectResponsePaneTab,
  sendRequest,
  waitForReadyPage
} from '../../utils/page';
import { buildTimelineHeaderLocators } from '../../utils/page/timeline-headers';
import { startNtlmServer, type NtlmEndpoint } from '@usebruno/tests/ntlm';

const PASSWORD = 'Br!unoNtlm';

test.describe('ntlm over a real connection', () => {
  let endpoint: NtlmEndpoint;
  let app: ElectronApplication;
  let page: Page;

  test.beforeEach(async ({ launchElectronApp, collectionFixturePath }) => {
    endpoint = await startNtlmServer({ password: PASSWORD });

    app = await launchElectronApp({
      initUserDataPath: path.join(__dirname, 'init-user-data'),
      templateVars: { collectionPath: collectionFixturePath! },
      dotEnv: { NTLM_BASE_URL: endpoint.baseUrl }
    });

    page = await waitForReadyPage(app);
  });

  test.afterEach(async () => {
    await endpoint?.close();
    if (app) await closeElectronApp(app);
  });

  test('negotiates and authenticates over a single connection', async () => {
    await test.step('send a request with ntlm auth', async () => {
      await openRequest(page, 'ntlm', 'api');
      await sendRequest(page, 200);
    });

    await test.step('the server saw one full handshake on one connection', async () => {
      expect(endpoint.messageTypesSeen()).toEqual([null, 1, 3]);
      expect(endpoint.requests.map((request) => request.provedPassword)).toEqual([undefined, undefined, true]);
      expect(endpoint.connectionsUsed()).toBe(1);
    });
  });

  test('is challenged without authenticating when the request has no ntlm auth', async () => {
    await test.step('send a request without auth', async () => {
      await openRequest(page, 'ntlm', 'no-auth');
      await sendRequest(page, 401);
    });

    await test.step('the server saw only the anonymous request', async () => {
      expect(endpoint.messageTypesSeen()).toEqual([null]);
    });
  });

  test('is refused when the password is wrong', async () => {
    await test.step('send a request with the wrong password', async () => {
      await openRequest(page, 'ntlm', 'wrong-password');
      await sendRequest(page, 401);
    });

    await test.step('the server rejected the finished message', async () => {
      expect(endpoint.messageTypesSeen()).toEqual([null, 1, 3]);
      expect(endpoint.requests.map((request) => request.provedPassword)).toEqual([undefined, undefined, false]);
    });
  });

  test('sends the body on every request of the handshake and drops a header removed by a script', async () => {
    await test.step('send a request with a body and a pre-request script', async () => {
      await openRequest(page, 'ntlm', 'body');
      await sendRequest(page, 200);
    });

    await test.step('every leg carried the body and none carried the dropped header', async () => {
      expect(endpoint.requests.map((request) => request.body)).toEqual(['{"hello":"world"}', '{"hello":"world"}', '{"hello":"world"}']);
      expect(endpoint.requests.map((request) => request.headers['x-dropped'])).toEqual([undefined, undefined, undefined]);
    });
  });

  test('negotiates again for the connection a same host redirect moves onto', async () => {
    await test.step('send a request that is redirected on the same host', async () => {
      await openRequest(page, 'ntlm', 'redirect');
      await sendRequest(page, 200);
    });

    await test.step('the server saw a handshake on each of two connections', async () => {
      expect(endpoint.messageTypesSeen()).toEqual([null, 1, 3, null, 1, 3]);
      expect(endpoint.connectionsUsed()).toBe(2);
    });
  });

  test('only ever puts X-retry on a request that carries the finished message', async () => {
    await test.step('send a request that is redirected on the same host', async () => {
      await openRequest(page, 'ntlm', 'redirect');
      await sendRequest(page, 200);
    });

    await test.step('X-retry travelled only with the type 3 messages', async () => {
      const carryingRetry = endpoint.requests.filter((request) => request.headers['x-retry'] !== undefined);

      expect(carryingRetry.map((request) => request.type)).toEqual([3, 3]);
    });
  });

  test('logs only the request that carried the finished message on the timeline', async () => {
    const { timeline } = buildCommonLocators(page);
    const timelineHeaders = buildTimelineHeaderLocators(page);

    await test.step('send a request with ntlm auth', async () => {
      await openRequest(page, 'ntlm', 'api');
      await sendRequest(page, 200);
    });

    await test.step('the timeline shows one hop carrying the NTLM header', async () => {
      await selectResponsePaneTab(page, 'Timeline');
      await timeline.itemHeader(timeline.items().first()).click();
      await timelineHeaders.networkTab().click();

      const hops = await timelineHeaders.requestHops();

      expect(hops.map((hop) => hop.request)).toEqual([`GET ${endpoint.baseUrl}/api`]);
      expect(hops.map((hop) => hop.headerLines.join('\n'))).toEqual([expect.stringMatching(/authorization: NTLM/i)]);
    });
  });

  test('reports how long the answer took', async () => {
    const { response } = buildCommonLocators(page);

    await test.step('send a request with ntlm auth', async () => {
      await openRequest(page, 'ntlm', 'api');
      await sendRequest(page, 200);
    });

    await test.step('the status line shows status, duration and size', async () => {
      await expect(response.status()).toHaveText(/^200 OK \d+(ms|\.\d+s)\d+B$/);
    });
  });
});

test.describe('ntlm when a redirect leaves for another host', () => {
  let endpoint: NtlmEndpoint;
  let otherHost: NtlmEndpoint;
  let app: ElectronApplication;
  let page: Page;

  test.beforeEach(async ({ launchElectronApp, collectionFixturePath }) => {
    endpoint = await startNtlmServer({ password: PASSWORD });
    otherHost = await startNtlmServer({ password: PASSWORD });

    app = await launchElectronApp({
      initUserDataPath: path.join(__dirname, 'init-user-data'),
      templateVars: { collectionPath: collectionFixturePath! },
      dotEnv: { NTLM_BASE_URL: endpoint.baseUrl, NTLM_REDIRECT_URL: otherHost.baseUrl }
    });

    page = await waitForReadyPage(app);
  });

  test.afterEach(async () => {
    await endpoint?.close();
    await otherHost?.close();
    if (app) await closeElectronApp(app);
  });

  test('negotiates with the host a redirect leaves for when the request forwards authorization', async () => {
    await test.step('send a request redirected to another host with authorization forwarding on', async () => {
      await openRequest(page, 'ntlm', 'other-host-forwarded');
      await sendRequest(page, 200);
    });

    await test.step('both hosts saw a full handshake', async () => {
      expect(endpoint.messageTypesSeen()).toEqual([null, 1, 3]);
      expect(otherHost.messageTypesSeen()).toEqual([null, 1, 3]);
    });
  });

  test('leaves that host unauthenticated when the request does not forward authorization', async () => {
    await test.step('send a request redirected to another host with authorization forwarding off', async () => {
      await openRequest(page, 'ntlm', 'other-host-blocked');
      await sendRequest(page, 401);
    });

    await test.step('the other host saw only an anonymous request carrying neither Authorization nor X-retry', async () => {
      expect(endpoint.messageTypesSeen()).toEqual([null, 1, 3]);
      expect(otherHost.messageTypesSeen()).toEqual([null]);
      expect(otherHost.requests[0].headers.authorization).toBeUndefined();
      expect(otherHost.requests[0].headers['x-retry']).toBeUndefined();
    });
  });
});
