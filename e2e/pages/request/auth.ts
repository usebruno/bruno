import { test, expect, Page } from '../../playwright';
import { AUTH_MODE_LABELS } from '../../constants';
import { selectRequestPaneTab } from './pane';
import { readField, typeIntoField, writeFieldValue } from '../shared-ui/single-line-editor';
import { setCodeMirrorValue } from '../shared-ui/code-editor';
import { expandFolder, openRequest } from '../sidebar/collection-tree';

/**
 * Open the auth mode dropdown and pick a mode by its visible label.
 * @param page - The page object
 * @param modeLabel - Dropdown item text (e.g. 'Bearer Token', 'Basic Auth')
 */
export const selectAuthMode = async (page: Page, modeLabel: string) => {
  await page.locator('.auth-mode-label').click();
  await page.locator('.dropdown-item').filter({ hasText: modeLabel }).click();
};

/** Opens the request's Auth tab, picks API Key and sets its Value field. */
export const setApiKeyValue = async (page: Page, value: string) => {
  await test.step(`Set the API key value to "${value}"`, async () => {
    await selectRequestPaneTab(page, 'Auth');
    await selectAuthMode(page, AUTH_MODE_LABELS.APIKEY);
    await writeFieldValue(page, 'Value', value);
  });
};

export const buildAuthLocators = (page: Page) => ({
  apiKey: {
    placementSelector: () => page.getByTestId('auth-placement-selector'),
    placementLabel: () => page.getByTestId('auth-placement-label')
  },
  oauth1: {
    signatureMethodDropdown: () => page.getByTestId('oauth1-signature-method-dropdown'),
    signatureMethodMenu: () => page.getByTestId('oauth1-signature-method-dropdown-dropdown'),
    placementDropdown: () => page.getByTestId('oauth1-placement-dropdown'),
    placementMenu: () => page.getByTestId('oauth1-placement-dropdown-dropdown'),
    placementSelector: () => page.getByTestId('auth-placement-selector'),
    placementLabel: () => page.getByTestId('auth-placement-label')
  },
  oauth2: {
    grantTypeDropdown: () => page.getByTestId('grant-type-dropdown'),
    tokenHeaderPrefixField: () => page.getByTestId('token-header-prefix'),
    tokenQueryParamKeyField: () => page.getByTestId('token-query-param-key'),
    grantTypeMenu: () => page.getByTestId('grant-type-dropdown-dropdown'),
    grantTypeOption: (grantType: string) => page.getByTestId(`grant-type-dropdown-${grantType}`),
    additionalParams: () => page.getByTestId('oauth2-additional-params'),
    additionalParamsTab: (tab: 'authorization' | 'token' | 'refresh') => page.getByTestId(`oauth2-additional-params-tab-${tab}`),
    addParameterButton: () => page.getByTestId('oauth2-additional-params-add'),
    deleteParameterButtons: () => page.getByTestId('oauth2-additional-params-delete'),
    getAccessTokenButton: () => page.getByRole('button', { name: 'Get Access Token' }),
    clearCacheButton: () => page.getByRole('button', { name: 'Clear Cache' }),
    tokenSection: (title: string) => page.getByRole('heading', { name: title, exact: true }),
    copyTokenButton: () => page.getByRole('button', { name: 'Copy token' }),
    noToken: () => page.getByTestId('oauth2-no-token'),
    tokenValue: (tokenKey: 'access-token' | 'refresh-token' | 'id-token') => page.getByTestId(`oauth2-token-value-${tokenKey}`),
    getAccessTokenBtn: () => page.getByTestId('oauth2-get-access-token')
  },
  modeSelector: () => page.getByTestId('auth-mode-selector'),
  modeLabel: () => page.getByTestId('auth-mode-label'),
  inheritedSource: (sourceName: string) => page.getByText(`Auth inherited from ${sourceName}:`),
  inheritedMode: () => page.getByTestId('inherited-auth-mode'),
  inheritedFields: () => page.getByTestId('inherited-auth-fields'),
  inheritedSecretToggle: () => page.getByTestId('inherited-auth-fields').getByTestId('secret-reveal-toggle'),
  dropdownItem: (id: string) => page.getByTestId(`auth-mode-dropdown-${id}`)
});

export const openInheritedAuth = async (page: Page, collectionName: string, requestName: string, authMode: string, folderName?: string) => {
  if (folderName) {
    await expandFolder(page, folderName);
  }
  await openRequest(page, collectionName, requestName);
  await selectRequestPaneTab(page, 'Auth');
  await expect(buildAuthLocators(page).inheritedMode()).toHaveText(authMode);
};

