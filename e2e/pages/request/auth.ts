import { test, expect, Page } from '../../playwright';
import { AUTH_MODE_LABELS } from '../../constants';
import { selectRequestPaneTab } from './pane';
import { writeFieldValue } from '../shared-ui/single-line-editor';
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
