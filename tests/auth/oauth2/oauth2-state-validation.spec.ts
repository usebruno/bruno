// Requires a local Keycloak instance; see ./README.md for setup.

import { test, expect } from '../../../playwright';
import {
  startOAuth2Flow,
  getCapturedAuthUrl,
  getIssuedStateFromAuthorizationUrl,
  loginToKeycloakForAuthCode,
  fireDeepLinkCallback,
  readFetchedAccessToken,
  expectStateMismatchWithoutToken
} from './helpers';

const KEYCLOAK_BASE_URL = 'http://127.0.0.1:8090';
const KEYCLOAK_REALM = 'bruno';
const CALLBACK_URL = 'bruno://app/oauth2/callback';
const PROVIDER_AUTH_CODE = 'provider-auth-code';
const PROVIDER_ACCESS_TOKEN = 'provider-access-token';
const WRONG_STATE = 'not-the-issued-state';
const USER_STATE = 'brunoUserState';
// Bruno issues crypto.randomBytes(16).toString('hex') when no user state is configured.
const GENERATED_STATE_PATTERN = /^[0-9a-f]{32}$/;

test.beforeAll(async () => {
  const response = await fetch(`${KEYCLOAK_BASE_URL}/realms/${KEYCLOAK_REALM}/.well-known/openid-configuration`);
  expect(
    response.ok,
    `Keycloak realm "${KEYCLOAK_REALM}" should be reachable at ${KEYCLOAK_BASE_URL}`
  ).toBeTruthy();
});

test.describe('OAuth2 callback state validation', () => {
  // Each test restarts the app and does a real Keycloak login, so allow more than the 30s default.
  test.describe.configure({ timeout: 60_000 });

  test('authorization code: (user-supplied state): issues userState accepts matching callback', async ({ restartApp }) => {
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

    await fireDeepLinkCallback(app, callbackUrl);

    expect(await readFetchedAccessToken(page)).toBeTruthy();
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

    await fireDeepLinkCallback(app, callbackUrl);

    expect(await readFetchedAccessToken(page)).toBeTruthy();
  });

  test('authorization code: rejects callback when returned state does not match issued state', async ({ restartApp }) => {
    const { app, page } = await startOAuth2Flow(restartApp, 'AuthorizationCode');

    const callbackUrl = `${CALLBACK_URL}?code=${PROVIDER_AUTH_CODE}&state=${WRONG_STATE}`;
    await fireDeepLinkCallback(app, callbackUrl);

    await expectStateMismatchWithoutToken(page);
  });

  test('implicit grant: (user-supplied state): issues userState accepts matching callback', async ({ restartApp }) => {
    const { app, page } = await startOAuth2Flow(restartApp, 'ImplicitUserSuppliedState');

    const issuedState = await test.step('capture and verify the issued state carries userState', async () => {
      const state = await getIssuedStateFromAuthorizationUrl(app);
      expect(state).toBe(USER_STATE);
      return state;
    });

    const callbackUrl
      = `${CALLBACK_URL}#access_token=${PROVIDER_ACCESS_TOKEN}&token_type=Bearer&expires_in=3600&state=${encodeURIComponent(issuedState)}`;

    await fireDeepLinkCallback(app, callbackUrl);

    expect(await readFetchedAccessToken(page)).toBe(PROVIDER_ACCESS_TOKEN);
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

    await fireDeepLinkCallback(app, callbackUrl);

    expect(await readFetchedAccessToken(page)).toBe(PROVIDER_ACCESS_TOKEN);
  });

  test('implicit grant: rejects callback when returned state does not match issued state', async ({ restartApp }) => {
    const { app, page } = await startOAuth2Flow(restartApp, 'AuthorizationImplicit');

    const callbackUrl = `${CALLBACK_URL}#access_token=${PROVIDER_ACCESS_TOKEN}&token_type=Bearer&state=${WRONG_STATE}`;

    await fireDeepLinkCallback(app, callbackUrl);

    await expectStateMismatchWithoutToken(page);
  });
});