type AuthFieldValues = Record<string, string>;

/** Types a value into each auth field, keyed by the field's label. */
export const fillAuthFields = async (page: Page, fields: AuthFieldValues) => {
  for (const [label, value] of Object.entries(fields)) {
    await typeIntoField(page, label, value);
    await expect.poll(() => readField(page, label), `auth field "${label}"`).toBe(value);
  }
};

/** Asserts the selected auth mode and, optionally, the value of each auth field (keyed by label). */
export const expectAuthState = async (page: Page, modeLabel: string, fields: AuthFieldValues = {}) => {
  await expect(buildAuthLocators(page).modeLabel()).toContainText(modeLabel);
  for (const [label, value] of Object.entries(fields)) {
    await expect.poll(() => readField(page, label), `auth field "${label}"`).toBe(value);
  }
};

/** Selects API Key auth and waits for its default placement before the fields are edited. */
export const selectApiKeyAuth = async (page: Page) => {
  await selectAuthMode(page, AUTH_MODE_LABELS.APIKEY);
  await expect(buildAuthLocators(page).apiKey.placementLabel()).toContainText('Header');
};

/** The CodeMirror editor inside an auth field, found by the field's test id. */
export const authEditorByTestId = (page: Page, testId: string) =>
  page.getByTestId(testId).locator('.CodeMirror').first();

/** Replaces the text of an auth field, found by its test id. */
export const writeAuthEditor = async (page: Page, testId: string, value: string) => {
  const editor = authEditorByTestId(page, testId);
  await editor.waitFor({ state: 'visible' });
  await setCodeMirrorValue(editor, value);
};

/**
 * Select OAuth 2.0 Client Credentials on the open request and fill the client id and secret.
 * Works for any request type that shares the Auth tab. Values may contain `{{variable}}` tokens.
 * @param page - The page object
 * @param auth - Client id and client secret
 */
export const configureOAuth2ClientCredentials = async (
  page: Page,
  auth: { clientId: string; clientSecret: string }
) => {
  await test.step('Configure OAuth 2.0 Client Credentials auth', async () => {
    await selectRequestPaneTab(page, 'Auth');
    const locators = buildAuthLocators(page);
    const grantType = locators.oauth2.grantTypeDropdown();

    await locators.modeLabel().click();
    await locators.dropdownItem('oauth2').click();

    await grantType.click();
    await locators.oauth2.grantTypeOption('client_credentials').click();

    await writeAuthEditor(page, 'oauth2-client-credentials-clientId', auth.clientId);
    await writeAuthEditor(page, 'oauth2-client-credentials-clientSecret', auth.clientSecret);
  });
};

/**
 * Select Digest auth on the open request and fill the username and password.
 * Works for any request type that shares the Auth tab. Values may contain `{{variable}}` tokens.
 * @param page - The page object
 * @param auth - Digest username and password
 */
export const configureDigestAuth = async (page: Page, auth: { username: string; password: string }) => {
  await test.step('Configure Digest auth', async () => {
    await selectRequestPaneTab(page, 'Auth');
    const locators = buildAuthLocators(page);
    await locators.modeLabel().click();
    await locators.dropdownItem('digest').click();

    await writeAuthEditor(page, 'auth-digest-username', auth.username);
    await writeAuthEditor(page, 'auth-digest-password', auth.password);
  });
};

/**
 * Select Bearer Token auth on the open request and fill the token.
 * Works for any request type that shares the Auth tab. The token may contain a `{{variable}}` token.
 * @param page - The page object
 * @param auth - Bearer token
 */
export const configureBearerAuth = async (page: Page, auth: { token: string }) => {
  await test.step('Configure Bearer Token auth', async () => {
    await selectRequestPaneTab(page, 'Auth');
    const locators = buildAuthLocators(page);
    await locators.modeLabel().click();
    await locators.dropdownItem('bearer').click();

    await writeAuthEditor(page, 'auth-bearer-token', auth.token);
  });
};

/**
 * Select Basic auth on the open request and fill the username and password.
 * Works for any request type that shares the Auth tab. Values may contain `{{variable}}` tokens.
 * @param page - The page object
 * @param auth - Basic username and password
 */
export const configureBasicAuth = async (page: Page, auth: { username: string; password: string }) => {
  await test.step('Configure Basic auth', async () => {
    await selectRequestPaneTab(page, 'Auth');
    const locators = buildAuthLocators(page);
    await locators.modeLabel().click();
    await locators.dropdownItem('basic').click();

    await writeAuthEditor(page, 'auth-basic-username', auth.username);
    await writeAuthEditor(page, 'auth-basic-password', auth.password);
  });
};
