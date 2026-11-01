import { test, expect, Page } from '../..';
import { buildItemActionLocators } from '../sidebar/item-actions';
import { buildDropdownLocators } from '../shared-ui/dropdown';
import { buildPaneTabsLocators } from '../shared-ui/pane-tabs';
import { buildSidebarLocators, revealCollectionsTop } from '../sidebar/collection-tree';
import { buildRequestTabsLocators } from '../request-tabs';
import { editCodeMirrorEditor } from '../shared-ui/code-editor';

export type PresetRequestType = 'http' | 'graphql' | 'grpc' | 'ws';

/**
 * Locators for the Presets tab in collection settings.
 */
export const buildCollectionPresetsLocators = (page: Page) => ({
  requestType: (type: PresetRequestType) =>
    page.getByTestId(`presets-request-type-${type}`),
  requestUrl: () => page.getByTestId('presets-request-url'),
  saveBtn: () => page.getByTestId('presets-save-btn'),
  defaultEnvironment: () => page.getByTestId('presets-default-environment'),
  defaultEnvironmentOption: (name: string) => page.locator('.dropdown-item').getByText(name, { exact: true })
});

const buildLocators = (page: Page) => ({
  actions: buildItemActionLocators(page),
  dropdown: buildDropdownLocators(page),
  paneTabs: buildPaneTabsLocators(page),
  presets: buildCollectionPresetsLocators(page),
  sidebar: buildSidebarLocators(page),
  tabs: buildRequestTabsLocators(page)
});

/**
 * Set the collection's default request type preset and save it
 * @param page - The page object
 * @param collectionName - The name of the collection
 * @param requestType - The preset request type to select
 * @returns void
 */
export const setRequestTypePreset = async (page: Page, collectionName: string, requestType: PresetRequestType) => {
  await test.step(`Set the default request type preset to "${requestType}"`, async () => {
    const locators = buildLocators(page);

    await openCollectionSettings(page, collectionName);
    await selectCollectionPaneTab(page, 'presets');
    await locators.presets.requestType(requestType).check();
    await expect(locators.presets.requestType(requestType)).toBeChecked();

    await locators.presets.saveBtn().click();

    // the settings tab keeps a draft indicator until the presets are persisted
    await expect(locators.tabs.tabDraftIndicator(locators.tabs.collectionSettingsTab())).toBeHidden();
  });
};

/**
 * Set the Base URL preset for a collection.
 * New requests created in the collection inherit this as their starting URL.
 * @param page - The page object
 * @param collectionName - The name of the collection
 * @param requestUrl - The Base URL to save as the preset
 * @returns void
 */
export const setRequestUrlPreset = async (page: Page, collectionName: string, requestUrl: string) => {
  await test.step(`Set the Base URL preset to "${requestUrl}"`, async () => {
    const locators = buildLocators(page);

    await openCollectionSettings(page, collectionName);
    await selectCollectionPaneTab(page, 'presets');

    const urlInput = locators.presets.requestUrl();
    await urlInput.waitFor({ state: 'visible' });
    await urlInput.fill(requestUrl);
    await locators.presets.saveBtn().click();

    await locators.tabs.tabDraftIndicator(locators.tabs.collectionSettingsTab()).waitFor({ state: 'hidden' });
  });
};

/**
 * Open a collection's settings tab by clicking on it in the sidebar
 * @param page - The page object
 * @param collectionName - The name of the collection
 * @param options - Optional settings (persist: double-click to make tab permanent)
 * @returns void
 */
export const openCollectionSettings = async (page: Page, collectionName: string, { persist = false } = {}) => {
  await test.step(`Open collection settings for "${collectionName}"`, async () => {
    await revealCollectionsTop(page);
    const locators = buildLocators(page);
    const collection = locators.sidebar.collection(collectionName);
    if (!persist) {
      await collection.click();
    } else {
      await collection.dblclick();
    }
  });
};

/**
 * Select a tab in the collection settings pane
 * @param page - The page object
 * @param tabName - The tab name key (e.g. 'auth', 'headers', 'overview', 'script', 'vars')
 * @returns void
 */
export const selectCollectionPaneTab = async (page: Page, tabName: string) => {
  await test.step(`Select collection pane tab "${tabName}"`, async () => {
    const locators = buildLocators(page);
    const tab = locators.paneTabs.collectionSettingsTab(tabName.toLowerCase());
    await tab.click();
    await expect(tab).toContainClass('active');
  });
};

/**
 * Select a sub-tab in the collection script pane (Pre Request or Post Response)
 * @param page - The page object
 * @param tabName - 'pre-request' or 'post-response'
 * @returns void
 */
export const selectCollectionScriptPaneTab = async (page: Page, tabName: 'pre-request' | 'post-response') => {
  await test.step(`Select collection script pane tab "${tabName}"`, async () => {
    const locators = buildLocators(page);
    const tab = locators.paneTabs.tabTrigger(tabName);
    await tab.click();
    await expect(tab).toContainClass('active');
  });
};

/**
 * Focus the collection settings tab in the tab bar after restore
 * @param page - The page object
 * @param options - Optional timeout in milliseconds
 * @returns void
 */
export const focusCollectionSettingsTab = async (page: Page, { timeout = 10000 } = {}) => {
  await test.step('Focus collection settings tab', async () => {
    const locators = buildLocators(page);
    const tab = locators.tabs.collectionSettingsTab();
    await expect(tab).toBeVisible({ timeout });
    await tab.click({ force: true });
  });
};

/**
 * Add a script to a collection's Settings → Script tab.
 * @param page - The page object
 * @param collectionName - The collection to target
 * @param phase - Which phase to write: 'pre-request' or 'post-response'
 * @param content - The script content to add
 */
export const addCollectionScript = async (
  page: Page,
  collectionName: string,
  phase: 'pre-request' | 'post-response',
  content: string
) => {
  await test.step(`Add ${phase} script on collection "${collectionName}"`, async () => {
    const locators = buildLocators(page);
    await locators.sidebar.collection(collectionName).hover();
    await locators.actions.collectionActions(collectionName).click();
    await locators.dropdown.item('Settings').click();
    await locators.paneTabs.collectionSettingsTab('script').click();
    await locators.paneTabs.tabTrigger(phase).click();
    await editCodeMirrorEditor(page, `collection-${phase}-script-editor`, content);
    const saveShortcut = process.platform === 'darwin' ? 'Meta+s' : 'Control+s';
    await page.keyboard.press(saveShortcut);
    await page.waitForTimeout(400);
  });
};

export type SandboxMode = 'safe' | 'developer';

/**
 * Builds locators for sandbox mode settings
 * @param page - The Playwright page object
 * @returns Object with locators for sandbox elements
 */
export const buildSandboxLocators = (page: Page) => ({
  sandboxModeSelector: () => page.getByTestId('sandbox-mode-selector'),
  safeModeRadio: () => page.getByTestId('sandbox-mode-safe'),
  developerModeRadio: () => page.getByTestId('sandbox-mode-developer'),
  jsSandboxHeading: () => page.getByText('JavaScript Sandbox'),
  saveButton: () => page.getByRole('button', { name: 'Save' })
});
