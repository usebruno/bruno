/**
 * E2E tests for OAuth2 callback `state` validation (authorization code + implicit grant).
 *
 * Bruno issues `state` on the authorization URL when the flow starts. The callback must
 * return that same `state`. These tests compare issued vs returned `state` — the
 * authorization code / access token values are arbitrary provider payloads.
 *
 * `shell.openExternal` is stubbed so no real browser opens; the authorization URL is
 * captured to obtain the issued state. Callbacks are delivered via the real
 * `second-instance` protocol handler — the same path the OS uses for
 * `bruno://app/oauth2/callback` deep links. A wrapped `second-instance` listener
 * records the URL Bruno actually receives.
 *
 * Oracles:
 *   - authorization code: callback URI + error/success toast + bruno-tests token endpoint
 *   - implicit grant: callback URI + error/success toast (no token exchange POST)
 *
 * Requires the bruno-tests server (`packages/bruno-tests`, default port 8081).
 *
 * Fixtures (auto-loaded by Playwright):
 *   - fixtures/collection  → oauth2-state collection (Authorization Code + Implicit requests)
 *   - init-user-data         → preloads collection, enables system-browser OAuth2 mode
 */

import type { ElectronApplication } from 'playwright';
import { test, expect, waitForReadyPage } from '../../../playwright';
import { openRequest, selectRequestPaneTab, selectEnvironment } from '../../utils/page';

const COLLECTION = 'oauth2-state';
const TESTBENCH = 'http://localhost:8081';
const CALLBACK = 'bruno://app/oauth2/callback';
const PROVIDER_AUTH_CODE = 'provider-auth-code';
const PROVIDER_ACCESS_TOKEN = 'provider-access-token';
const WRONG_STATE = 'not-the-issued-state';
const STATE_MISMATCH_ERROR
  = 'Error invoking remote method \'renderer:fetch-oauth2-credentials\': Error: OAuth2 state mismatch: the returned state does not match the issued state. Aborting to prevent authorization code injection.';

test.beforeAll(async () => {
  const response = await fetch(`${TESTBENCH}/ping`);
  expect(response.ok, `bruno-tests server should be running at ${TESTBENCH}`).toBeTruthy();
  expect(await response.text()).toBe('pong');
});

/** Register an auth code with the testbench by hitting the captured authorization URL. */
const registerAuthCodeWithTestbench = async (authorizationUrl: string): Promise<string> => {
  const response = await fetch(authorizationUrl);
  expect(response.ok, 'testbench authorize should respond').toBeTruthy();
  const html = await response.text();
  const match = html.match(/bruno:\/\/app\/oauth2\/callback\?code=([a-f0-9]+)/);
  expect(match, 'authorize response should embed a callback code').toBeTruthy();
  return match![1];
};

/** Fire a deep-link callback through the real protocol handler (cross-platform path). */
const fireCallback = (app: ElectronApplication, url: string) =>
  app.evaluate(({ app: electronApp }, callbackUrl) => {
    electronApp.emit('second-instance', {}, [callbackUrl]);
  }, url);

/**
 * Wrap the real `second-instance` listener so callback URLs are recorded when Bruno
 * receives them — same argv path as `getAppProtocolUrlFromArgv` in index.js.
 */
const installCallbackCapture = (app: ElectronApplication) =>
  app.evaluate(({ app: electronApp }) => {
    (globalThis as any).__brunoCapturedCallbackUrl = null;

    const listeners = electronApp.listeners('second-instance') as Array<
      (event: unknown, commandLine: string[]) => void
    >;

    electronApp.removeAllListeners('second-instance');

    for (const listener of listeners) {
      electronApp.on('second-instance', (event, commandLine) => {
        const url = commandLine?.find((arg) => arg?.startsWith('bruno://'));
        if (url) {
          (globalThis as any).__brunoCapturedCallbackUrl = url;
        }
        listener.call(electronApp, event, commandLine);
      });
    }
  });

