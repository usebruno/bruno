// To test the OAuth2 state validation locally, start a Keycloak instance
// with the fixture realm imported with the following command:
//
//   docker run -d --name bruno-keycloak -p 8090:8080 \
//     -e KC_BOOTSTRAP_ADMIN_USERNAME=admin \
//     -e KC_BOOTSTRAP_ADMIN_PASSWORD=admin \
//     -v "$PWD/tests/auth/oauth2/fixtures/keycloak/realm-export.json:/opt/keycloak/data/import/realm-export.json:ro" \
//     quay.io/keycloak/keycloak:26.0 start-dev --http-port=8080 --import-realm

import type { ElectronApplication } from 'playwright';
import { test, expect, waitForReadyPage } from '../../../playwright';
import { openRequest, selectRequestPaneTab, selectEnvironment } from '../../utils/page';
import { buildCommonLocators } from '../../utils/page/locators';

const COLLECTION = 'oauth2-state';
const KEYCLOAK_BASE_URL = 'http://127.0.0.1:8090';
const KEYCLOAK_REALM = 'bruno';
const KEYCLOAK_USER = 'testuser';
const KEYCLOAK_PASSWORD = 'testpassword';
const CALLBACK_URL = 'bruno://app/oauth2/callback';
const PROVIDER_AUTH_CODE = 'provider-auth-code';
const PROVIDER_ACCESS_TOKEN = 'provider-access-token';
const WRONG_STATE = 'not-the-issued-state';
// Bruno issues crypto.randomBytes(16).toString('hex') when no user state is configured.
const GENERATED_STATE_PATTERN = /^[0-9a-f]{32}$/;
const STATE_MISMATCH_ERROR
  = 'OAuth2 state mismatch: the returned state does not match the issued state.';

// TODO: Move all utility functions to a separate file. (-helper.ts)
test.beforeAll(async () => {
  const response = await fetch(`${KEYCLOAK_BASE_URL}/realms/${KEYCLOAK_REALM}/.well-known/openid-configuration`);
  expect(
    response.ok,
    `Keycloak realm "${KEYCLOAK_REALM}" should be reachable at ${KEYCLOAK_BASE_URL}`
  ).toBeTruthy();
});

