import { test, expect, Page } from '../../playwright';
import { buildPaneTabsLocators } from '../shared-ui/pane-tabs';
import { buildSidebarLocators, revealFolderRow } from '../sidebar/collection-tree';
import { buildRequestTabsLocators } from '../app-shell/tabs';
import { editCodeMirrorEditor } from '../shared-ui/code-editor';

const buildLocators = (page: Page) => ({
  paneTabs: buildPaneTabsLocators(page),
  sidebar: buildSidebarLocators(page),
  tabs: buildRequestTabsLocators(page)
});

/**
 * Select a tab in the folder settings pane
 * @param page - The page object
 * @param tabName - The tab name key (e.g. 'auth', 'headers', 'docs', 'script', 'vars', 'test')
 * @returns void
 */
export const selectfolderPaneTab = async (page: Page, tabName: string) => {
  await test.step(`Select folder pane tab "${tabName}"`, async () => {
    const locators = buildLocators(page);
    const tab = locators.paneTabs.folderSettingsTab(tabName.toLowerCase());
    await tab.click();
    await expect(tab).toContainClass('active');
  });
};

/**
 * Select a sub-tab in the folder script pane (Pre Request or Post Response)
 * @param page - The page object
 * @param tabName - 'pre-request' or 'post-response'
 * @returns void
 */
export const selectFolderScriptPaneTab = async (page: Page, tabName: 'pre-request' | 'post-response') => {
  await test.step(`Select folder script pane tab "${tabName}"`, async () => {
    const locators = buildLocators(page);
    const tab = locators.paneTabs.folderScriptTab(tabName);
    await tab.click();
    await expect(tab).toContainClass('active');
  });
};

/**
 * Focus the folder settings tab in the tab bar after restore
 * @param page - The page object
 * @param folderName - The name of the folder
 * @param options - Optional timeout in milliseconds
 * @returns void
 */
export const focusFolderSettingsTab = async (page: Page, folderName: string, { timeout = 10000 } = {}) => {
  await test.step(`Focus folder settings tab "${folderName}"`, async () => {
    const locators = buildLocators(page);
    const tab = locators.tabs.folderTab(folderName);
    await expect(tab).toBeVisible({ timeout });
    await tab.click({ force: true });
  });
};

/**
 * Add a script to a folder's Settings → Script tab.
 * @param page - The page object
 * @param folderName - The folder to target (must be visible in the sidebar)
 * @param phase - Which phase to write: 'pre-request' or 'post-response'
 * @param content - The script content to add
 */
export const addFolderScript = async (
  page: Page,
  folderName: string,
  phase: 'pre-request' | 'post-response',
  content: string
) => {
  await test.step(`Add ${phase} script on folder "${folderName}"`, async () => {
    const locators = buildLocators(page);
    await locators.sidebar.folder(folderName).first().dblclick();
    await locators.paneTabs.folderSettingsTab('script').click();
    await locators.paneTabs.tabTrigger(phase).click();
    await editCodeMirrorEditor(page, `folder-${phase}-script-editor`, content);
    const saveShortcut = process.platform === 'darwin' ? 'Meta+s' : 'Control+s';
    await page.keyboard.press(saveShortcut);
    await page.waitForTimeout(400);
  });
};

export const openFolderSettings = async (page: Page, collectionName: string, folderName = 'api') => {
  await test.step(`Open folder settings for "${folderName}" in collection "${collectionName}"`, async () => {
    const collectionRow = page.locator('#sidebar-collection-name').filter({ hasText: collectionName });
    await expect(collectionRow).toBeVisible();

    const folderRow = page
      .getByTestId('collections')
      .locator('.collection-item-name')
      .filter({ hasText: folderName });
    if (!(await folderRow.isVisible().catch(() => false))) {
      await collectionRow.click();
      await expect(folderRow).toBeVisible();
    }

    await folderRow.dblclick();
    await expect(page.locator('.request-tab .tab-label').filter({ hasText: folderName })).toBeVisible();
  });
};

/**
 * Saves the active folder settings tab and waits for the confirmation toast.
 * @param page - The Playwright page object
 * @returns void
 */
export const saveFolderSettings = async (page: Page) => {
  await test.step('Save folder settings', async () => {
    const saveShortcut = process.platform === 'darwin' ? 'Meta+s' : 'Control+s';
    await page.keyboard.press(saveShortcut);
    await expect(page.getByText('Folder Settings saved successfully').last()).toBeVisible({ timeout: 5000 });
  });
};

/**
 * Opens folder settings for a folder nested at any depth, expanding each level on the way down.
 * `openFolderSettings` only finds folders already visible in the sidebar; this walks a path such
 * as ['api', 'v2'] so a child folder can be reached without its parent being expanded first.
 * @param page - The Playwright page object
 * @param collectionName - The collection holding the folder
 * @param folderPath - Folder names from the collection root down to the target folder
 * @returns void
 */
export const openFolderSettingsByPath = async (page: Page, collectionName: string, folderPath: string[]) => {
  await test.step(`Open folder settings for "${folderPath.join('/')}" in "${collectionName}"`, async () => {
    const targetRow = await revealFolderRow(page, collectionName, folderPath);
    await targetRow.dblclick();

    const targetName = folderPath[folderPath.length - 1];
    await expect(page.locator('.request-tab .tab-label').filter({ hasText: targetName })).toBeVisible();
  });
};

/**
 * Opens one tab of the folder settings pane (headers, script, test, vars, auth, docs, settings).
 * @param page - The Playwright page object
 * @param tabName - The settings tab to activate
 * @returns void
 */
export const selectFolderSettingsTab = async (page: Page, tabName: string) => {
  await test.step(`Select folder settings tab "${tabName}"`, async () => {
    await page.getByTestId(`folder-settings-tab-${tabName}`).click();
  });
};
