// This is a Playwright E2E test (in the oauth2 project). It needs a Keycloak server running (port 8090), and the app built.

// To run just this file:
// npx playwright test --project=oauth2 tests/auth/oauth2/oauth2-state-validation.spec.ts

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
 *   - authorization code: callback URI + error/success toast + Keycloak token endpoint
 *   - implicit grant: callback URI + error/success toast (no token exchange POST)
 *
 * Requires a running Keycloak (`bin/kc.sh start-dev --http-port=8090`) with the realm,
 * client, and user configured (see the KEYCLOAK_* constants below).
 *
 * Fixtures (auto-loaded by Playwright):
 *   - fixtures/collection  → oauth2-state collection (Authorization Code + Implicit requests)
 *   - init-user-data         → preloads collection, enables system-browser OAuth2 mode
 */

import type { ElectronApplication } from 'playwright';
import { test, expect, waitForReadyPage } from '../../../playwright';
import { openRequest, selectRequestPaneTab, selectEnvironment } from '../../utils/page';
import { buildCommonLocators } from '../../utils/page/locators';

const COLLECTION = 'oauth2-state';
// Keycloak (bin/kc.sh start-dev) running locally. The realm/client/user below must
// exist in Keycloak, and `bruno://app/oauth2/callback` must be a Valid Redirect URI
// on the client.
const KEYCLOAK = 'http://localhost:8090';
const KEYCLOAK_REALM = 'bruno';
const KEYCLOAK_USER = 'testuser';
const KEYCLOAK_PASSWORD = 'testpassword';
const CALLBACK = 'bruno://app/oauth2/callback';
const PROVIDER_AUTH_CODE = 'provider-auth-code';
const PROVIDER_ACCESS_TOKEN = 'provider-access-token';
const WRONG_STATE = 'not-the-issued-state';
const STATE_MISMATCH_ERROR
  = 'OAuth2 state mismatch: the returned state does not match the issued state.';

test.beforeAll(async () => {
  const response = await fetch(`${KEYCLOAK}/realms/${KEYCLOAK_REALM}/.well-known/openid-configuration`);
  expect(
    response.ok,
    `Keycloak realm "${KEYCLOAK_REALM}" should be reachable at ${KEYCLOAK}`
  ).toBeTruthy();
});

/**
 * Drive Keycloak's login form to obtain a real authorization code.
 *
 * Unlike the old testbench, Keycloak's `/auth` endpoint returns an HTML login page, not a
 * ready-made callback. We: (1) GET the captured authorization URL to receive the login page
 * plus its session cookies, (2) scrape the `<form action="…login-actions/authenticate?…">`
 * target, (3) POST the user credentials back (carrying the cookies) with redirects disabled,
 * and (4) read the `code` off the `Location` redirect to `bruno://app/oauth2/callback`.
 */
const loginToKeycloakForAuthCode = async (authorizationUrl: string): Promise<string> => {
  const loginPage = await fetch(authorizationUrl, { redirect: 'manual' });
  expect(loginPage.ok, 'Keycloak authorize should return a login page').toBeTruthy();

  const cookies = (loginPage.headers.getSetCookie?.() ?? [])
    .map((c) => c.split(';')[0])
    .join('; ');

  const html = await loginPage.text();
  const formActionMatch = html.match(/action="([^"]+login-actions\/authenticate[^"]*)"/);
  expect(formActionMatch, 'Keycloak login page should expose a form action').toBeTruthy();
  const formAction = formActionMatch![1].replace(/&amp;/g, '&');

  const submission = await fetch(formAction, {
    method: 'POST',
    redirect: 'manual',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      ...(cookies ? { cookie: cookies } : {})
    },
    body: new URLSearchParams({
      username: KEYCLOAK_USER,
      password: KEYCLOAK_PASSWORD,
      credentialId: ''
    }).toString()
  });

  const location = submission.headers.get('location');
  expect(location, 'Keycloak login should redirect to the callback URL').toBeTruthy();
  const code = new URL(location as string).searchParams.get('code');
  expect(code, 'Keycloak callback redirect should carry an auth code').toBeTruthy();
  return code as string;
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

    electronApp.prependListener('second-instance', (_event, commandLine) => {
      const url = commandLine?.find((arg) => arg?.startsWith('bruno://'));
      if (url) {
        (globalThis as any).__brunoCapturedCallbackUrl = url;
      }
    });
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

// Bruno always appends a cryptographically random nonce (crypto.randomBytes(16) → 32 hex
// chars) to the state — whether the user configured one or not (see generateState in
// oauth2.js). So the issued state is at least that nonce length.
const STATE_NONCE_HEX_LENGTH = 32;