const getCapturedCallbackUrl = (app: ElectronApplication): Promise<string | null> =>
  app.evaluate(() => (globalThis as any).__brunoCapturedCallbackUrl ?? null);

// This block stubs Electron's shell.openExternal inside the Bruno app
// so the OAuth2 test can intercept the authorization URL
// instead of opening a real browser.
const stubOpenExternal = (app: ElectronApplication) =>
  app.evaluate(({ shell }) => {
    (globalThis as any).__brunoCapturedAuthUrl = null;
    shell.openExternal = async (url: string) => {
      (globalThis as any).__brunoCapturedAuthUrl = url;
    };
  });

const getCapturedAuthUrl = (app: ElectronApplication): Promise<string | null> =>
  app.evaluate(() => (globalThis as any).__brunoCapturedAuthUrl ?? null);

const waitForAuthorizationStarted = async (app: ElectronApplication) => {
  await expect.poll(() => getCapturedAuthUrl(app), { timeout: 15_000 }).toBeTruthy();
};

type CallbackStyle = 'query' | 'hash';

const stateFromAuthorizationUrl = (url: string) => new URL(url).searchParams.get('state');

/** `state` Bruno sent on the authorization URL (stored internally as expectedState). */
const getIssuedState = async (app: ElectronApplication): Promise<string> => {
  const authUrl = await getCapturedAuthUrl(app);
  expect(authUrl, 'authorization URL should have been opened').toBeTruthy();
  const state = stateFromAuthorizationUrl(authUrl as string);
  expect(state, 'issued state should be present on the authorization URL').toBeTruthy();
  expect(state).toMatch(/^[0-9a-f]{32}$/);
  return state as string;
};

const clickGetAccessToken = async (page: Parameters<typeof openRequest>[0], requestName: string) => {
  await openRequest(page, COLLECTION, requestName);
  await selectEnvironment(page, 'Local', 'collection');
  await selectRequestPaneTab(page, 'Auth');
  await page.getByRole('button', { name: 'Get Access Token' }).click();
};

const getCallbackParams = (callbackUrl: string, style: CallbackStyle = 'query') => {
  const url = new URL(callbackUrl);
  if (style === 'hash') {
    const hashParams = new URLSearchParams(url.hash.slice(1));
    return {
      state: hashParams.get('state'),
      code: null,
      access_token: hashParams.get('access_token')
    };
  }
  return {
    state: url.searchParams.get('state'),
    code: url.searchParams.get('code'),
    access_token: null
  };
};