const loginToKeycloakForAuthCode = async (authorizationUrl: string): Promise<string> => {
  const loginPage = await fetch(authorizationUrl, { redirect: 'manual' });
  expect(loginPage.ok, 'Keycloak authorize should return a login page').toBeTruthy();

  const cookies = ((loginPage.headers as Headers & { getSetCookie?: () => string[] }).getSetCookie?.() ?? [])
    .map((c) => c.split(';')[0])
    .join('; ');

  const html = await loginPage.text();

  const loginFormActionRegex = /action="([^"]+login-actions\/authenticate[^"]*)"/;

  // Extract the login form's action URL; it carries per-request session params, so it can't be hardcoded.
  const formActionMatch = html.match(loginFormActionRegex);
  expect(formActionMatch, 'Keycloak login page should expose a form action').toBeTruthy();

  // HTML escapes & as &amp; inside attributes; restore it so the query params reach Keycloak intact.
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
const fireDeepLinkCallback = (app: ElectronApplication, url: string) =>
  app.evaluate(({ app: electronApp }, callbackUrl) => {
    electronApp.emit('second-instance', {}, [callbackUrl]);
  }, url);

const getCapturedCallbackUrl = (app: ElectronApplication): Promise<string | null> =>
  app.evaluate(() => (globalThis as any).__brunoCapturedCallbackUrl ?? null);

const getCapturedAuthUrl = (app: ElectronApplication): Promise<string | null> =>
  app.evaluate(() => (globalThis as any).__brunoCapturedAuthUrl ?? null);

/** `state` Bruno sent on the authorization URL (stored internally as expectedState). */
const getIssuedStateFromAuthorizationUrl = async (app: ElectronApplication): Promise<string> => {
  const authUrl = await getCapturedAuthUrl(app);
  expect(authUrl, 'authorization URL should have been opened').toBeTruthy();
  const state = new URL(authUrl as string).searchParams.get('state');
  expect(state, 'issued state should be present on the authorization URL').toBeTruthy();
  return state as string;
};

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

/**
 * Wrap the real `second-instance` listener so callback URLs are recorded when Bruno
 * receives them — same argv path as `getAppProtocolUrlFromArgv` in index.js.
 */
const installCallbackCapture = (app: ElectronApplication) => {
  return app.evaluate(({ app: electronApp }) => {
    (globalThis as any).__brunoCapturedCallbackUrl = null;

    electronApp.prependListener('second-instance', (_event, commandLine) => {
      const url = commandLine?.find((arg: string) => arg?.startsWith('bruno://'));
      if (url) {
        (globalThis as any).__brunoCapturedCallbackUrl = url;
      }
    });
  });
};

const clickGetAccessToken = async (page: Parameters<typeof openRequest>[0], requestName: string) => {
  await openRequest(page, COLLECTION, requestName);
  await selectEnvironment(page, 'Local', 'collection');
  await selectRequestPaneTab(page, 'Auth');
  await page.getByRole('button', { name: 'Get Access Token' }).click();
};

const waitForAuthorizationStarted = async (app: ElectronApplication) => {
  await expect.poll(() => getCapturedAuthUrl(app), { timeout: 15_000 }).toBeTruthy();
};

/**
 * Common flow bootstrap shared by every test: restart the app, wait for a ready page,
 * stub `shell.openExternal`, install the callback capture, click "Get Access Token" for
 * the given request, and wait for the authorization URL to be captured.
 */
const startOAuth2Flow = async (
  restartApp: (options?: { initUserDataPath?: string }) => Promise<ElectronApplication>,
  requestName: string
) => {
  const app = await restartApp();
  const page = await waitForReadyPage(app);

  // Fake opening the browser so we can read the login URL.
  await stubOpenExternal(app);
  await installCallbackCapture(app);

  await clickGetAccessToken(page, requestName);
  await waitForAuthorizationStarted(app);

  return { app, page };
};

type CallbackStyle = 'query' | 'hash';

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
  // Each test restarts the app and does a real Keycloak login, so allow more than the 30s default.
  test.describe.configure({ timeout: 60_000 });

  test('authorization code: (user-supplied state): issues userState accepts matching callback', async ({ restartApp }) => {
    const USER_STATE = 'brunoUserState';
    const { app, page } = await startOAuth2Flow(restartApp, 'AuthCodeUserSuppliedState');

    const authUrl = await getCapturedAuthUrl(app);

    expect(authUrl).toBeTruthy();

    const issuedState = await test.step('capture and verify the issued state carries userState', async () => {
      const state = await getIssuedStateFromAuthorizationUrl(app);
      expect(state).toBe(USER_STATE);
      return state;
    });

    const authCode = await test.step('obtain a valid auth code from Keycloak', () =>
      loginToKeycloakForAuthCode(authUrl as string));

    const callbackUrl = `${CALLBACK_URL}?code=${authCode}&state=${encodeURIComponent(issuedState)}`;

    await test.step('deliver a callback with the matching state', async () => {
      await fireDeepLinkCallback(app, callbackUrl);

      const receivedCallbackUrl = await getCapturedCallbackUrl(app);
      expect(receivedCallbackUrl).toBe(callbackUrl);

      const { state: returnedState, code } = getCallbackParams(receivedCallbackUrl as string);
      expect(returnedState).toBe(issuedState);
      expect(code).toBe(authCode);
    });

    await expect(page.getByText('Token fetched successfully!')).toBeVisible({ timeout: 15_000 });
  });

  test('authorization code: (no state): issues a random state accepts matching callback', async ({ restartApp }) => {
    const { app, page } = await startOAuth2Flow(restartApp, 'AuthorizationCode');

    const authUrl = await getCapturedAuthUrl(app);

    expect(authUrl).toBeTruthy();

    const issuedState = await test.step('capture and verify a cryptographically random state was issued', async () => {
      const state = await getIssuedStateFromAuthorizationUrl(app);
      expect(state).toMatch(GENERATED_STATE_PATTERN);
      return state;
    });

    const authCode = await test.step('obtain a valid auth code from Keycloak', () =>
      loginToKeycloakForAuthCode(authUrl as string));

    const callbackUrl = `${CALLBACK_URL}?code=${authCode}&state=${encodeURIComponent(issuedState)}`;

    await test.step('deliver a callback with the matching state', async () => {
      await fireDeepLinkCallback(app, callbackUrl);

      const receivedCallbackUrl = await getCapturedCallbackUrl(app);
      expect(receivedCallbackUrl).toBe(callbackUrl);

      const { state: returnedState, code } = getCallbackParams(receivedCallbackUrl as string);
      expect(returnedState).toBe(issuedState);
      expect(code).toBe(authCode);
    });

    await expect(page.getByText('Token fetched successfully!')).toBeVisible({ timeout: 15_000 });
  });

  test('authorization code: rejects callback when returned state does not match issued state', async ({ restartApp }) => {
    const { app, page } = await startOAuth2Flow(restartApp, 'AuthorizationCode');

    const issuedState = await getIssuedStateFromAuthorizationUrl(app);

    const callbackUrl = `${CALLBACK_URL}?code=${PROVIDER_AUTH_CODE}&state=${WRONG_STATE}`;
    await test.step('deliver a callback with a mismatched state', async () => {
      await fireDeepLinkCallback(app, callbackUrl);

      const receivedCallbackUrl = await getCapturedCallbackUrl(app);
      expect(receivedCallbackUrl).toBe(callbackUrl);

      const { state: returnedState, code } = getCallbackParams(receivedCallbackUrl as string);
      expect(returnedState).toBe(WRONG_STATE);
      expect(returnedState).not.toBe(issuedState);
      expect(code).toBe(PROVIDER_AUTH_CODE);
    });

    await test.step('Check for mismatch error in the response pane', async () => {
      await expect(
        buildCommonLocators(page).response.pane().getByText(STATE_MISMATCH_ERROR)
      ).toBeVisible({ timeout: 15_000 });
    });
  });

  test('implicit grant: (user-supplied state): issues userState accepts matching callback', async ({ restartApp }) => {
    const USER_STATE = 'brunoUserState';
    const { app, page } = await startOAuth2Flow(restartApp, 'ImplicitUserSuppliedState');

    const issuedState = await test.step('capture and verify the issued state carries userState', async () => {
      const state = await getIssuedStateFromAuthorizationUrl(app);
      expect(state).toBe(USER_STATE);
      return state;
    });

    const callbackUrl
      = `${CALLBACK_URL}#access_token=${PROVIDER_ACCESS_TOKEN}&token_type=Bearer&expires_in=3600&state=${encodeURIComponent(issuedState)}`;

    await test.step('deliver a callback with the matching state', async () => {
      await fireDeepLinkCallback(app, callbackUrl);

      const receivedCallbackUrl = await getCapturedCallbackUrl(app);
      expect(receivedCallbackUrl).toBe(callbackUrl);

      const { state: returnedState, access_token } = getCallbackParams(receivedCallbackUrl as string, 'hash');
      expect(returnedState).toBe(issuedState);
      expect(access_token).toBe(PROVIDER_ACCESS_TOKEN);
    });

    await expect(page.getByText('Token fetched successfully!')).toBeVisible({ timeout: 15_000 });
  });

  test('implicit grant: (no state): issues a random state accepts matching callback', async ({ restartApp }) => {
    const { app, page } = await startOAuth2Flow(restartApp, 'AuthorizationImplicit');

    const issuedState = await test.step('capture and verify a cryptographically random state was issued', async () => {
      const state = await getIssuedStateFromAuthorizationUrl(app);
      expect(state).toMatch(GENERATED_STATE_PATTERN);
      return state;
    });

    const callbackUrl
      = `${CALLBACK_URL}#access_token=${PROVIDER_ACCESS_TOKEN}&token_type=Bearer&expires_in=3600&state=${encodeURIComponent(issuedState)}`;

    await test.step('deliver a callback with the matching state', async () => {
      await fireDeepLinkCallback(app, callbackUrl);

      const receivedCallbackUrl = await getCapturedCallbackUrl(app);
      expect(receivedCallbackUrl).toBe(callbackUrl);

      const { state: returnedState, access_token } = getCallbackParams(receivedCallbackUrl as string, 'hash');
      expect(returnedState).toBe(issuedState);
      expect(access_token).toBe(PROVIDER_ACCESS_TOKEN);
    });

    await expect(page.getByText('Token fetched successfully!')).toBeVisible({ timeout: 15_000 });
  });

  test('implicit grant: rejects callback when returned state does not match issued state', async ({ restartApp }) => {
    const { app, page } = await startOAuth2Flow(restartApp, 'AuthorizationImplicit');

    const issuedState = await test.step('capture the issued state', () => getIssuedStateFromAuthorizationUrl(app));

    const callbackUrl = `${CALLBACK_URL}#access_token=${PROVIDER_ACCESS_TOKEN}&token_type=Bearer&state=${WRONG_STATE}`;

    await test.step('deliver a callback with a mismatched state', async () => {
      await fireDeepLinkCallback(app, callbackUrl);

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
});
