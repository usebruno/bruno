import { expect, test, Locator, Page } from '../../playwright';
import {
  buildCommonLocators,
  closeAllOpenTabs,
  openCollection,
  openEnvironmentSelector,
  openRequest,
  selectEnvironment,
  selectTabContextMenuItem
} from '../utils/page';

const collectionName = 'tab-menu-collection';

// The tab menu's bulk close actions (Close Others / Left / Right / All) must offer the same
// "Unsaved changes" choice as the Close All shortcut instead of silently saving every draft.
test.describe('Tab menu - bulk close actions with unsaved changes', () => {
  const tab = (page: Page, name: string) => buildCommonLocators(page).tabs.tabByName(name);
  const draftIndicator = (page: Page, name: string) => buildCommonLocators(page).tabs.tabDraftIndicator(tab(page, name));
  const unsavedModal = (page: Page) => buildCommonLocators(page).unsavedChangesModal;

  const openRequests = async (page: Page, names: string[]) => {
    for (const name of names) {
      await openRequest(page, collectionName, name, { persist: true });
      await expect(tab(page, name)).toBeVisible({ timeout: 3000 });
    }
  };

  const selectAllShortcut = process.platform === 'darwin' ? 'Meta+a' : 'Control+a';

  // Collection settings, folder settings and the environment editor have no tab menu of their
  // own, but they sit in the same tab strip, so a request tab's Close Left / Right sweeps them up.
  const collectionTab = (page: Page) => buildCommonLocators(page).tabs.collectionSettingsTab();
  const folderTab = (page: Page) => tab(page, 'admin');
  const environmentTab = (page: Page) => buildCommonLocators(page).environment.collectionEnvTab();
  const settingsTabDraftIndicator = (page: Page, settingsTab: Locator) => buildCommonLocators(page).tabs.tabDraftIndicator(settingsTab);
  const environmentTabCloseGradient = (page: Page) => buildCommonLocators(page).tabs.tabCloseGradient(environmentTab(page));

  const fillFirstHeaderRow = async (page: Page, tableTestId: string, name: string) => {
    const table = buildCommonLocators(page).table(tableTestId);
    await table.rowNameEditor(table.row(0)).click();
    await page.keyboard.type(name);
    await table.rowValueEditor(table.row(0)).click();
    await page.keyboard.type('value');
  };

  const openCollectionSettingsWithDraft = async (page: Page) => {
    const { sidebar, paneTabs } = buildCommonLocators(page);
    await sidebar.collectionRow(collectionName).dblclick();
    await expect(collectionTab(page)).toBeVisible({ timeout: 3000 });
    await paneTabs.collectionSettingsTab('headers').click();
    await fillFirstHeaderRow(page, 'collection-headers', 'X-Collection-Header');
    await expect(settingsTabDraftIndicator(page, collectionTab(page))).toBeVisible();
  };

  const openFolderSettingsWithDraft = async (page: Page) => {
    await buildCommonLocators(page).sidebar.folder('admin').dblclick();
    await expect(folderTab(page)).toBeVisible({ timeout: 3000 });
    await fillFirstHeaderRow(page, 'folder-headers', 'X-Folder-Header');
    await expect(settingsTabDraftIndicator(page, folderTab(page))).toBeVisible();
  };

  const openEnvironmentWithDraft = async (page: Page, value: string) => {
    const { environment } = buildCommonLocators(page);
    await selectEnvironment(page, 'Local');
    await openEnvironmentSelector(page, 'collection');
    await environment.configureButton().click();
    await expect(environmentTab(page)).toBeVisible({ timeout: 3000 });
    await environment.variableValue('host').click();
    await page.keyboard.press(selectAllShortcut);
    await page.keyboard.type(value);
    await expect(environmentTabCloseGradient(page)).toHaveClass(/has-changes/);
  };

  const editUrl = async (page: Page, name: string) => {
    await tab(page, name).click();
    await buildCommonLocators(page).request.urlInput().click();
    await page.keyboard.type(`/${name}`);
    await expect(draftIndicator(page, name)).toBeVisible();
  };

  test.beforeEach(async ({ pageWithUserData: page }) => {
    await openCollection(page, collectionName);
  });

  // The fixture is a tmp copy, but the app instance is shared across tests in this file
  test.afterEach(async ({ pageWithUserData: page }) => {
    await closeAllOpenTabs(page, false);
  });

  test('Close Others lists only the drafts in range; Cancel keeps every tab', async ({ pageWithUserData: page }) => {
    await openRequests(page, ['req-1', 'req-2', 'req-3']);
    await editUrl(page, 'req-1');
    await editUrl(page, 'req-2');
    await editUrl(page, 'req-3');

    await selectTabContextMenuItem(page, 'req-2', 'close-others');

    const modal = unsavedModal(page).root();
    await expect(modal).toBeVisible({ timeout: 3000 });
    await expect(modal).toContainText('Request: req-1');
    await expect(modal).toContainText('Request: req-3');
    await expect(modal).not.toContainText('Request: req-2');

    await unsavedModal(page).button('Cancel').click();
    await expect(modal).not.toBeVisible();
    for (const name of ['req-1', 'req-2', 'req-3']) {
      await expect(tab(page, name)).toBeVisible();
      await expect(draftIndicator(page, name)).toBeVisible();
    }
  });

  test('Close Others with Don\'t Save discards and closes the tabs in range', async ({ pageWithUserData: page }) => {
    await openRequests(page, ['req-1', 'req-2', 'req-3']);
    await editUrl(page, 'req-1');
    await editUrl(page, 'req-2');

    await selectTabContextMenuItem(page, 'req-2', 'close-others');
    const modal = unsavedModal(page).root();
    await expect(modal).toBeVisible({ timeout: 3000 });
    await unsavedModal(page).button('Don\'t Save').click();

    await expect(tab(page, 'req-1')).not.toBeVisible({ timeout: 3000 });
    await expect(tab(page, 'req-3')).not.toBeVisible({ timeout: 3000 });
    await expect(tab(page, 'req-2')).toBeVisible();
    await expect(draftIndicator(page, 'req-2')).toBeVisible();

    // The discarded draft must not come back when the request is reopened
    await openRequest(page, collectionName, 'req-1', { persist: true });
    await expect(tab(page, 'req-1')).toBeVisible({ timeout: 3000 });
    await expect(draftIndicator(page, 'req-1')).not.toBeVisible();
  });

  test('Close to the Right with Save saves and closes the tabs in range', async ({ pageWithUserData: page }) => {
    await openRequests(page, ['req-1', 'req-2', 'req-3']);
    await editUrl(page, 'req-3');
    await editUrl(page, 'req-1');

    await selectTabContextMenuItem(page, 'req-1', 'close-right');
    const modal = unsavedModal(page).root();
    await expect(modal).toBeVisible({ timeout: 3000 });
    await expect(modal).toContainText('Request: req-3');
    await expect(modal).not.toContainText('Request: req-1');
    await unsavedModal(page).button('Save').click();

    await expect(tab(page, 'req-2')).not.toBeVisible({ timeout: 3000 });
    await expect(tab(page, 'req-3')).not.toBeVisible({ timeout: 3000 });
    await expect(tab(page, 'req-1')).toBeVisible();
    await expect(draftIndicator(page, 'req-1')).toBeVisible();

    await openRequest(page, collectionName, 'req-3', { persist: true });
    await expect(tab(page, 'req-3')).toBeVisible({ timeout: 3000 });
    await expect(draftIndicator(page, 'req-3')).not.toBeVisible();
    await expect(buildCommonLocators(page).request.urlInput()).toContainText('/req-3');
  });

  test('Inspect tab in the modal focuses that tab and keeps everything open', async ({ pageWithUserData: page }) => {
    await openRequests(page, ['req-1', 'req-2', 'req-3']);
    await editUrl(page, 'req-3');
    await tab(page, 'req-1').click();
    await expect(tab(page, 'req-1')).toHaveClass(/active/);

    await selectTabContextMenuItem(page, 'req-1', 'close-right');
    const modal = unsavedModal(page).root();
    await expect(modal).toBeVisible({ timeout: 3000 });

    await unsavedModal(page).item('Request: req-3').hover();
    await unsavedModal(page).inspectTabButton('Request: req-3').click();

    await expect(modal).not.toBeVisible();
    await expect(tab(page, 'req-3')).toHaveClass(/active/);
    for (const name of ['req-1', 'req-2', 'req-3']) {
      await expect(tab(page, name)).toBeVisible();
    }
    await expect(draftIndicator(page, 'req-3')).toBeVisible();
  });

  test('Close to the Left closes immediately when nothing in range is unsaved', async ({ pageWithUserData: page }) => {
    await openRequests(page, ['req-1', 'req-2', 'req-3']);
    await editUrl(page, 'req-3');

    await selectTabContextMenuItem(page, 'req-3', 'close-left');

    await expect(tab(page, 'req-1')).not.toBeVisible({ timeout: 3000 });
    await expect(tab(page, 'req-2')).not.toBeVisible({ timeout: 3000 });
    await expect(unsavedModal(page).root()).not.toBeVisible();
    await expect(tab(page, 'req-3')).toBeVisible();
    await expect(draftIndicator(page, 'req-3')).toBeVisible();
  });

  test('Close All from the tab menu asks before closing unsaved tabs', async ({ pageWithUserData: page }) => {
    await openRequests(page, ['req-1', 'req-2']);
    await editUrl(page, 'req-2');

    await selectTabContextMenuItem(page, 'req-1', 'close-all');
    const modal = unsavedModal(page).root();
    await expect(modal).toBeVisible({ timeout: 3000 });
    await expect(modal).toContainText('Request: req-2');
    await expect(modal).not.toContainText('Request: req-1');

    await unsavedModal(page).button('Don\'t Save').click();
    await expect(tab(page, 'req-1')).not.toBeVisible({ timeout: 3000 });
    await expect(tab(page, 'req-2')).not.toBeVisible({ timeout: 3000 });
  });

  test('Close to the Left prompts for collection, folder and environment drafts; Don\'t Save discards them', async ({ pageWithUserData: page }) => {
    await openCollectionSettingsWithDraft(page);
    await openFolderSettingsWithDraft(page);
    await openEnvironmentWithDraft(page, 'http://draft-left');
    await openRequests(page, ['req-1', 'req-2']);
    await editUrl(page, 'req-2');

    await selectTabContextMenuItem(page, 'req-1', 'close-left');

    const modal = unsavedModal(page).root();
    await expect(modal).toBeVisible({ timeout: 3000 });
    await expect(modal).toContainText(`Collection: ${collectionName}`);
    await expect(modal).toContainText('Folder: admin');
    await expect(modal).toContainText('Collection Environment: Local');
    await expect(modal).not.toContainText('Request:');

    await unsavedModal(page).button('Cancel').click();
    await expect(modal).not.toBeVisible();
    await expect(settingsTabDraftIndicator(page, collectionTab(page))).toBeVisible();
    await expect(settingsTabDraftIndicator(page, folderTab(page))).toBeVisible();
    await expect(environmentTabCloseGradient(page)).toHaveClass(/has-changes/);

    await selectTabContextMenuItem(page, 'req-1', 'close-left');
    await expect(modal).toBeVisible({ timeout: 3000 });
    await unsavedModal(page).button('Don\'t Save').click();

    await expect(collectionTab(page)).not.toBeVisible({ timeout: 3000 });
    await expect(folderTab(page)).not.toBeVisible({ timeout: 3000 });
    await expect(environmentTab(page)).not.toBeVisible({ timeout: 3000 });
    await expect(tab(page, 'req-1')).toBeVisible();
    await expect(tab(page, 'req-2')).toBeVisible();
    await expect(draftIndicator(page, 'req-2')).toBeVisible();

    // Discarded drafts must be gone when the settings are reopened
    await buildCommonLocators(page).sidebar.collectionRow(collectionName).dblclick();
    await expect(collectionTab(page)).toBeVisible({ timeout: 3000 });
    await expect(settingsTabDraftIndicator(page, collectionTab(page))).not.toBeVisible();
    await buildCommonLocators(page).sidebar.folder('admin').dblclick();
    await expect(folderTab(page)).toBeVisible({ timeout: 3000 });
    await expect(settingsTabDraftIndicator(page, folderTab(page))).not.toBeVisible();
  });

  test('Close to the Right prompts for collection, folder and environment drafts; Save All saves them', async ({ pageWithUserData: page }) => {
    const { environment } = buildCommonLocators(page);
    await openRequests(page, ['req-1']);
    await editUrl(page, 'req-1');
    await openCollectionSettingsWithDraft(page);
    await openFolderSettingsWithDraft(page);
    await openEnvironmentWithDraft(page, 'http://saved-right');

    await selectTabContextMenuItem(page, 'req-1', 'close-right');

    const modal = unsavedModal(page).root();
    await expect(modal).toBeVisible({ timeout: 3000 });
    await expect(modal).toContainText(`Collection: ${collectionName}`);
    await expect(modal).toContainText('Folder: admin');
    await expect(modal).toContainText('Collection Environment: Local');
    await expect(modal).not.toContainText('Request: req-1');

    await unsavedModal(page).button('Save All').click();

    await expect(collectionTab(page)).not.toBeVisible({ timeout: 3000 });
    await expect(folderTab(page)).not.toBeVisible({ timeout: 3000 });
    await expect(environmentTab(page)).not.toBeVisible({ timeout: 3000 });
    await expect(tab(page, 'req-1')).toBeVisible();
    await expect(draftIndicator(page, 'req-1')).toBeVisible();

    // The saved environment value is on disk, so reopening the editor shows it without a draft
    await openEnvironmentSelector(page, 'collection');
    await environment.configureButton().click();
    await expect(environmentTab(page)).toBeVisible({ timeout: 3000 });
    await expect(environment.variableValue('host')).toContainText('http://saved-right');
    await expect(environmentTabCloseGradient(page)).not.toHaveClass(/has-changes/);
  });
});
