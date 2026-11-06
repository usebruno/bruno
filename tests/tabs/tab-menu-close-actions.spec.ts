import { expect, test } from '../../playwright';
import {
  buildCommonLocators,
  closeAllCollections,
  openCollection,
  openCollectionFromPath,
  openEnvironmentSelector,
  openRequest,
  selectTabContextMenuItem,
  waitForCollectionMount
} from '../utils/page';
import {
  collectionName,
  collectionTab,
  draftIndicator,
  editUrl,
  environmentTab,
  environmentTabCloseGradient,
  expectCollectionFilesUnchanged,
  expectCollectionFileToContain,
  folderTab,
  openCollectionSettingsWithDraft,
  openEnvironmentWithDraft,
  openFolderSettingsWithDraft,
  openRequests,
  settingsTabDraftIndicator,
  tab,
  unsavedModal
} from './helpers';

// The tab menu's bulk close actions (Close Others / Left / Right / All) must offer the same
// "Unsaved changes" choice as the Close All shortcut instead of silently saving every draft.
test.describe('Tab menu - bulk close actions with unsaved changes', () => {
  let collectionDir: string;

  // Each test gets its own copy of the fixture, so tests that press Save don't leak into the next one.
  test.beforeEach(async ({ page, electronApp, collectionFixturePath }) => {
    collectionDir = collectionFixturePath!;
    await openCollectionFromPath(page, electronApp, collectionDir);
    await waitForCollectionMount(page, collectionName);
    await openCollection(page, collectionName);
  });

  test.afterEach(async ({ page }) => {
    await closeAllCollections(page);
  });

  test('Close Others lists only the drafts in range; Cancel keeps every tab', async ({ page }) => {
    await openRequests(page, ['req-1', 'req-2', 'req-3']);
    await editUrl(page, 'req-1');
    await editUrl(page, 'req-2');
    await editUrl(page, 'req-3');

    await selectTabContextMenuItem(page, 'req-2', 'close-others');

    const modal = unsavedModal(page).root();
    await test.step('Modal lists req-1 and req-3 but not the kept tab req-2', async () => {
      await expect(modal).toBeVisible({ timeout: 3000 });
      await expect(modal).toContainText('Request: req-1');
      await expect(modal).toContainText('Request: req-3');
      await expect(modal).not.toContainText('Request: req-2');
    });

    await test.step('Cancel keeps every tab and draft, nothing written to disk', async () => {
      await unsavedModal(page).button('Cancel').click();
      await expect(modal).not.toBeVisible();
      for (const name of ['req-1', 'req-2', 'req-3']) {
        await expect(tab(page, name)).toBeVisible();
        await expect(draftIndicator(page, name)).toBeVisible();
      }
      expectCollectionFilesUnchanged(collectionDir);
    });
  });

  test('Close Others with Don\'t Save discards and closes the tabs in range', async ({ page }) => {
    await openRequests(page, ['req-1', 'req-2', 'req-3']);
    await editUrl(page, 'req-1');
    await editUrl(page, 'req-2');

    await selectTabContextMenuItem(page, 'req-2', 'close-others');
    const modal = unsavedModal(page).root();
    await expect(modal).toBeVisible({ timeout: 3000 });
    await unsavedModal(page).button('Don\'t Save').click();

    await test.step('Only req-2 stays open, keeping its draft', async () => {
      await expect(tab(page, 'req-1')).not.toBeVisible({ timeout: 3000 });
      await expect(tab(page, 'req-3')).not.toBeVisible({ timeout: 3000 });
      await expect(tab(page, 'req-2')).toBeVisible();
      await expect(draftIndicator(page, 'req-2')).toBeVisible();
    });

    await test.step('Reopened req-1 has no draft and the fixture is untouched', async () => {
      await openRequest(page, collectionName, 'req-1', { persist: true });
      await expect(tab(page, 'req-1')).toBeVisible({ timeout: 3000 });
      await expect(draftIndicator(page, 'req-1')).not.toBeVisible();
      expectCollectionFilesUnchanged(collectionDir);
    });
  });

  test('Close to the Right with Save saves and closes the tabs in range', async ({ page }) => {
    await openRequests(page, ['req-1', 'req-2', 'req-3']);
    await editUrl(page, 'req-3');
    await editUrl(page, 'req-1');

    await selectTabContextMenuItem(page, 'req-1', 'close-right');
    const modal = unsavedModal(page).root();
    await test.step('Modal lists req-3 but not the clicked tab req-1', async () => {
      await expect(modal).toBeVisible({ timeout: 3000 });
      await expect(modal).toContainText('Request: req-3');
      await expect(modal).not.toContainText('Request: req-1');
    });
    await unsavedModal(page).button('Save').click();

    await test.step('Only req-1 stays open, keeping its draft', async () => {
      await expect(tab(page, 'req-2')).not.toBeVisible({ timeout: 3000 });
      await expect(tab(page, 'req-3')).not.toBeVisible({ timeout: 3000 });
      await expect(tab(page, 'req-1')).toBeVisible();
      await expect(draftIndicator(page, 'req-1')).toBeVisible();
    });

    await test.step('Reopened req-3 shows the saved URL without a draft', async () => {
      await openRequest(page, collectionName, 'req-3', { persist: true });
      await expect(tab(page, 'req-3')).toBeVisible({ timeout: 3000 });
      await expect(draftIndicator(page, 'req-3')).not.toBeVisible();
      await expect(buildCommonLocators(page).request.urlInput()).toContainText('/req-3');
    });
  });

  test('Inspect tab in the modal focuses that tab and keeps everything open', async ({ page }) => {
    await openRequests(page, ['req-1', 'req-2', 'req-3']);
    await editUrl(page, 'req-3');
    await tab(page, 'req-1').click();
    await expect(tab(page, 'req-1')).toHaveClass(/active/);

    await selectTabContextMenuItem(page, 'req-1', 'close-right');
    const modal = unsavedModal(page).root();
    await expect(modal).toBeVisible({ timeout: 3000 });

    await test.step('Inspect req-3 from the modal', async () => {
      await unsavedModal(page).item('Request: req-3').hover();
      await unsavedModal(page).inspectTabButton('Request: req-3').click();
    });

    await test.step('Modal closes, req-3 is active and every tab is still open', async () => {
      await expect(modal).not.toBeVisible();
      await expect(tab(page, 'req-3')).toHaveClass(/active/);
      for (const name of ['req-1', 'req-2', 'req-3']) {
        await expect(tab(page, name)).toBeVisible();
      }
      await expect(draftIndicator(page, 'req-3')).toBeVisible();
    });
  });

  test('Close to the Left closes immediately when nothing in range is unsaved', async ({ page }) => {
    await openRequests(page, ['req-1', 'req-2', 'req-3']);
    await editUrl(page, 'req-3');

    await selectTabContextMenuItem(page, 'req-3', 'close-left');

    await test.step('req-1 and req-2 close without a prompt; req-3 keeps its draft', async () => {
      await expect(tab(page, 'req-1')).not.toBeVisible({ timeout: 3000 });
      await expect(tab(page, 'req-2')).not.toBeVisible({ timeout: 3000 });
      await expect(unsavedModal(page).root()).not.toBeVisible();
      await expect(tab(page, 'req-3')).toBeVisible();
      await expect(draftIndicator(page, 'req-3')).toBeVisible();
    });
  });

  test('Close All from the tab menu asks before closing unsaved tabs', async ({ page }) => {
    await openRequests(page, ['req-1', 'req-2']);
    await editUrl(page, 'req-2');

    await selectTabContextMenuItem(page, 'req-1', 'close-all');
    const modal = unsavedModal(page).root();
    await test.step('Modal lists only the unsaved req-2', async () => {
      await expect(modal).toBeVisible({ timeout: 3000 });
      await expect(modal).toContainText('Request: req-2');
      await expect(modal).not.toContainText('Request: req-1');
    });

    await test.step('Don\'t Save closes both tabs, nothing written to disk', async () => {
      await unsavedModal(page).button('Don\'t Save').click();
      await expect(tab(page, 'req-1')).not.toBeVisible({ timeout: 3000 });
      await expect(tab(page, 'req-2')).not.toBeVisible({ timeout: 3000 });
      expectCollectionFilesUnchanged(collectionDir);
    });
  });

  test('Close to the Left prompts for collection, folder and environment drafts; Don\'t Save discards them', async ({ page }) => {
    await openCollectionSettingsWithDraft(page);
    await openFolderSettingsWithDraft(page);
    await openEnvironmentWithDraft(page, 'http://draft-left');
    await openRequests(page, ['req-1', 'req-2']);
    await editUrl(page, 'req-2');

    await selectTabContextMenuItem(page, 'req-1', 'close-left');

    const modal = unsavedModal(page).root();
    await test.step('Modal lists the collection, folder and environment drafts only', async () => {
      await expect(modal).toBeVisible({ timeout: 3000 });
      await expect(modal).toContainText(`Collection: ${collectionName}`);
      await expect(modal).toContainText('Folder: admin');
      await expect(modal).toContainText('Collection Environment: Local');
      await expect(modal).not.toContainText('Request:');
    });

    await test.step('Cancel keeps every settings draft', async () => {
      await unsavedModal(page).button('Cancel').click();
      await expect(modal).not.toBeVisible();
      await expect(settingsTabDraftIndicator(page, collectionTab(page))).toBeVisible();
      await expect(settingsTabDraftIndicator(page, folderTab(page))).toBeVisible();
      await expect(environmentTabCloseGradient(page)).toHaveClass(/has-changes/);
    });

    await test.step('Don\'t Save closes the settings tabs and keeps the request tabs', async () => {
      await selectTabContextMenuItem(page, 'req-1', 'close-left');
      await expect(modal).toBeVisible({ timeout: 3000 });
      await unsavedModal(page).button('Don\'t Save').click();

      await expect(collectionTab(page)).not.toBeVisible({ timeout: 3000 });
      await expect(folderTab(page)).not.toBeVisible({ timeout: 3000 });
      await expect(environmentTab(page)).not.toBeVisible({ timeout: 3000 });
      await expect(tab(page, 'req-1')).toBeVisible();
      await expect(tab(page, 'req-2')).toBeVisible();
      await expect(draftIndicator(page, 'req-2')).toBeVisible();
    });

    await test.step('Reopened settings have no draft and the fixture is untouched', async () => {
      await buildCommonLocators(page).sidebar.collectionRow(collectionName).dblclick();
      await expect(collectionTab(page)).toBeVisible({ timeout: 3000 });
      await expect(settingsTabDraftIndicator(page, collectionTab(page))).not.toBeVisible();
      await buildCommonLocators(page).sidebar.folder('admin').dblclick();
      await expect(folderTab(page)).toBeVisible({ timeout: 3000 });
      await expect(settingsTabDraftIndicator(page, folderTab(page))).not.toBeVisible();
      expectCollectionFilesUnchanged(collectionDir);
    });
  });

  test('Close to the Right prompts for collection, folder and environment drafts; Save All saves them', async ({ page }) => {
    const { environment } = buildCommonLocators(page);
    await openRequests(page, ['req-1']);
    await editUrl(page, 'req-1');
    await openCollectionSettingsWithDraft(page);
    await openFolderSettingsWithDraft(page);
    await openEnvironmentWithDraft(page, 'http://saved-right');

    await selectTabContextMenuItem(page, 'req-1', 'close-right');

    const modal = unsavedModal(page).root();
    await test.step('Modal lists the collection, folder and environment drafts only', async () => {
      await expect(modal).toBeVisible({ timeout: 3000 });
      await expect(modal).toContainText(`Collection: ${collectionName}`);
      await expect(modal).toContainText('Folder: admin');
      await expect(modal).toContainText('Collection Environment: Local');
      await expect(modal).not.toContainText('Request: req-1');
    });

    await unsavedModal(page).button('Save All').click();

    await test.step('Settings tabs close and req-1 keeps its draft', async () => {
      await expect(collectionTab(page)).not.toBeVisible({ timeout: 3000 });
      await expect(folderTab(page)).not.toBeVisible({ timeout: 3000 });
      await expect(environmentTab(page)).not.toBeVisible({ timeout: 3000 });
      await expect(tab(page, 'req-1')).toBeVisible();
      await expect(draftIndicator(page, 'req-1')).toBeVisible();
    });

    await test.step('Collection, folder and environment drafts are written to disk', async () => {
      await expectCollectionFileToContain(collectionDir, 'opencollection.yml', '// draft');
      await expectCollectionFileToContain(collectionDir, 'admin/folder.yml', '// draft');
      await expectCollectionFileToContain(collectionDir, 'environments/Local.yml', 'http://saved-right');
    });

    await test.step('Reopened environment editor shows the saved value without a draft', async () => {
      await openEnvironmentSelector(page, 'collection');
      await environment.configureButton().click();
      await expect(environmentTab(page)).toBeVisible({ timeout: 3000 });
      await expect(environment.variableValue('host')).toContainText('http://saved-right');
      await expect(environmentTabCloseGradient(page)).not.toHaveClass(/has-changes/);
    });
  });
});
