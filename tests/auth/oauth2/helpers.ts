import type { ElectronApplication } from 'playwright';
import { test, expect, waitForReadyPage } from '../../../playwright';
import { openRequest, selectRequestPaneTab, selectEnvironment } from '../../utils/page';
import { buildCommonLocators } from '../../utils/page/locators';

export const COLLECTION = 'oauth2-state';
export const KEYCLOAK_USER = 'testuser';
export const KEYCLOAK_PASSWORD = 'testpassword';

const loginFormActionRegex = /action="([^"]+login-actions\/authenticate[^"]*)"/;

// This block stubs Electron's shell.openExternal inside the Bruno app so the OAuth2 test
// can intercept the authorization URL instead of opening a real browser.
export const stubOpenExternal = (app: ElectronApplication) =>
  app.evaluate(({ shell }) => {
    (globalThis as any).__brunoCapturedAuthUrl = null;
    shell.openExternal = async (url: string) => {
      (globalThis as any).__brunoCapturedAuthUrl = url;
    };
  });

export const clickGetAccessToken = async (page: Parameters<typeof openRequest>[0], requestName: string) => {
  await openRequest(page, COLLECTION, requestName);
  await selectEnvironment(page, 'Local', 'collection');
  await selectRequestPaneTab(page, 'Auth');
  await buildCommonLocators(page).auth.oauth2.getAccessTokenBtn().click();
};

export const getCapturedAuthUrl = (app: ElectronApplication): Promise<string | null> =>
  app.evaluate(() => (globalThis as any).__brunoCapturedAuthUrl ?? null);

export const waitForAuthorizationStarted = async (app: ElectronApplication) => {
  await expect.poll(() => getCapturedAuthUrl(app), { timeout: 15_000 }).toBeTruthy();
};

export const startOAuth2Flow = async (
  restartApp: (options?: { initUserDataPath?: string }) => Promise<ElectronApplication>,
  requestName: string
) => {
  const app = await restartApp();
  const page = await waitForReadyPage(app);

  // Fake opening the browser so we can read the login URL.
  await stubOpenExternal(app);

  await clickGetAccessToken(page, requestName);
  await waitForAuthorizationStarted(app);

  return { app, page };
};

/** `state` Bruno sent on the authorization URL (stored internally as expectedState). */
export const getIssuedStateFromAuthorizationUrl = async (app: ElectronApplication): Promise<string> => {
  const authUrl = await getCapturedAuthUrl(app);
  expect(authUrl, 'authorization URL should have been opened').toBeTruthy();
  const state = new URL(authUrl as string).searchParams.get('state');
  expect(state, 'issued state should be present on the authorization URL').toBeTruthy();
  return state as string;
};

export const loginToKeycloakForAuthCode = async (authorizationUrl: string): Promise<string> => {
  const loginPage = await fetch(authorizationUrl, { redirect: 'manual' });
  expect(loginPage.ok, 'Keycloak authorize should return a login page').toBeTruthy();

  const cookies = ((loginPage.headers as Headers & { getSetCookie?: () => string[] }).getSetCookie?.() ?? [])
    .map((c) => c.split(';')[0])
    .join('; ');

  const html = await loginPage.text();

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
export const fireDeepLinkCallback = (app: ElectronApplication, url: string) =>
  app.evaluate(({ app: electronApp }, callbackUrl) => {
    electronApp.emit('second-instance', {}, [callbackUrl]);
  }, url);

/** Expand the Access Token section of the token viewer and return the stored token. */
export const readFetchedAccessToken = async (page: Parameters<typeof openRequest>[0]) => {
  const { tokenSection, tokenValue } = buildCommonLocators(page).auth.oauth2;
  await expect(tokenSection('Access Token')).toBeVisible({ timeout: 15_000 });
  await tokenSection('Access Token').click();
  return tokenValue('Access Token').textContent();
};

const STATE_MISMATCH_ERROR
  = 'OAuth2 state mismatch: the returned state does not match the issued state.';

// The rejection must happen before any token exchange, so once the error is
// visible the flow has settled and the absence of a token is final.
export const expectStateMismatchWithoutToken = async (page: Parameters<typeof openRequest>[0]) => {
  const locators = buildCommonLocators(page);
  await test.step('surface a state mismatch error and no token', async () => {
    await expect(locators.response.pane().getByText(STATE_MISMATCH_ERROR)).toBeVisible({ timeout: 15_000 });
    await expect(locators.auth.oauth2.noToken()).toBeVisible();
  });
};
