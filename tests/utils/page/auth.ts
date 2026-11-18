import { expect, Page, test } from '../../../playwright';
import { AUTH_MODE_IDS, type ApiKeyPlacement } from '../constants/auth';
import { expandFolder, openRequest, selectRequestPaneTab, setCodeMirrorEditorValue } from './actions';
import { buildCodeMirrorLocators } from './code-mirror';
import { buildCommonLocators } from './locators';

export type AuthField = 'apikey-key' | 'apikey-value' | 'bearer-token' | 'basic-username' | 'basic-password'
  | 'digest-username' | 'digest-password' | 'awsv4-access-key-id';

const authFieldId = (field: AuthField) => `auth-${field}`;

export const buildAuthLocators = (page: Page) => ({
  apiKey: {
    placementSelector: () => page.getByTestId('auth-placement-selector'),
    placementLabel: () => page.getByTestId('auth-placement-label'),
    placementOption: (placement: ApiKeyPlacement) => page.getByTestId(`auth-placement-${placement}`)
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
  field: (field: AuthField) => buildCodeMirrorLocators(page).byTestId(authFieldId(field)),
  saveSettingsButton: () => page.getByTestId('save-auth-settings'),
  inheritedSourceLabel: () => page.getByTestId('inherited-auth-source'),
  inheritedSource: (sourceName: string) => page.getByText(`Auth inherited from ${sourceName}:`),
  inheritedMode: () => page.getByTestId('inherited-auth-mode'),
  inheritedFields: () => page.getByTestId('inherited-auth-fields'),
  inheritedSecretToggle: () => page.getByTestId('inherited-auth-fields').getByTestId('secret-reveal-toggle'),
  dropdownItem: (id: string) => page.getByTestId(`auth-mode-dropdown-${id}`)
});

export const openRequestAuth = async (page: Page, collectionName: string, requestName: string) => {
  await test.step(`Open Auth for "${requestName}"`, async () => {
    await openRequest(page, collectionName, requestName, { exact: true });
    const { auth, paneTabs, request } = buildCommonLocators(page);

    const authTab = paneTabs.responsiveTab('auth', request.pane());
    const overflow = paneTabs.responsiveOverflowTrigger(request.pane());
    const overflowItem = paneTabs.overflowItem('auth');
    const authPanel = request.pane().locator(auth.modeSelector());

    await expect(async () => {
      if (await authTab.isVisible()) {
        await authTab.click({ timeout: 2000 });
      } else {
        if (!(await overflowItem.isVisible())) {
          await overflow.click({ timeout: 2000 });
        }
        await overflowItem.click({ timeout: 2000 });
      }
      await authPanel.waitFor({ state: 'visible', timeout: 2000 });
    }).toPass({ timeout: 15000 });
  });
};

export const openFolderAuth = async (page: Page, collectionName: string, folderName: string) => {
  await test.step(`Open Auth settings for folder "${folderName}"`, async () => {
    const { sidebar, paneTabs } = buildCommonLocators(page);
    await sidebar.itemRowIn(collectionName, folderName).dblclick();
    await paneTabs.folderSettingsTab('auth').click();
  });
};

export const openCollectionAuth = async (page: Page, collectionName: string) => {
  await test.step(`Open Auth settings for collection "${collectionName}"`, async () => {
    const { sidebar, paneTabs } = buildCommonLocators(page);
    await sidebar.collectionName(collectionName).click();
    await paneTabs.collectionSettingsTab('auth').click();
  });
};

type AuthModeId = (typeof AUTH_MODE_IDS)[keyof typeof AUTH_MODE_IDS];

export const selectAuthModeById = async (page: Page, mode: AuthModeId) => {
  await test.step(`Select auth mode "${mode}"`, async () => {
    const auth = buildAuthLocators(page);
    await auth.modeLabel().click();
    await auth.dropdownItem(mode).click();
  });
};

export const editAuthField = async (page: Page, field: AuthField, value: string) => {
  await setCodeMirrorEditorValue(page, authFieldId(field), value);
};

export const selectApiKeyPlacement = async (page: Page, placement: ApiKeyPlacement) => {
  const { apiKey } = buildAuthLocators(page);
  await apiKey.placementLabel().click();
  await apiKey.placementOption(placement).click();
};

export const openInheritedAuth = async (page: Page, collectionName: string, requestName: string, authMode: string, folderName?: string) => {
  if (folderName) {
    await expandFolder(page, folderName);
  }
  await openRequest(page, collectionName, requestName);
  await selectRequestPaneTab(page, 'Auth');
  await expect(buildAuthLocators(page).inheritedMode()).toHaveText(authMode);
};