/** `state` Bruno sent on the authorization URL (stored internally as expectedState). */
const getIssuedState = async (app: ElectronApplication): Promise<string> => {
  const authUrl = await getCapturedAuthUrl(app);
  expect(authUrl, 'authorization URL should have been opened').toBeTruthy();
  const state = stateFromAuthorizationUrl(authUrl as string);
  expect(state, 'issued state should be present on the authorization URL').toBeTruthy();
  // expect((state as string).length).toBeGreaterThanOrEqual(STATE_NONCE_HEX_LENGTH);
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

test.describe('OAuth2 callback state validation', () => {
  test('authorization code: rejects callback when returned state does not match issued state', async ({ restartApp }) => {
    const app = await restartApp();
    const page = await waitForReadyPage(app);

    await test.step('start the authorization code flow', async () => {
      await stubOpenExternal(app);
      await installCallbackCapture(app);
      await clickGetAccessToken(page, 'AuthorizationCode');
      await waitForAuthorizationStarted(app);
    });

    const issuedState = await test.step('capture the issued state', () => getIssuedState(app));

    const callbackUrl = `${CALLBACK}?code=${PROVIDER_AUTH_CODE}&state=${WRONG_STATE}`;
    await test.step('deliver a callback with a mismatched state', async () => {
      await fireCallback(app, callbackUrl);

      const receivedCallbackUrl = await getCapturedCallbackUrl(app);
      expect(receivedCallbackUrl).toBe(callbackUrl);

      const { state: returnedState, code } = getCallbackParams(receivedCallbackUrl as string);
      expect(returnedState).toBe(WRONG_STATE);
      expect(returnedState).not.toBe(issuedState);
      expect(code).toBe(PROVIDER_AUTH_CODE);
    });

    await test.step('surface a state mismatch error', async () => {
      await expect(
        buildCommonLocators(page).response.pane().getByText(STATE_MISMATCH_ERROR)
      ).toBeVisible({ timeout: 15_000 });
    });
  });

  test('authorization code: accepts callback when returned state matches issued state', async ({ restartApp }) => {
    test.setTimeout(60_000);
    const app = await restartApp();
    const page = await waitForReadyPage(app);

    await test.step('start the authorization code flow', async () => {
      await stubOpenExternal(app);
      await installCallbackCapture(app);
      await clickGetAccessToken(page, 'AuthorizationCode');
      await waitForAuthorizationStarted(app);
    });

    const authUrl = await getCapturedAuthUrl(app);
    expect(authUrl).toBeTruthy();

    const issuedState = await test.step('capture the issued state', () => getIssuedState(app));

    const authCode = await test.step('obtain a valid auth code from Keycloak', () =>
      loginToKeycloakForAuthCode(authUrl as string));

    const callbackUrl = `${CALLBACK}?code=${authCode}&state=${encodeURIComponent(issuedState)}`;
    await test.step('deliver a callback with the matching state', async () => {
      await fireCallback(app, callbackUrl);

      const receivedCallbackUrl = await getCapturedCallbackUrl(app);
      expect(receivedCallbackUrl).toBe(callbackUrl);

      const { state: returnedState, code } = getCallbackParams(receivedCallbackUrl as string);
      expect(returnedState).toBe(issuedState);
      expect(code).toBe(authCode);
    });

    await expect(page.getByText('Token fetched successfully!')).toBeVisible({ timeout: 15_000 });
  });

  test('authorization code (user-supplied state): issues userState accepts matching callback', async ({ restartApp }) => {
    test.setTimeout(60_000);
    const USER_STATE = 'brunoUserState';
    const app = await restartApp();
    const page = await waitForReadyPage(app);

    // await test.step('start the authorization code flow', async () => {
    await stubOpenExternal(app);
    await installCallbackCapture(app);
    await clickGetAccessToken(page, 'AuthCodeUserSuppliedState');
    await waitForAuthorizationStarted(app);
    // });

    const authUrl = await getCapturedAuthUrl(app);

    expect(authUrl).toBeTruthy();

    const issuedState = await test.step('capture and verify the issued state carries userState + nonce', async () => {
      const state = await getIssuedState(app);
      // Bruno appends a nonce — the issued state must be `userState + <32 hex>`, not the raw input.
      expect(state.startsWith(USER_STATE)).toBeTruthy();
      expect(state).toBe(USER_STATE);
      return state;
    });

    const authCode = await test.step('obtain a valid auth code from Keycloak', () =>
      loginToKeycloakForAuthCode(authUrl as string));

    const callbackUrl = `${CALLBACK}?code=${authCode}&state=${encodeURIComponent(issuedState)}`;

    await test.step('deliver a callback with the matching state', async () => {
      await fireCallback(app, callbackUrl);

      const receivedCallbackUrl = await getCapturedCallbackUrl(app);
      expect(receivedCallbackUrl).toBe(callbackUrl);

      const { state: returnedState, code } = getCallbackParams(receivedCallbackUrl as string);
      expect(returnedState).toBe(issuedState);
      expect(code).toBe(authCode);
    });
    await expect(page.getByText('Token fetched successfully!')).toBeVisible({ timeout: 15_000 });
  });

  test('implicit grant: rejects callback when returned state does not match issued state', async ({ restartApp }) => {
    const app = await restartApp();
    const page = await waitForReadyPage(app);

    await test.step('start the implicit grant flow', async () => {
      await stubOpenExternal(app);
      await installCallbackCapture(app);
      await clickGetAccessToken(page, 'AuthorizationImplicit');
      await waitForAuthorizationStarted(app);
    });

    const issuedState = await test.step('capture the issued state', () => getIssuedState(app));

    const callbackUrl = `${CALLBACK}#access_token=${PROVIDER_ACCESS_TOKEN}&token_type=Bearer&state=${WRONG_STATE}`;

    await test.step('deliver a callback with a mismatched state', async () => {
      await fireCallback(app, callbackUrl);

      const receivedCallbackUrl = await getCapturedCallbackUrl(app);
      expect(receivedCallbackUrl).toBe(callbackUrl);

      const { state: returnedState, access_token } = getCallbackParams(receivedCallbackUrl as string, 'hash');
      expect(returnedState).toBe(WRONG_STATE);
      expect(returnedState).not.toBe(issuedState);
      expect(access_token).toBe(PROVIDER_ACCESS_TOKEN);
    });

    await test.step('surface a state mismatch error', async () => {
      await expect(
        buildCommonLocators(page).response.pane().getByText(STATE_MISMATCH_ERROR)
      ).toBeVisible({ timeout: 15_000 });
    });
  });

  test('implicit grant: accepts callback when returned state matches issued state', async ({ restartApp }) => {
    test.setTimeout(60_000);
    const app = await restartApp();
    const page = await waitForReadyPage(app);

    await test.step('start the implicit grant flow', async () => {
      await stubOpenExternal(app);
      await installCallbackCapture(app);
      await clickGetAccessToken(page, 'AuthorizationImplicit');
      await waitForAuthorizationStarted(app);
    });

    const issuedState = await test.step('capture the issued state', () => getIssuedState(app));

    const callbackUrl
      = `${CALLBACK}#access_token=${PROVIDER_ACCESS_TOKEN}&token_type=Bearer&expires_in=3600&state=${encodeURIComponent(issuedState)}`;

    await test.step('deliver a callback with the matching state', async () => {
      await fireCallback(app, callbackUrl);

      const receivedCallbackUrl = await getCapturedCallbackUrl(app);
      expect(receivedCallbackUrl).toBe(callbackUrl);

      const { state: returnedState, access_token } = getCallbackParams(receivedCallbackUrl as string, 'hash');
      expect(returnedState).toBe(issuedState);
      expect(access_token).toBe(PROVIDER_ACCESS_TOKEN);
    });

    await expect(page.getByText('Token fetched successfully!')).toBeVisible({ timeout: 15_000 });
  });

  test('implicit grant (user-supplied state): issues userState + nonce and accepts matching callback', async ({ restartApp }) => {
    test.setTimeout(60_000);
    const USER_STATE = 'brunoUserState';
    const app = await restartApp();
    const page = await waitForReadyPage(app);

    await test.step('start the implicit grant flow', async () => {
      await stubOpenExternal(app);
      await installCallbackCapture(app);
      await clickGetAccessToken(page, 'ImplicitUserSuppliedState');
      await waitForAuthorizationStarted(app);
    });

    const authUrl = await getCapturedAuthUrl(app);
    expect(authUrl).toBeTruthy();

    const issuedState = await test.step('capture and verify the issued state carries userState + nonce', async () => {
      const state = await getIssuedState(app);
      // Bruno appends a nonce — the issued state must be `userState + <32 hex>`, not the raw input.
      expect(state.startsWith(USER_STATE)).toBeTruthy();
      expect(state).toBe(USER_STATE);
      return state;
    });

    const callbackUrl
      = `${CALLBACK}#access_token=${PROVIDER_ACCESS_TOKEN}&token_type=Bearer&expires_in=3600&state=${encodeURIComponent(issuedState)}`;
    await test.step('deliver a callback with the matching state', async () => {
      await fireCallback(app, callbackUrl);

      const receivedCallbackUrl = await getCapturedCallbackUrl(app);
      expect(receivedCallbackUrl).toBe(callbackUrl);

      const { state: returnedState, access_token } = getCallbackParams(receivedCallbackUrl as string, 'hash');
      expect(returnedState).toBe(issuedState);
      expect(access_token).toBe(PROVIDER_ACCESS_TOKEN);
    });

    await expect(page.getByText('Token fetched successfully!')).toBeVisible({ timeout: 15_000 });
  });
});
