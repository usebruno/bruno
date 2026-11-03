import { expect, test, Page } from '../../playwright';
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
  const tab = (page: Page, name: string) => page.locator('.request-tab').filter({ has: page.getByText(name, { exact: true }) });
  const unsavedModal = (page: Page) => page.locator('.bruno-modal-card').filter({ has: page.getByText('Unsaved changes', { exact: true }) });

  const openRequests = async (page: Page, names: string[]) => {
    for (const name of names) {
      await openRequest(page, collectionName, name, { persist: true });
      await expect(tab(page, name)).toBeVisible({ timeout: 3000 });
    }
  };

  const selectAllShortcut = process.platform === 'darwin' ? 'Meta+a' : 'Control+a';

  // Collection settings, folder settings and the environment editor have no tab menu of their
  // own, but they sit in the same tab strip, so a request tab's Close Left / Right sweeps them up.
  const collectionTab = (page: Page) => page.locator('.request-tab').filter({ has: page.getByText('Collection', { exact: true }) });
  const folderTab = (page: Page) => tab(page, 'admin');
  const environmentTab = (page: Page) => buildCommonLocators(page).environment.collectionEnvTab();

  const fillFirstHeaderRow = async (page: Page, name: string) => {
    const headerRow = page.locator('table').first().locator('tbody tr').first();
    await headerRow.locator('.CodeMirror').first().click();
    await page.keyboard.type(name);
    await headerRow.locator('.CodeMirror').nth(1).click();
    await page.keyboard.type('value');
  };

  const openCollectionSettingsWithDraft = async (page: Page) => {
    await page.getByTestId('sidebar-collection-row').filter({ has: page.getByText(collectionName, { exact: true }) }).dblclick();
    await expect(collectionTab(page)).toBeVisible({ timeout: 3000 });
    await page.locator('.tab.headers').click();
    await fillFirstHeaderRow(page, 'X-Collection-Header');
    await expect(collectionTab(page).locator('.has-changes-icon')).toBeVisible();
  };

  const openFolderSettingsWithDraft = async (page: Page) => {
    await page.locator('.collection-item-name').filter({ has: page.getByText('admin', { exact: true }) }).dblclick();
    await expect(folderTab(page)).toBeVisible({ timeout: 3000 });
    await fillFirstHeaderRow(page, 'X-Folder-Header');
    await expect(folderTab(page).locator('.has-changes-icon')).toBeVisible();
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
    await expect(environmentTab(page).locator('.close-gradient')).toHaveClass(/has-changes/);
  };

  const editUrl = async (page: Page, name: string) => {
    await tab(page, name).click();
    await page.locator('#request-url .CodeMirror').click();
    await page.keyboard.type(`/${name}`);
    await expect(tab(page, name).locator('.has-changes-icon')).toBeVisible();
  };

  test.beforeEach(async ({ pageWithUserData: page }) => {
    await page.locator('[data-app-state="loaded"]').waitFor();
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

    const modal = unsavedModal(page);
    await expect(modal).toBeVisible({ timeout: 3000 });
    await expect(modal).toContainText('Request: req-1');
    await expect(modal).toContainText('Request: req-3');
    await expect(modal).not.toContainText('Request: req-2');
    await expect(modal.getByRole('button', { name: 'Save All' })).toBeVisible();
    await expect(modal.getByRole('button', { name: 'Don\'t Save' })).toBeVisible();

    await modal.getByRole('button', { name: 'Cancel' }).click();
    await expect(modal).not.toBeVisible();
    for (const name of ['req-1', 'req-2', 'req-3']) {
      await expect(tab(page, name)).toBeVisible();
      await expect(tab(page, name).locator('.has-changes-icon')).toBeVisible();
    }
  });

  test('Close Others with Don\'t Save discards and closes the tabs in range', async ({ pageWithUserData: page }) => {
    await openRequests(page, ['req-1', 'req-2', 'req-3']);
    await editUrl(page, 'req-1');
    await editUrl(page, 'req-2');

    await selectTabContextMenuItem(page, 'req-2', 'close-others');
    const modal = unsavedModal(page);
    await expect(modal).toBeVisible({ timeout: 3000 });
    await modal.getByRole('button', { name: 'Don\'t Save' }).click();

    await expect(tab(page, 'req-1')).not.toBeVisible({ timeout: 3000 });
    await expect(tab(page, 'req-3')).not.toBeVisible({ timeout: 3000 });
    await expect(tab(page, 'req-2')).toBeVisible();
    await expect(tab(page, 'req-2').locator('.has-changes-icon')).toBeVisible();

    // The discarded draft must not come back when the request is reopened
    await openRequest(page, collectionName, 'req-1', { persist: true });
    await expect(tab(page, 'req-1')).toBeVisible({ timeout: 3000 });
    await expect(tab(page, 'req-1').locator('.has-changes-icon')).not.toBeVisible();
  });

  test('Close to the Right with Save saves and closes the tabs in range', async ({ pageWithUserData: page }) => {
    await openRequests(page, ['req-1', 'req-2', 'req-3']);
    await editUrl(page, 'req-3');
    await editUrl(page, 'req-1');

    await selectTabContextMenuItem(page, 'req-1', 'close-right');
    const modal = unsavedModal(page);
    await expect(modal).toBeVisible({ timeout: 3000 });
    await expect(modal).toContainText('Request: req-3');
    await expect(modal).not.toContainText('Request: req-1');
    await modal.getByRole('button', { name: 'Save', exact: true }).click();

    await expect(tab(page, 'req-2')).not.toBeVisible({ timeout: 3000 });
    await expect(tab(page, 'req-3')).not.toBeVisible({ timeout: 3000 });
    await expect(tab(page, 'req-1')).toBeVisible();
    await expect(tab(page, 'req-1').locator('.has-changes-icon')).toBeVisible();

    await openRequest(page, collectionName, 'req-3', { persist: true });
    await expect(tab(page, 'req-3')).toBeVisible({ timeout: 3000 });
    await expect(tab(page, 'req-3').locator('.has-changes-icon')).not.toBeVisible();
    await expect(page.locator('#request-url .CodeMirror')).toContainText('/req-3');
  });

  test('Inspect tab in the modal focuses that tab and keeps everything open', async ({ pageWithUserData: page }) => {
    await openRequests(page, ['req-1', 'req-2', 'req-3']);
    await editUrl(page, 'req-3');
    await tab(page, 'req-1').click();
    await expect(tab(page, 'req-1')).toHaveClass(/active/);

    await selectTabContextMenuItem(page, 'req-1', 'close-right');
    const modal = unsavedModal(page);
    await expect(modal).toBeVisible({ timeout: 3000 });

    const row = modal.getByRole('listitem').filter({ hasText: 'Request: req-3' });
    await row.hover();
    await row.getByRole('button', { name: 'Inspect tab' }).click();

    await expect(modal).not.toBeVisible();
    await expect(tab(page, 'req-3')).toHaveClass(/active/);
    for (const name of ['req-1', 'req-2', 'req-3']) {
      await expect(tab(page, name)).toBeVisible();
    }
    await expect(tab(page, 'req-3').locator('.has-changes-icon')).toBeVisible();
  });

  test('Close to the Left closes immediately when nothing in range is unsaved', async ({ pageWithUserData: page }) => {
    await openRequests(page, ['req-1', 'req-2', 'req-3']);
    await editUrl(page, 'req-3');

    await selectTabContextMenuItem(page, 'req-3', 'close-left');

    await expect(tab(page, 'req-1')).not.toBeVisible({ timeout: 3000 });
    await expect(tab(page, 'req-2')).not.toBeVisible({ timeout: 3000 });
    await expect(unsavedModal(page)).not.toBeVisible();
    await expect(tab(page, 'req-3')).toBeVisible();
    await expect(tab(page, 'req-3').locator('.has-changes-icon')).toBeVisible();
  });

  test('Close All from the tab menu asks before closing unsaved tabs', async ({ pageWithUserData: page }) => {
    await openRequests(page, ['req-1', 'req-2']);
    await editUrl(page, 'req-2');

    await selectTabContextMenuItem(page, 'req-1', 'close-all');
    const modal = unsavedModal(page);
    await expect(modal).toBeVisible({ timeout: 3000 });
    await expect(modal).toContainText('Request: req-2');
    await expect(modal).not.toContainText('Request: req-1');

    await modal.getByRole('button', { name: 'Don\'t Save' }).click();
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

    const modal = unsavedModal(page);
    await expect(modal).toBeVisible({ timeout: 3000 });
    await expect(modal).toContainText(`Collection: ${collectionName}`);
    await expect(modal).toContainText('Folder: admin');
    await expect(modal).toContainText('Collection Environment: Local');
    await expect(modal).not.toContainText('Request:');

    await modal.getByRole('button', { name: 'Cancel' }).click();
    await expect(modal).not.toBeVisible();
    await expect(collectionTab(page).locator('.has-changes-icon')).toBeVisible();
    await expect(folderTab(page).locator('.has-changes-icon')).toBeVisible();
    await expect(environmentTab(page).locator('.close-gradient')).toHaveClass(/has-changes/);

    await selectTabContextMenuItem(page, 'req-1', 'close-left');
    await expect(modal).toBeVisible({ timeout: 3000 });
    await modal.getByRole('button', { name: 'Don\'t Save' }).click();

    await expect(collectionTab(page)).not.toBeVisible({ timeout: 3000 });
    await expect(folderTab(page)).not.toBeVisible({ timeout: 3000 });
    await expect(environmentTab(page)).not.toBeVisible({ timeout: 3000 });
    await expect(tab(page, 'req-1')).toBeVisible();
    await expect(tab(page, 'req-2')).toBeVisible();
    await expect(tab(page, 'req-2').locator('.has-changes-icon')).toBeVisible();

    // Discarded drafts must be gone when the settings are reopened
    await page.getByTestId('sidebar-collection-row').filter({ has: page.getByText(collectionName, { exact: true }) }).dblclick();
    await expect(collectionTab(page)).toBeVisible({ timeout: 3000 });
    await expect(collectionTab(page).locator('.has-changes-icon')).not.toBeVisible();
    await page.locator('.collection-item-name').filter({ has: page.getByText('admin', { exact: true }) }).dblclick();
    await expect(folderTab(page)).toBeVisible({ timeout: 3000 });
    await expect(folderTab(page).locator('.has-changes-icon')).not.toBeVisible();
  });

  test('Close to the Right prompts for collection, folder and environment drafts; Save All saves them', async ({ pageWithUserData: page }) => {
    const { environment } = buildCommonLocators(page);
    await openRequests(page, ['req-1']);
    await editUrl(page, 'req-1');
    await openCollectionSettingsWithDraft(page);
    await openFolderSettingsWithDraft(page);
    await openEnvironmentWithDraft(page, 'http://saved-right');

    await selectTabContextMenuItem(page, 'req-1', 'close-right');

    const modal = unsavedModal(page);
    await expect(modal).toBeVisible({ timeout: 3000 });
    await expect(modal).toContainText(`Collection: ${collectionName}`);
    await expect(modal).toContainText('Folder: admin');
    await expect(modal).toContainText('Collection Environment: Local');
    await expect(modal).not.toContainText('Request: req-1');

    await modal.getByRole('button', { name: 'Save All' }).click();

    await expect(collectionTab(page)).not.toBeVisible({ timeout: 3000 });
    await expect(folderTab(page)).not.toBeVisible({ timeout: 3000 });
    await expect(environmentTab(page)).not.toBeVisible({ timeout: 3000 });
    await expect(tab(page, 'req-1')).toBeVisible();
    await expect(tab(page, 'req-1').locator('.has-changes-icon')).toBeVisible();

    // The saved environment value is on disk, so reopening the editor shows it without a draft
    await openEnvironmentSelector(page, 'collection');
    await environment.configureButton().click();
    await expect(environmentTab(page)).toBeVisible({ timeout: 3000 });
    await expect(environment.variableValue('host')).toContainText('http://saved-right');
    await expect(environmentTab(page).locator('.close-gradient')).not.toHaveClass(/has-changes/);
  });
});