test.describe.serial('OAuth2 callback state validation', () => {
  test('authorization code: rejects callback when returned state does not match issued state', async ({ restartApp }) => {
    const app = await restartApp();
    const page = await waitForReadyPage(app);
    await stubOpenExternal(app);
    await installCallbackCapture(app);
    await clickGetAccessToken(page, 'Authorization Code');
    await waitForAuthorizationStarted(app);
    // await page.pause();

    const issuedState = await getIssuedState(app);
    const callbackUrl = `${CALLBACK}?code=${PROVIDER_AUTH_CODE}&state=${WRONG_STATE}`;

    await fireCallback(app, callbackUrl);

    const receivedCallbackUrl = await getCapturedCallbackUrl(app);
    expect(receivedCallbackUrl).toBe(callbackUrl);

    const { state: returnedState, code } = getCallbackParams(receivedCallbackUrl as string);
    expect(returnedState).toBe(WRONG_STATE);
    expect(returnedState).not.toBe(issuedState);
    expect(code).toBe(PROVIDER_AUTH_CODE);

    await expect(
      page.getByTestId('response-pane').getByText(STATE_MISMATCH_ERROR)
    ).toBeVisible({ timeout: 15_000 });
    await expect(
      page.getByRole('status').filter({ hasText: STATE_MISMATCH_ERROR })
    ).toBeVisible({ timeout: 15_000 });
    // await page.pause();
  });

  test('implicit grant: rejects callback when returned state does not match issued state', async ({ restartApp }) => {
    const app = await restartApp();
    const page = await waitForReadyPage(app);
    await stubOpenExternal(app);
    await installCallbackCapture(app);

    await clickGetAccessToken(page, 'Implicit');
    await waitForAuthorizationStarted(app);

    const issuedState = await getIssuedState(app);
    const callbackUrl = `${CALLBACK}#access_token=${PROVIDER_ACCESS_TOKEN}&token_type=Bearer&state=${WRONG_STATE}`;

    await fireCallback(app, callbackUrl);

    const receivedCallbackUrl = await getCapturedCallbackUrl(app);
    expect(receivedCallbackUrl).toBe(callbackUrl);

    const { state: returnedState, access_token } = getCallbackParams(receivedCallbackUrl as string, 'hash');
    expect(returnedState).toBe(WRONG_STATE);
    expect(returnedState).not.toBe(issuedState);
    expect(access_token).toBe(PROVIDER_ACCESS_TOKEN);

    await expect(
      page.getByTestId('response-pane').getByText(STATE_MISMATCH_ERROR)
    ).toBeVisible({ timeout: 15_000 });
    await expect(
      page.getByRole('status').filter({ hasText: STATE_MISMATCH_ERROR })
    ).toBeVisible({ timeout: 15_000 });
    await expect(page.getByText('Token fetched successfully!')).not.toBeVisible();
  });

  test('authorization code: accepts callback when returned state matches issued state', async ({ restartApp }) => {
    test.setTimeout(60_000);
    const app = await restartApp();
    const page = await waitForReadyPage(app);
    await stubOpenExternal(app);
    await installCallbackCapture(app);

    await clickGetAccessToken(page, 'Authorization Code');
    await waitForAuthorizationStarted(app);

    const authUrl = await getCapturedAuthUrl(app);
    expect(authUrl).toBeTruthy();
    const issuedState = await getIssuedState(app);
    const authCode = await registerAuthCodeWithTestbench(authUrl as string);
    const callbackUrl = `${CALLBACK}?code=${authCode}&state=${encodeURIComponent(issuedState)}`;

    await fireCallback(app, callbackUrl);

    const receivedCallbackUrl = await getCapturedCallbackUrl(app);
    expect(receivedCallbackUrl).toBe(callbackUrl);

    const { state: returnedState, code } = getCallbackParams(receivedCallbackUrl as string);
    expect(returnedState).toBe(issuedState);
    expect(code).toBe(authCode);

    await expect(page.getByText('Token fetched successfully!')).toBeVisible({ timeout: 15_000 });
  });

  test('implicit grant: accepts callback when returned state matches issued state', async ({ restartApp }) => {
    test.setTimeout(60_000);
    const app = await restartApp();
    const page = await waitForReadyPage(app);
    await stubOpenExternal(app);
    await installCallbackCapture(app);

    await clickGetAccessToken(page, 'Implicit');
    await waitForAuthorizationStarted(app);

    const issuedState = await getIssuedState(app);
    const callbackUrl
      = `${CALLBACK}#access_token=${PROVIDER_ACCESS_TOKEN}&token_type=Bearer&expires_in=3600&state=${encodeURIComponent(issuedState)}`;

    await fireCallback(app, callbackUrl);

    const receivedCallbackUrl = await getCapturedCallbackUrl(app);
    expect(receivedCallbackUrl).toBe(callbackUrl);

    const { state: returnedState, access_token } = getCallbackParams(receivedCallbackUrl as string, 'hash');
    expect(returnedState).toBe(issuedState);
    expect(access_token).toBe(PROVIDER_ACCESS_TOKEN);

    await expect(page.getByText('Token fetched successfully!')).toBeVisible({ timeout: 15_000 });
  });
});
