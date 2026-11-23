import { test, expect, Page } from '../../playwright';
import { AUTH_MODE_LABELS } from '../../constants';
import { selectRequestPaneTab } from './pane';
import { readField, typeIntoField, writeFieldValue } from '../shared-ui/single-line-editor';
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
    placementMenu: () => page.getByTestId('oauth1-placement-dropdown-dropdown')
  },
  oauth2: {
    grantTypeDropdown: () => page.getByTestId('grant-type-dropdown'),
    tokenHeaderPrefixField: () => page.getByTestId('token-header-prefix'),
    tokenQueryParamKeyField: () => page.getByTestId('token-query-param-key'),
    grantTypeMenu: () => page.getByTestId('grant-type-dropdown-dropdown'),
    additionalParams: () => page.getByTestId('oauth2-additional-params'),
    additionalParamsTab: (tab: 'authorization' | 'token' | 'refresh') => page.getByTestId(`oauth2-additional-params-tab-${tab}`),
    addParameterButton: () => page.getByTestId('oauth2-additional-params-add'),
    deleteParameterButtons: () => page.getByTestId('oauth2-additional-params-delete'),
    getAccessTokenButton: () => page.getByRole('button', { name: 'Get Access Token' }),
    clearCacheButton: () => page.getByRole('button', { name: 'Clear Cache' }),
    tokenSection: (title: string) => page.getByRole('heading', { name: title, exact: true }),
    copyTokenButton: () => page.getByRole('button', { name: 'Copy token' })
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
